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
    // const [err, res] = await to(ipc.ReadLocalFile({ filePath: params.files[0].filePath }));
    // if (err) {
    //   console.error('读取文件失败:', err);
    // }
    // console.log(res, 'ReadLocalFile');
    const res = await handleSendFiles(params, senderInfo?.id ?? '');
    return res[0];
  }
  // const localMessageData = {
  //   id: uuidv4(),
  //   conversationId: conversationId ?? '',
  //   msgId: 0,
  //   clientMsgId: uuidv4(),
  //   senderId: senderInfo?.id ?? '',
  //   content: params.content,
  //   type: params.type,
  //   status: MessageStatusEnum.sending,
  //   createTime: now(),
  //   localTime: now(),
  //   updateTime: now(),
  //   fileId: params.fileId || '',
  //   mediaGroupId: '',
  // };
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

  return localMessageData;
});

const handleSendFiles = async (params: SendMessageParams & ActionCtx, senderId: string) => {
  const { files = [] } = params;
  const groupId = files.length > 1 ? uuidv4() : '';

  const res = await Promise.all(
    files.map(async (file) => {
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
        mediaGroupId: groupId,
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
    }),
  );
  return res.filter((item) => item !== null);
};

// async function startUpload(
//   taskId: string,
//   socketService: ReturnType<typeof socketManager.getSocketService>,
//   meta: { conversationId: string; clientMsgId: string; mediaGroupId: string; type: number },
// ) {
//   try {
//     const task = uploadTaskTableClass.getByTaskId(taskId);
//     if (!task) throw new Error('upload task not found');

//     // 构造 FormData
//     const form = new FormData();
//     form.append('file', fs.createReadStream(task.file_path as unknown as string), {
//       filename: task.file_name as unknown as string,
//       contentType: task.mime_type as unknown as string,
//     });
//     // 可携带额外字段
//     form.append('clientMsgId', task.client_msg_id as unknown as string);
//     form.append('fingerprint', task.fingerprint as unknown as string);
//     form.append('fileHash', task.file_hash as unknown as string);

//     // 调用后端上传接口（使用 ApiClient）
//     const api = ApiClient.instance;
//     if (!api) throw new Error('ApiClient not initialized');

//     const headers = form.getHeaders
//       ? (form.getHeaders() as Record<string, string>)
//       : { 'Content-Type': 'multipart/form-data' };

//     const resp = await api.uploadFile('/upload/single', form as any, { headers });
//     // resp 为 axios 原始响应，取数据
//     const fileData = resp.data as any;
//     const fileId = fileData?.data?.id || fileData?.id;

//     if (!fileId) {
//       throw new Error('upload response missing file id');
//     }

//     // 更新任务与本地 message
//     uploadTaskTableClass.setFileId(taskId, fileId);
//     uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.success);

//     // 发送消息到服务端，通知文件已上传完成并创建消息
//     const [err, res] = await to(
//       socketService.genericRequest(
//         ClientToServiceEvent.sendMessage,
//         SendMessageRequest.encode(
//           SendMessageRequest.create({
//             conversationId: meta.conversationId,
//             clientMsgId: meta.clientMsgId,
//             fileId,
//             type: meta.type,
//             mediaGroupId: meta.mediaGroupId,
//           }),
//         ).finish(),
//       ),
//     );

//     if (err || res.status !== 'ok') {
//       // 标记发送失败
//       messageTableClass.updateMessageStateByClientId(meta.clientMsgId, MessageStatusEnum.fail);
//       throw err || new Error('send message after upload failed');
//     }
//   } catch (e) {
//     console.error('startUpload error', e);
//     uploadTaskTableClass.updateStatus(taskId, UploadStatusEnum.fail);
//   }
// }

// async function startUpload(taskId: string) {
//   try {
//     // ✅ 1. 计算 hash（用于秒传）
//     const hash = await calcFileHashWithProgress(task?.filePath, {
//       onProgress: (percent, processedBytes, totalBytes) => {
//         console.log('progress', percent, processedBytes, totalBytes);
//       },
//     });

//     // ✅ 2. 上传（内部做 chunk / 秒传）
//     const { fileId } = await uploadFile({
//       filePath: task.filePath,
//       hash,
//       onProgress: (progress, uploadedBytes) => {
//         uploadTaskTable.updateProgress(taskId, progress, uploadedBytes);
//       },
//     });

//     // ✅ 3. 更新任务
//     uploadTaskTable.setFileId(taskId, fileId);
//     uploadTaskTable.updateStatus(taskId, UploadStatusEnum.success);

//     // ✅ 4. 发消息（关键）
//     await sendMessage({
//       conversationId: task.conversationId,
//       clientMsgId: task.clientMsgId,
//       fileId,
//       type: MessageTypeEnum.Image,
//       mediaGroupId: task.mediaGroupId,
//     });
//   } catch (e) {
//     uploadTaskTable.updateStatus(taskId, UploadStatusEnum.fail);

//     messageTableClass.updateMessageStateByClientId(task.clientMsgId, MessageStatusEnum.fail);
//   }
// }

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
