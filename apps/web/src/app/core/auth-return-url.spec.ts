import { describe, expect, it } from 'vitest';

import { safeInternalReturnUrl } from './auth-return-url';

describe('safeInternalReturnUrl', () => {
  it('preserves an internal path, query, and fragment', () => {
    expect(safeInternalReturnUrl('/scans?tab=review#space-4')).toBe('/scans?tab=review#space-4');
    expect(safeInternalReturnUrl('/plans?tab=active#first')).toBe('/plans?tab=active#first');
    expect(safeInternalReturnUrl('/settings#backup')).toBe('/settings#backup');
  });

  it.each(['https://example.com', '//example.com', 'javascript:alert(1)', ''])(
    'rejects unsafe or empty return target: %s',
    (candidate) => {
      expect(safeInternalReturnUrl(candidate)).toBeNull();
    },
  );

  it.each(['/market', '/account', '/storage-archive', '/scans-archive', '/plans-archive'])(
    'rejects local destinations outside the gated areas: %s',
    (candidate) => {
      expect(safeInternalReturnUrl(candidate)).toBeNull();
    },
  );
});
