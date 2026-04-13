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
    pagination: PaginationType;
    list: T[];
  }
  interface PaginationType {
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
    export interface SocketErrorType {
      code: string;
      message: string;
      timestamp: number;
    }
  }
}
