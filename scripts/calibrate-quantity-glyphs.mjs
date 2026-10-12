#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { verifyRealImages } from './real-ocr-corpus.mjs';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
const manifest = JSON.parse(await readFile('data/ocr-corpus/lifeskill-slots.json', 'utf8'));
await verifyRealImages(manifest.samples);
const glyphs = new Map();
for (const sample of manifest.samples.filter((s) => s.split === 'calibration')) {
  for (const slot of sample.slots) {
    const b = slot.bounds;
    const rect = {
      left: b.left,
      top: b.top + Math.floor(b.height * 0.57),
      width: b.width,
      height: Math.floor(b.height * 0.37),
    };
    const { data, info } = await sharp(sample.imagePath)
      .extract(rect)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const threshold of [150, 170, 190]) {
      const pixels = Array.from({ length: info.width * info.height }, (_, i) =>
        Math.min(...data.subarray(i * 3, i * 3 + 3)) > threshold &&
        Math.max(...data.subarray(i * 3, i * 3 + 3)) -
          Math.min(...data.subarray(i * 3, i * 3 + 3)) <
          70
          ? 1
          : 0,
      );
      const runs = [];
      for (let x = 1; x < info.width - 2; x++) {
        if (!pixels.some((v, i) => v && i % info.width === x)) continue;
        const left = x;
        while (x + 1 < info.width - 2 && pixels.some((v, i) => v && i % info.width === x + 1)) x++;
        runs.push({ left, right: x });
      }
      if (runs.length !== slot.displayedText.length || runs.at(-1).right < info.width * 0.8)
        continue;
      const shapes = runs.map((r, i) => {
        let top = info.height,
          bottom = -1;
        for (let y = 0; y < info.height; y++)
          for (let x = r.left; x <= r.right; x++)
            if (pixels[y * info.width + x]) {
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        const rows = Array.from({ length: bottom - top + 1 }, (_, dy) =>
          pixels
            .slice((top + dy) * info.width + r.left, (top + dy) * info.width + r.right + 1)
            .join(''),
        );
        return { character: slot.displayedText[i], rows };
      });
      if (shapes.some((g) => !g.rows.length || (!/[.,]/.test(g.character) && g.rows.length < 6)))
        continue;
      for (const g of shapes) {
        const key = g.character + ':' + g.rows.join('/');
        if ([...glyphs.values()].filter((v) => v.character === g.character).length < 24)
          glyphs.set(key, g);
      }
    }
  }
}
const output =
  '/** Generated only from manually labeled calibration sessions. Do not train on evaluation captures. */\nexport const realQuantityGlyphs = ' +
  JSON.stringify([...glyphs.values()]) +
  ' as const;\n';
await writeFile('apps/web/src/app/features/scans/quantity-real-glyphs.ts', output);
await mkdir('tmp/ocr-dataset', { recursive: true });
await writeFile(
  'tmp/ocr-dataset/real-quantity-profile.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      glyphs: [...glyphs.values()],
      sources: manifest.samples
        .filter((sample) => sample.split === 'calibration')
        .map(({ sessionId, sha256 }) => ({ sessionId, sha256, split: 'calibration' })),
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(
  JSON.stringify({
    templates: glyphs.size,
    characters: [...new Set([...glyphs.values()].map((g) => g.character))],
  }) + '\n',
);
