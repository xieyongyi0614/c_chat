import { FileInfoListItem, IpcMethod } from '../ipcTypes';
import { SocketTypes } from '../../socket.types';
import { LocalConversationListItem, LocalMessageListItem, MessageTypeEnum } from '../../db';

interface CreateConversationParams {
  targetId: string;
}
export type GetConversationListParams = SocketTypes.RequestListParams;
export type GetLocalConversationListParams = SocketTypes.RequestListParams;
export type GetMessageHistoryParams = SocketTypes.RequestListParams & { conversationId: string };

export type SendMessageParams = {
  conversationId?: string;
  targetId?: string;
  content: string;
  type: MessageTypeEnum;
  files?: FileInfoListItem[];
};

export type ReadMessageParams = {
  conversationId: string;
  messageId?: string;
};

export type ReadMessageResult = {
  conversationId: string;
  messageId: number;
  unreadCount: number;
};

export interface ChatPreloadTypes {
  CreateConversation: IpcMethod<CreateConversationParams, LocalConversationListItem>;
  GetConversationList: IpcMethod<
    GetConversationListParams,
    SocketTypes.ResponseList<LocalConversationListItem>
  >;
  GetLocalConversationList: IpcMethod<
    GetLocalConversationListParams | undefined,
    SocketTypes.ResponseList<LocalConversationListItem>
  >;
  GetLocalMessageHistory: IpcMethod<
    GetMessageHistoryParams,
    SocketTypes.ResponseList<LocalMessageListItem>
  >;
  GetMessageHistory: IpcMethod<
    GetMessageHistoryParams,
    SocketTypes.ResponseList<LocalMessageListItem>
  >;
  SendMessage: IpcMethod<SendMessageParams, LocalMessageListItem>;
  ReadMessage: IpcMethod<ReadMessageParams, ReadMessageResult>;
}
