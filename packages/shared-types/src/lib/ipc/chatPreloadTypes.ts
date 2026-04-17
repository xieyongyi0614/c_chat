import { IpcMethod } from './ipcTypes';
import { SocketTypes } from '../socket.types';
import { LocalConversationListItem, LocalMessageListItem } from '../db';

interface CreateConversationParams {
  targetId: string;
}
export type GetConversationListParams = SocketTypes.RequestListParams;
export type GetLocalConversationListParams = SocketTypes.RequestListParams;
export type GetMessageHistoryParams = SocketTypes.RequestListParams & { conversationId: string };

export interface ChatPreloadTypes {
  CreateConversation: IpcMethod<CreateConversationParams, any>;
  GetConversationList: IpcMethod<
    GetConversationListParams,
    SocketTypes.ResponseList<LocalConversationListItem>
  >;
  GetLocalConversationList: IpcMethod<
    GetLocalConversationListParams,
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
  SendMessage: IpcMethod<any, any>;
}
