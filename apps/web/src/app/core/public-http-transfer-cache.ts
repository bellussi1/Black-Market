import type { HttpRequest } from '@angular/common/http';

/** Only public reads may be serialized into HTML for hydration. */
export function shouldTransferPublicRead(request: HttpRequest<unknown>): boolean {
  return (
    request.method === 'GET' &&
    !request.headers.has('Authorization') &&
    (['/items', '/recipes', '/reference', '/categories', '/world/', '/roadmap'].some((path) =>
      request.url.includes('/api/v1' + path),
    ) ||
      /\/api\/v1\/market\/board(?:\?|$)/.test(request.url))
  );
}
