export const DEFAULT_PAGINATION_PARAMS = {
  page: 1,
  pageSize: 50,
};
export const DEFAULT_PAGINATION = {
  ...DEFAULT_PAGINATION_PARAMS,
  total: 0,
  totalPage: 0,
};

export const DEFAULT_LIST_DATA = {
  list: [],
  pagination: DEFAULT_PAGINATION,
};
