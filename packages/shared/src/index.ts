export interface DataProvenance {
  source: string;
  observedAt: string | null;
  fetchedAt: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiProblem {
  statusCode: number;
  code: string;
  message: string;
}
