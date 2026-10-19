import { describe, expect, it } from 'vitest';

import { buttonVariants } from './hlm-button';

describe('shared button size contract', () => {
  it('keeps standard and compact buttons at the shared heights', () => {
    expect(buttonVariants({ size: 'default' })).toContain('h-[var(--bm-control-height)]');

    for (const size of ['xs', 'sm', 'lg'] as const) {
      expect(buttonVariants({ size })).toContain('h-[var(--bm-control-height-compact)]');
    }
  });

  it('keeps every icon action at least 36px', () => {
    for (const size of ['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const) {
      expect(buttonVariants({ size })).toContain('size-[var(--bm-control-height-compact)]');
    }
  });
});
