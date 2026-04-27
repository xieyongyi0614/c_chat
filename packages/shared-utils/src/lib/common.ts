import { DEFAULT_PAGINATION } from '@c_chat/shared-config';
import { Common } from '@c_chat/shared-protobuf';
import { RequiredNonNullable, SocketTypes } from '@c_chat/shared-types';

export const transformListParams = (params?: SocketTypes.RequestListParams) => {
  const newParams: SocketTypes.RequestListParams = {
    pagination: transformPageParams(params?.pagination),
    word: params?.word ?? '',
  };
  return newParams;
};

export const transformPagination = <T>(
  pagination?: Common.IPaginationResponse | null,
): SocketTypes.ResponseList<T>['pagination'] => {
  return {
    ...transformPageParams(pagination),
    total: pagination?.total ?? DEFAULT_PAGINATION.total,
    totalPage: pagination?.totalPage ?? DEFAULT_PAGINATION.totalPage,
  };
};

export const transformPageParams = (
  params?: Common.IPaginationRequest | null,
): RequiredNonNullable<SocketTypes.RequestPagination> => {
  return {
    page: params?.page ?? DEFAULT_PAGINATION.page,
    pageSize: params?.pageSize ?? DEFAULT_PAGINATION.pageSize,
  };
};
