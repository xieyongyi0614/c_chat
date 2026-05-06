import { ActionCtx, addActionHandler, omitActionCtx } from '../../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import {
  GetMessageHistoryRequest,
  ReadMessageRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import { conversationTableClass, messageTableClass, uploadTaskTableClass } from '../../../db';
import { to, transformPagination, uuidv4 } from '@c_chat/shared-utils';
import {
  LocalMessageListItem,
  MessageStatusEnum,
  MessageTypeEnum,
  RequiredNonNullable,
  SendMessageParams,
  UploadStatusEnum,
  FileInfoListItem,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { now } from 'lodash';
import { calcSamplingHash } from '@c_chat/electron_client/utils/calcFileHash';
import { DEFAULT_MESSAGE_PAGE_SIZE } from '@c_chat/shared-config';
import { ApiClient } from '@c_chat/electron_client/utils/axios/service/apiService';
import { sendSocketMessageWithFile } from '@c_chat/electron_client/utils/uploadTaskRunner';
import { uploadScheduler } from '@c_chat/electron_client/utils/UploadScheduler';

/** 获取本地消息历史 */
addActionHandler('GetLocalMessageHistory', async (data) => {
  const { pageSize = DEFAULT_MESSAGE_PAGE_SIZE, conversationId, beforeMsgId } = data;

  const localMsgs = messageTableClass.getMessagesByConversationId(
    conversationId,
    pageSize,
    beforeMsgId,
  );

  return localMsgs ?? [];
});

/** 获取消息历史 (本地缓存优先) */
addActionHandler('GetMessageHistory', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  // const newPageParams = transformPageParams(params.pagination);

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getMessageHistory,
      GetMessageHistoryRequest.encode(GetMessageHistoryRequest.create(params)).finish(),
    ),
  );

  if (err) {
    return {
      list: [],
      pagination: transformPagination(params.pagination),
    };
  }
  // 更新本地缓存
  const records =
    res.list?.map((msg) => ({
      ...(msg as RequiredNonNullable<typeof msg>),
      state: 0,
      status: MessageStatusEnum.success,
      updateTime: Number(msg.updateTime),
      localTime: Number(msg.createTime),
      createTime: Number(msg.createTime),
    })) ?? [];
  if (records.length > 0) {
    messageTableClass.upsertMessages(records);
  }
  return {
    list: records,
    pagination: transformPagination(params.pagination),
  };
});
const generateLocalMessageData = (data: Partial<LocalMessageListItem>): LocalMessageListItem => {
  return {
    id: uuidv4(),
    conversationId: data.conversationId ?? '',
    msgId: data.msgId ?? null,
    clientMsgId: uuidv4(),
    senderId: data.senderId ?? '',
    content: data.content ?? '',
    type: data.type ?? MessageTypeEnum.Text,
    status: MessageStatusEnum.sending,
    createTime: now(),
    localTime: now(),
    updateTime: now(),
    fileId: data.fileId || '',
    ...data,
  };
};

/** 发送消息 (存入本地并更新会话) */
addActionHandler('SendMessage', async (params) => {
  const socketService = socketManager.getSocketService(params.windowId);

  const senderInfo = socketService.getUserInfo();

  if (params.files && params.files?.length > 0) {
    const res = await handleSendFiles(params, senderInfo?.id ?? '');
    return res;
  }

  const localMessageData = generateLocalMessageData({
    ...params,
    senderId: senderInfo?.id ?? '',
    status: MessageStatusEnum.sending,
  });
  messageTableClass.insert(localMessageData);

  // 2. 发送到线上
  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.sendMessage,
      SendMessageRequest.encode(
        SendMessageRequest.create({ ...params, clientMsgId: localMessageData.clientMsgId }),
      ).finish(),
    ),
  );
  if (err || res.status !== 'ok') {
    messageTableClass.updateMessageStatus(localMessageData.id, MessageStatusEnum.fail);
    console.log('发送消息失败', err);
    throw err || new Error('发送消息失败');
  }

  return [localMessageData];
});

const handleSendFiles = async (params: SendMessageParams & ActionCtx, senderId: string) => {
  const { files = [] } = params;

  const { imageFiles, otherFiles } = files.reduce<{
    imageFiles: FileInfoListItem[];
    otherFiles: FileInfoListItem[];
  }>(
    (acc, cur) => {
      if (cur.fileType === 'image') {
        acc.imageFiles.push(cur);
      } else {
        acc.otherFiles.push(cur);
      }
      return acc;
    },
    { imageFiles: [], otherFiles: [] },
  );

  const res: (LocalMessageListItem | null)[] = [];

  // 处理图片：使用相同的mediaGroupId
  if (imageFiles.length > 0) {
    const imageGroupId = uuidv4();
    const imageResults = await Promise.all(
      imageFiles.map(async (file) => {
        return processSingleFile(
          { ...params, type: MessageTypeEnum.Image },
          senderId,
          file,
          imageGroupId,
        );
      }),
    );
    res.push(...imageResults);
  }

  // 处理其他文件：各自单独发送，不使用mediaGroupId
  if (otherFiles.length > 0) {
    const fileResults = await Promise.all(
      otherFiles.map(async (file) =>
        processSingleFile({ ...params, type: MessageTypeEnum.File }, senderId, file),
      ),
    );
    res.push(...fileResults);
  }

  return res.filter((item) => item !== null);
};

const processSingleFile = async (
  params: SendMessageParams & ActionCtx & { type: MessageTypeEnum },
  senderId: string,
  file: FileInfoListItem,
  mediaGroupId?: string,
): Promise<LocalMessageListItem | null> => {
  const { filePath, fileName, fileSize, mimeType } = file;
  const taskId = uuidv4();

  const fileHash = calcSamplingHash(filePath);

  const uploadInit = await ApiClient.upload.uploadInit({ fileName, fileHash, fileSize });
  if (!uploadInit) {
    throw new Error('上传失败');
  }

  const localMessageData = generateLocalMessageData({
    ...params,
    senderId,
    status: MessageStatusEnum.sending,
    ...(mediaGroupId && { mediaGroupId }),
  });

  console.log('uploadInit', uploadInit);
  /** 秒传 */
  if (uploadInit?.file?.id) {
    localMessageData.fileId = uploadInit.file.id;
    messageTableClass.insert(localMessageData);
    const [sendErr] = await to(
      sendSocketMessageWithFile(params.windowId, {
        conversationId: localMessageData.conversationId,
        clientMsgId: localMessageData.clientMsgId,
        fileId: uploadInit.file.id,
        type: localMessageData.type,
        mediaGroupId: localMessageData.mediaGroupId || undefined,
        content: localMessageData.content,
      }),
    );
    if (sendErr) {
      messageTableClass.updateMessageStateByClientId(
        localMessageData.clientMsgId,
        MessageStatusEnum.fail,
      );
      console.error('秒传后发送消息失败:', sendErr);
      localMessageData.status = MessageStatusEnum.fail;
    }
    return localMessageData;
  }

  if (!uploadInit?.uploadSession?.id) {
    return null;
  }

  uploadTaskTableClass.insert({
    id: taskId,
    clientMsgId: localMessageData.clientMsgId,
    filePath,
    fileName,
    fileSize,
    mimeType,
    fileHash,
    status: UploadStatusEnum.waiting,
    progress: 0,
    uploadedBytes: 0,
    isRunning: 0,
    uploadSessionId: uploadInit.uploadSession.id,
    windowId: params.windowId,
    chunkSize: uploadInit.uploadSession.chunkSize,
    uploadedChunks: 0,
    totalChunks: uploadInit.uploadSession.totalChunks,
    isInstant: 0,
    errorMessage: '',
    createTime: now(),
    updateTime: now(),
  });

  messageTableClass.insert(localMessageData);

  uploadScheduler.addTask(taskId);

  return localMessageData;
};

/** 标记会话已读 */
addActionHandler('ReadMessage', async (data) => {
  const params = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.readMessage,
      ReadMessageRequest.encode(ReadMessageRequest.create(params)).finish(),
    ),
  );

  if (err) {
    console.error('标记消息已读失败:', err);
    throw err;
  }

  const convo = conversationTableClass.getConversation(params.conversationId);
  if (convo) {
    conversationTableClass.upsertConversations([
      {
        ...convo,
        unreadCount: Number(res.unreadCount ?? 0),
        lastReadMessageId: Number(res.messageId ?? 0),
      },
    ]);
  }

  return {
    conversationId: res.conversationId,
    messageId: Number(res.messageId ?? 0),
    unreadCount: Number(res.unreadCount ?? 0),
  };
});
