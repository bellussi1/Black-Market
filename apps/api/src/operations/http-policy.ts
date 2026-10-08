import type { IncomingMessage } from 'node:http';

export const isWorkspacePath = (path: string) =>
  path === '/api/v1/workspace' || path.startsWith('/api/v1/workspace/');

/** Both JSON parsers use the native Nest adapter; only personal backups need 20 MB. */
export function jsonRequest(request: IncomingMessage, workspace: boolean): boolean {
  const path = (request.url ?? '').split('?')[0];
  return (
    isWorkspacePath(path) === workspace &&
    /^application\/json(?:\s*;|$)/i.test(String(request.headers['content-type'] ?? ''))
  );
}

export function apiCorsOptions(webOrigin: string) {
  return {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed: boolean) => void,
    ) => callback(null, !origin || origin === webOrigin),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
    maxAge: 600,
  };
}
