import { describe, expect, it } from 'vitest';

import { securityHeaders } from './security-headers';
describe('public server security policy', () => {
  it('applies HSTS only to HTTPS and denies framing and object execution', () => {
    const headers = securityHeaders('https://black-market.example');
    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Content-Security-Policy']).not.toContain("'unsafe-eval'");
    expect(securityHeaders('http://localhost')['Strict-Transport-Security']).toBeUndefined();
  });
  it('allows only HTTPS identity and image origins configured by the operator', () => {
    const headers = securityHeaders(
      undefined,
      'https://identity.example/auth',
      'https://images.example/icons',
    );
    expect(headers['Content-Security-Policy']).toContain('https://identity.example');
    expect(headers['Content-Security-Policy']).toContain('https://images.example');
    expect(
      securityHeaders(undefined, 'http://untrusted.example')['Content-Security-Policy'],
    ).not.toContain('http://untrusted.example');
  });
});
