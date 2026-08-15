import { Paginated, PaginationInput } from '@gridx/shared';

export function paginationArgs(query: PaginationInput): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function paginate<T>(data: T[], total: number, query: PaginationInput): Paginated<T> {
  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
