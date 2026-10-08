import { describe, expect, it } from 'vitest';

import { securityHeaders } from '../../security-headers';

describe('Public page security headers', () => {
  it('restricts scripts, frames and capabilities while allowing requested OCR', () => {
    const headers = securityHeaders(
      'https://platform.example',
      'https://identity.example',
      'https://assets.example/version',
    );
    const csp = headers['Content-Security-Policy'];
    const scripts = csp.split(';').find((part) => part.trim().startsWith('script-src'))!;
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts.split(' ')).not.toContain("'unsafe-eval'");
    expect(scripts).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://identity.example');
    expect(csp).not.toContain('*.supabase.co');
    expect(csp).toContain('https://assets.example');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });
  it('only enables HSTS and upgrading on an HTTPS public deployment', () => {
    expect(securityHeaders('https://platform.example')['Strict-Transport-Security']).toBe(
      'max-age=31536000',
    );
    expect(securityHeaders('http://localhost:4200')['Strict-Transport-Security']).toBeUndefined();
    expect(securityHeaders()['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
  });
});
