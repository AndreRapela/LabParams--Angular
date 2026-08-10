export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  pagination?: ApiPagination;
}

export interface ApiPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
