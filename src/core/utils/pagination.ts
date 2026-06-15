export interface PaginationInput {
  page: number;
  limit: number;
}

export function paginationResult(
  input: PaginationInput,
  total: number
) {
  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / input.limit)
  };
}
