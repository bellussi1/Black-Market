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
  it('allows the configured Firebase auth domain and only HTTPS image origins', () => {
    const headers = securityHeaders(
      undefined,
      'black-market.firebaseapp.com',
      'https://images.example/icons',
    );
    expect(headers['Content-Security-Policy']).toContain('https://black-market.firebaseapp.com');
    expect(headers['Content-Security-Policy']).toContain('https://identitytoolkit.googleapis.com');
    expect(headers['Content-Security-Policy']).toContain('https://securetoken.googleapis.com');
    expect(headers['Content-Security-Policy']).toContain('https://images.example');
    expect(
      securityHeaders(undefined, 'http://untrusted.example')['Content-Security-Policy'],
    ).not.toContain('http://untrusted.example');
  });

  it('keeps Firebase endpoints out when the auth domain is invalid', () => {
    const csp = securityHeaders(undefined, 'javascript:alert(1)')['Content-Security-Policy'];
    expect(csp).not.toContain('javascript:');
    expect(csp).not.toContain('*.supabase.co');
  });
});
