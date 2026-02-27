declare namespace API {
  export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
    timestamp: number;
    requestId: string;
  }

  export type HttpClientResponse<T = any> = AxiosResponse<ApiResponse<T>>;
  export type ResponseData<T = any> = ApiResponse<T>['data'];

  export interface ApiResponseList<T> {
    code: number;
    message: string;
    data: ResponseListData<T>;
    timestamp: number;
    requestId: string;
  }
  export interface ResponseListData<T> {
    list: T[];
    total: number;
    totalPage: number;
    page: number;
    pageSize: number;
  }

  export interface RequestListParams {
    page?: number;
    pageSize?: number;
  }
}
