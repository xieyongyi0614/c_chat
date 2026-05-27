import type { FileInfoListItem, IpcMethod } from '../ipcTypes';
import type { IGetGroupDetailResponse, IGroupOperationResponse } from '@c_chat/shared-protobuf';
import type { SocketTypes } from '../../socket.types';
import type { LocalConversationListItem, LocalMessageListItem } from '../../db';
import type { MediaPreviewPayload } from '../webContentEvent';

interface CreateConversationParams {
  targetId: string;
}
export type CreateGroupParams = {
  name?: string;
  memberIds: string[];
  avatarUrl?: string;
};
export type GetConversationListParams = SocketTypes.RequestListParams;
export type GetLocalConversationListParams = SocketTypes.RequestListParams;
export type GetGroupDetailParams = {
  groupId: string;
};
export type GetGroupDetailResult = IGetGroupDetailResponse;
export type UpdateGroupParams = {
  groupId: string;
  name?: string;
  avatarUrl?: string;
  notice?: string;
};
export type InviteGroupMembersParams = {
  groupId: string;
  memberIds: string[];
};
export type GroupActionParams = {
  groupId: string;
};
export type GroupOperationResult = IGroupOperationResponse;
export type OpenMediaPreviewParams = MediaPreviewPayload;

export type GetMessageHistoryParams = {
  conversationId: string;
  pageSize?: number;
  afterMsgId?: number;
  beforeMsgId?: number;
  limit?: number;
};

export type SendMessageParams = {
  conversationId?: string;
  targetId?: string;
  content: string;
  files?: FileInfoListItem[];
  fileId?: string;
  mediaGroupId?: string;
};

export type ReadMessageParams = {
  conversationId: string;
  messageId?: string;
};

export type ResendMessageParams = {
  clientMsgId: string;
};

export type ReadMessageResult = {
  conversationId: string;
  lastReadSeq: bigint;
  unreadCount: number;
};

export interface ChatPreloadTypes {
  CreateConversation: IpcMethod<CreateConversationParams, LocalConversationListItem>;
  CreateGroup: IpcMethod<CreateGroupParams, LocalConversationListItem>;
  GetGroupDetail: IpcMethod<GetGroupDetailParams, GetGroupDetailResult>;
  UpdateGroup: IpcMethod<UpdateGroupParams, GroupOperationResult>;
  InviteGroupMembers: IpcMethod<InviteGroupMembersParams, GroupOperationResult>;
  LeaveGroup: IpcMethod<GroupActionParams, GroupOperationResult>;
  DismissGroup: IpcMethod<GroupActionParams, GroupOperationResult>;
  OpenMediaPreview: IpcMethod<OpenMediaPreviewParams, boolean>;
  GetMediaPreviewPayload: IpcMethod<void, MediaPreviewPayload | null>;
  GetConversationList: IpcMethod<
    GetConversationListParams,
    SocketTypes.ResponseList<LocalConversationListItem>
  >;
  GetLocalConversationList: IpcMethod<
    GetLocalConversationListParams | undefined,
    SocketTypes.ResponseList<LocalConversationListItem>
  >;
  GetLocalMessageHistory: IpcMethod<GetMessageHistoryParams, LocalMessageListItem[]>;
  GetMessageHistory: IpcMethod<GetMessageHistoryParams, LocalMessageListItem[]>;
  SendMessage: IpcMethod<SendMessageParams, LocalMessageListItem[]>;
  ResendMessage: IpcMethod<ResendMessageParams, LocalMessageListItem[]>;
  ReadMessage: IpcMethod<ReadMessageParams, ReadMessageResult>;
}
