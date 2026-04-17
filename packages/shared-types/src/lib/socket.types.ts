import { Common } from '@c_chat/shared-protobuf';

export namespace SocketTypes {
  export interface RequestPagination {
    page?: number;
    pageSize?: number;
  }
  export interface RequestListParams {
    pagination?: RequestPagination;
    word?: string;
  }

  export interface ResponseList<T> {
    pagination: Omit<Common.PaginationResponse, 'toJSON'>;
    list: T[];
  }
  export interface PaginationType {
    total: number;
    totalPage: number;
    page: number;
    pageSize: number;
  }

  export namespace WebContentEvents {
    export interface SocketReconnectingType {
      attempt: number;
      maxAttempts: number;
      delay: number;
    }
  }
}
