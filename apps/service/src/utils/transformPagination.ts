import { DEFAULT_PAGINATION_PARAMS } from 'src/constants';
import { Common } from '@c_chat/shared-protobuf';

export const transformPaginationParams = (params?: Common.IPaginationRequest | null) => {
  return {
    page: params?.page ?? DEFAULT_PAGINATION_PARAMS.page,
    pageSize: params?.pageSize ?? DEFAULT_PAGINATION_PARAMS.pageSize,
  };
};
