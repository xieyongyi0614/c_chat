export namespace SocketTypes {
  export interface RequestPagination {
    page?: number;
    pageSize?: number;
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
}
