import { IpcMethod } from './ipcTypes';
import { SocketTypes } from '../socket.types';

interface CreateConversationParams {
  targetId: string;
}
type GetConversationListParams = SocketTypes.RequestListParams;

export interface ChatPreloadTypes {
  CreateConversation: IpcMethod<CreateConversationParams, any>;
  GetConversationList: IpcMethod<GetConversationListParams, any>;
}
