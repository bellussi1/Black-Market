export function securityHeaders(
  publicOrigin?: string,
  identityUrl?: string,
  assetsUrl?: string,
): Record<string, string> {
  const trustedOrigin = (value: string | undefined) => {
    if (!value) return '';
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    return url.origin;
  };
  const identity = trustedOrigin(identityUrl),
    assets = trustedOrigin(assetsUrl);
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${assets}; font-src 'self'; connect-src 'self' ${identity} https://us.i.posthog.com https://eu.i.posthog.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  };
  if (trustedOrigin(publicOrigin)) {
    headers['Strict-Transport-Security'] = 'max-age=31536000';
    headers['Content-Security-Policy'] += '; upgrade-insecure-requests';
  }
  return headers;
}
