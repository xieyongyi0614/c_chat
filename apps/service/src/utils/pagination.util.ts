export const paginationTrans = (page: number, pageSize: number) => {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};
