/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

function readSharedStyles() {
  const stylesPath = join(cwd(), 'src', 'styles');
  return {
    tokens: readFileSync(join(stylesPath, '_tokens.scss'), 'utf8'),
    layout: readFileSync(join(stylesPath, '_layout.scss'), 'utf8'),
    responsive: readFileSync(join(stylesPath, '_responsive.scss'), 'utf8'),
  };
}

describe('shared BDO UI token contract', () => {
  it('defines the shared spacing, typography, control, page-width and motion tokens', () => {
    const styles = readSharedStyles();
    const tokens = new Map(
      [...styles.tokens.matchAll(/(--bm-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
        name,
        value.trim(),
      ]),
    );

    for (const [token, value] of [
      ['--bm-space-1', '4px'],
      ['--bm-space-2', '8px'],
      ['--bm-space-3', '12px'],
      ['--bm-space-4', '16px'],
      ['--bm-space-5', '24px'],
      ['--bm-space-6', '32px'],
      ['--bm-space-7', '40px'],
      ['--bm-space-8', '48px'],
      ['--bm-text-display', '32px'],
      ['--bm-text-page-min', '26px'],
      ['--bm-text-page-max', '30px'],
      ['--bm-text-page-mobile', '28px'],
      ['--bm-text-section', '19px'],
      ['--bm-text-body', '16px'],
      ['--bm-text-support', '14px'],
      ['--bm-text-meta', '12px'],
      ['--bm-control-height', '44px'],
      ['--bm-control-height-compact', '36px'],
      ['--bm-page-max', '1440px'],
      ['--bm-page-max-wide', '1760px'],
      ['--bm-motion-route-enter', '220ms'],
      ['--bm-motion-route-exit', '120ms'],
    ]) {
      expect(tokens.get(token), token).toBe(value);
    }

    expect(styles.layout).toMatch(/\.tool-page\s*\{[^}]*max-width:\s*var\(--bm-page-max\)/s);
    expect(styles.layout).toMatch(
      /\.tool-page--wide\s*\{[^}]*max-width:\s*var\(--bm-page-max-wide\)/s,
    );
    expect(styles.layout).toContain('var(--bm-motion-route-enter)');
    expect(styles.layout).toContain('var(--bm-motion-route-exit)');
    expect(styles.responsive).toContain('var(--bm-space-');
  });
});
