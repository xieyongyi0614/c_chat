import { ActionCtx, addActionHandler, omitActionCtx } from '../../util';
import { socketManager } from '@c_chat/electron_client/utils/socket-io-client';
import {
  GetMessageHistoryResponse,
  GetMessageHistoryRequest,
  ReadMessageRequest,
  SendMessageRequest,
} from '@c_chat/shared-protobuf';
import type { IGetMessageHistoryRequest } from '@c_chat/shared-protobuf';
import { conversationTableClass, messageTableClass, uploadTaskTableClass } from '../../../db';
import { to, uuidv4 } from '@c_chat/shared-utils';
import {
  AuthTypes,
  LocalMessageListItem,
  MessageStatusEnum,
  SendMessageParams,
  UploadStatusEnum,
  FileInfoListItem,
} from '@c_chat/shared-types';
import { ClientToServiceEvent } from '@c_chat/shared-protobuf/protoMap';
import { now } from 'lodash';
import { calcSamplingHash } from '@c_chat/electron_client/utils/calcFileHash';
import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MESSAGE_TYPE,
  MessageType,
  messageTypeMap,
} from '@c_chat/shared-config';
import { ApiClient } from '@c_chat/electron_client/utils/axios/service/apiService';
import { sendSocketMessageWithFile } from '@c_chat/electron_client/utils/uploadTaskRunner';
import { uploadScheduler } from '@c_chat/electron_client/utils/UploadScheduler';

type RemoteMessageInfo = GetMessageHistoryResponse['list'][number];

const getMessageSortValue = (msg: LocalMessageListItem) => msg.msgId ?? msg.createTime ?? 0;

const sortMessagesDesc = (msgs: LocalMessageListItem[]) =>
  [...msgs].sort((a, b) => getMessageSortValue(b) - getMessageSortValue(a));

const getNewestLocalMessageTime = (msgs: LocalMessageListItem[]) =>
  msgs.reduce((max, msg) => Math.max(max, msg.createTime ?? msg.localTime ?? 0), 0);

const getNewestServerMsgId = (msgs: LocalMessageListItem[]) =>
  msgs.reduce((max, msg) => Math.max(max, msg.msgId ?? 0), 0);

const mapRemoteMessage = (msg: RemoteMessageInfo): LocalMessageListItem => ({
  id: msg.id!,
  conversationId: msg.conversationId!,
  msgId: msg.msgId!,
  clientMsgId: msg.clientMsgId!,
  senderId: msg.senderId!,
  senderNickname: msg.senderInfo?.nickname ?? msg.senderInfo?.email ?? '',
  senderAvatar: msg.senderInfo?.avatarUrl ?? '',
  senderEmail: msg.senderInfo?.email ?? '',
  content: msg.content ?? '',
  type: msg.type as MessageType,
  mediaGroupId: msg.mediaGroupId ?? '',
  fileId: msg.media?.fileId ?? msg.media?.file?.id ?? '',
  fileName: msg.media?.file?.fileName ?? '',
  fileUrl: msg.media?.file?.url ?? msg.media?.fileUrl ?? '',
  mimeType: msg.media?.file?.mimeType ?? '',
  fileSize: Number(msg.media?.file?.size ?? 0),
  waveform: msg.media?.waveform ?? '',
  duration: msg.media?.durationSec ?? 0,
  status: MessageStatusEnum.success,
  updateTime: Number(msg.updateTime),
  localTime: Number(msg.createTime),
  createTime: Number(msg.createTime),
});

/** 获取本地消息历史 */
addActionHandler('GetLocalMessageHistory', async (data) => {
  const { pageSize = DEFAULT_MESSAGE_PAGE_SIZE, conversationId, beforeMsgId } = data;

  const localMsgs = messageTableClass.getMessagesByConversationId(
    conversationId,
    pageSize,
    beforeMsgId,
  );

  if (!beforeMsgId && localMsgs.length > 0) {
    const conversation = conversationTableClass.getConversation(conversationId);
    const newestLocalMessageTime = getNewestLocalMessageTime(localMsgs);

    if (
      conversation?.lastMsgTime &&
      newestLocalMessageTime > 0 &&
      newestLocalMessageTime < conversation.lastMsgTime
    ) {
      return [];
    }
  }

  return localMsgs ?? [];
});

/** 获取消息历史 (本地缓存优先) */
addActionHandler('GetMessageHistory', async (data) => {
  const {
    conversationId,
    beforeMsgId,
    afterMsgId,
    pageSize = DEFAULT_MESSAGE_PAGE_SIZE,
  } = omitActionCtx(data);
  const socketService = socketManager.getSocketService(data.windowId);
  const limit = Math.max(1, Math.min(pageSize, DEFAULT_MESSAGE_PAGE_SIZE));
  if (beforeMsgId) {
    const localRecords = messageTableClass.getMessagesByConversationId(
      conversationId,
      limit,
      beforeMsgId,
    );
    const newestLocalMsgId = getNewestServerMsgId(localRecords);

    if (localRecords.length >= limit && newestLocalMsgId >= beforeMsgId - 1) {
      return localRecords;
    }
  }

  const request: IGetMessageHistoryRequest = beforeMsgId
    ? { conversationId, beforeMsgId, limit }
    : afterMsgId
      ? { conversationId, afterMsgId, limit }
      : { conversationId, limit };

  const [err, res] = await to(
    socketService.genericRequest(
      ClientToServiceEvent.getMessageHistory,
      GetMessageHistoryRequest.encode(GetMessageHistoryRequest.create(request)).finish(),
    ),
  );
  if (err) {
    return [];
  }

  const records = sortMessagesDesc(res.list?.map(mapRemoteMessage) ?? []);

  if (records.length > 0) {
    messageTableClass.upsertMessages(records);
  }

  return records;
});
const generateLocalMessageData = (data: Partial<LocalMessageListItem>): LocalMessageListItem => {
  return {
    id: uuidv4(),
    conversationId: data.conversationId ?? '',
    msgId: data.msgId ?? null,
    clientMsgId: uuidv4(),
    senderId: data.senderId ?? '',
    senderNickname: data.senderNickname ?? '',
    senderAvatar: data.senderAvatar ?? '',
    senderEmail: data.senderEmail ?? '',
    content: data.content ?? '',
    type: data.type ?? MESSAGE_TYPE.Text,
    status: MessageStatusEnum.sending,
    createTime: now(),
    localTime: now(),
    updateTime: now(),
    fileId: data.fileId || '',
    fileUrl: data.fileUrl || '',
    filePath: data.filePath || '',
    mediaGroupId: data.mediaGroupId || '',
    fileName: data?.fileName ?? '',
    mimeType: data?.mimeType ?? '',
    fileSize: Number(data?.fileSize ?? 0),
    waveform: data.waveform,
    duration: data.duration ?? 0,
  };
};

/** 发送消息 (存入本地并更新会话) */
addActionHandler('SendMessage', async (params) => {
  const socketService = socketManager.getSocketService(params.windowId);

  const senderInfo = socketService.getUserInfo();

  if (params.files && params.files?.length > 0) {
    const res = await handleSendFiles(params, senderInfo);
    return res;
  }

  const localMessageData = generateLocalMessageData({
    ...params,
    senderId: senderInfo?.id ?? '',
    senderNickname: senderInfo?.nickname ?? senderInfo?.email ?? '',
    senderAvatar: senderInfo?.avatarUrl ?? '',
    senderEmail: senderInfo?.email ?? '',
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

const getMessageAfterStatusUpdate = (clientMsgId: string, status: MessageStatusEnum) => {
  messageTableClass.updateMessageStateByClientId(clientMsgId, status);
  return messageTableClass.getByClientMsgId(clientMsgId);
};

const resendSocketMessage = async (windowId: number, msg: LocalMessageListItem) => {
  if (msg.fileId) {
    await sendSocketMessageWithFile(windowId, {
      conversationId: msg.conversationId,
      clientMsgId: msg.clientMsgId,
      fileId: msg.fileId,
      durationSec: msg.duration,
      waveform: msg.waveform,
      type: msg.type,
      mediaGroupId: msg.mediaGroupId || undefined,
      content: msg.content,
    });
    return;
  }

  const socketService = socketManager.getSocketService(windowId);
  const res = await socketService.genericRequest(
    ClientToServiceEvent.sendMessage,
    SendMessageRequest.encode(
      SendMessageRequest.create({
        conversationId: msg.conversationId,
        content: msg.content,
        type: msg.type,
        clientMsgId: msg.clientMsgId,
      }),
    ).finish(),
  );

  if (res.status !== 'ok') {
    throw new Error('重发消息失败');
  }
};

const recreateUploadTaskForRetry = async (windowId: number, msg: LocalMessageListItem) => {
  if (!msg.filePath) {
    throw new Error('缺少本地文件路径，无法重发');
  }

  const fileHash = calcSamplingHash(msg.filePath);
  const uploadInit = await ApiClient.upload.uploadInit({
    fileName: msg.fileName ?? '',
    fileHash,
    fileSize: msg.fileSize ?? 0,
  });

  if (uploadInit?.file?.id) {
    messageTableClass.updateFileIdByClientId(msg.clientMsgId, uploadInit.file.id);
    const nextMsg = messageTableClass.getByClientMsgId(msg.clientMsgId);
    if (!nextMsg) throw new Error('消息不存在');
    await resendSocketMessage(windowId, nextMsg);
    return;
  }

  if (!uploadInit?.uploadSession?.id) {
    throw new Error('创建上传任务失败');
  }

  const taskId = uuidv4();
  uploadTaskTableClass.insert({
    id: taskId,
    clientMsgId: msg.clientMsgId,
    filePath: msg.filePath,
    fileName: msg.fileName ?? '',
    fileSize: msg.fileSize ?? 0,
    mimeType: msg.mimeType ?? '',
    fileHash,
    status: UploadStatusEnum.waiting,
    progress: 0,
    uploadedBytes: 0,
    isRunning: 0,
    uploadSessionId: uploadInit.uploadSession.id,
    windowId,
    chunkSize: uploadInit.uploadSession.chunkSize,
    uploadedChunks: 0,
    totalChunks: uploadInit.uploadSession.totalChunks,
    isInstant: 0,
    errorMessage: '',
    createTime: now(),
    updateTime: now(),
  });
  uploadScheduler.addTask(taskId);
};

addActionHandler('ResendMessage', async (params) => {
  const { clientMsgId, windowId } = params;
  const msg = messageTableClass.getByClientMsgId(clientMsgId);

  if (!msg) {
    throw new Error('消息不存在');
  }

  if (msg.status === MessageStatusEnum.success) {
    return [msg];
  }

  const sendingMsg = getMessageAfterStatusUpdate(clientMsgId, MessageStatusEnum.sending);
  if (!sendingMsg) {
    throw new Error('消息不存在');
  }

  try {
    if (!sendingMsg.fileId && sendingMsg.filePath) {
      const tasks = uploadTaskTableClass.getByClientMsgIdList(clientMsgId) ?? [];
      const task = tasks[0];

      if (task) {
        uploadTaskTableClass.resetForRetry(task.id);
        uploadScheduler.addTask(task.id);
      } else {
        await recreateUploadTaskForRetry(windowId, sendingMsg);
      }

      return [messageTableClass.getByClientMsgId(clientMsgId) ?? sendingMsg];
    }

    await resendSocketMessage(windowId, sendingMsg);
    return [messageTableClass.getByClientMsgId(clientMsgId) ?? sendingMsg];
  } catch (error) {
    getMessageAfterStatusUpdate(clientMsgId, MessageStatusEnum.fail);
    console.error('重发消息失败:', error);
    throw error instanceof Error ? error : new Error('重发消息失败');
  }
});

const handleSendFiles = async (
  params: SendMessageParams & ActionCtx,
  senderInfo?: AuthTypes.GetUserInfoResponse,
) => {
  const { files = [] } = params;

  const grouped = files.reduce<Record<'images' | 'others', FileInfoListItem[]>>(
    (acc, cur) => {
      switch (cur.fileType) {
        case 'image':
          acc.images.push(cur);
          break;
        default:
          acc.others.push(cur);
          break;
      }
      return acc;
    },
    { images: [], others: [] },
  );

  const res: (LocalMessageListItem | null)[] = [];

  if (grouped.images.length > 0) {
    const imageGroupId = uuidv4();
    const imageResults = await Promise.all(
      grouped.images.map(async (file) => {
        return processSingleFile(
          { ...params, type: MESSAGE_TYPE.Image },
          senderInfo,
          file,
          imageGroupId,
        );
      }),
    );
    res.push(...imageResults);
  }

  if (grouped.others.length > 0) {
    const fileResults = await Promise.all(
      grouped.others.map(async (file) => {
        return processSingleFile(
          { ...params, type: messageTypeMap[file.fileType] ?? MESSAGE_TYPE.File },
          senderInfo,
          file,
        );
      }),
    );
    res.push(...fileResults);
  }

  return res.filter((item) => item !== null);
};

const processSingleFile = async (
  params: SendMessageParams & ActionCtx & { type: MessageType },
  senderInfo: AuthTypes.GetUserInfoResponse | undefined,
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
    waveform: file.metadata?.waveform,
    filePath,
    mimeType: file.mimeType,
    duration: file.metadata?.duration ?? 0,
    senderId: senderInfo?.id ?? '',
    senderNickname: senderInfo?.nickname ?? senderInfo?.email ?? '',
    senderAvatar: senderInfo?.avatarUrl ?? '',
    senderEmail: senderInfo?.email ?? '',
    status: MessageStatusEnum.sending,
    ...(mediaGroupId && { mediaGroupId }),
  });

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
        waveform: localMessageData.waveform,
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
