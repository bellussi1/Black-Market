import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { colorFingerprint } from './icon-fingerprint';

describe('Color fingerprint geometry', () => {
  it('keeps both lateral edges instead of applying the default square center crop', async () => {
    const data = Buffer.alloc(60 * 60 * 3);
    for (let y = 0; y < 60; y++)
      for (let x = 0; x < 60; x++) {
        if (x < 10) data[(y * 60 + x) * 3 + 2] = 255;
        if (x >= 50) data[(y * 60 + x) * 3] = 255;
      }
    const png = await sharp(data, { raw: { width: 60, height: 60, channels: 3 } })
      .png()
      .toBuffer();
    const rgb = Buffer.from(await colorFingerprint(png), 'base64');
    expect(rgb.length).toBe(192);
    expect(rgb[2]).toBeGreaterThan(150);
    expect(rgb[21]).toBeGreaterThan(150);
    expect(rgb[6]).toBeLessThan(30);
  });
});
