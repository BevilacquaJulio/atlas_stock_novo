/** Envelope padrão de resposta paginada do backend. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  clienteId?: number;
}
