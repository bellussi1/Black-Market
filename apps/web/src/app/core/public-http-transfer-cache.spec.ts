import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { shouldTransferPublicRead } from './public-http-transfer-cache';

describe('public HTTP transfer cache', () => {
  it('transfers the public market board but excludes personal and authenticated requests', () => {
    expect(shouldTransferPublicRead(new HttpRequest('GET', '/api/v1/market/board'))).toBe(true);
    expect(
      shouldTransferPublicRead(new HttpRequest('GET', 'http://api/api/v1/market/board?region=sa')),
    ).toBe(true);
    for (const path of ['/workspace', '/identity/me', '/market/quotes', '/market/board/private'])
      expect(shouldTransferPublicRead(new HttpRequest('GET', '/api/v1' + path))).toBe(false);
    expect(
      shouldTransferPublicRead(
        new HttpRequest('GET', '/api/v1/market/board', {
          headers: new HttpHeaders({ Authorization: 'Bearer test' }),
        }),
      ),
    ).toBe(false);
    expect(shouldTransferPublicRead(new HttpRequest('POST', '/api/v1/market/board', {}))).toBe(
      false,
    );
    expect(shouldTransferPublicRead(new HttpRequest('GET', '/api/v1/recipes'))).toBe(true);
  });
});
