export function securityHeaders(
  publicOrigin?: string,
  firebaseAuthDomain?: string,
  assetsUrl?: string,
): Record<string, string> {
  const trustedOrigin = (value: string | undefined) => {
    if (!value) return '';
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    return url.origin;
  };
  const trustedAuthDomain = (value: string | undefined) => {
    if (!value) return '';
    try {
      const url = new URL(value.includes('://') ? value : `https://${value}`);
      return url.protocol === 'https:' ? url.origin : '';
    } catch {
      return '';
    }
  };
  const authDomain = trustedAuthDomain(firebaseAuthDomain),
    assets = trustedOrigin(assetsUrl);
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${assets}; font-src 'self'; connect-src 'self' ${authDomain} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://accounts.google.com https://apis.google.com https://us.i.posthog.com https://eu.i.posthog.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; frame-src 'self' ${authDomain} https://accounts.google.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  };
  if (trustedOrigin(publicOrigin)) {
    headers['Strict-Transport-Security'] = 'max-age=31536000';
    headers['Content-Security-Policy'] += '; upgrade-insecure-requests';
  }
  return headers;
}
