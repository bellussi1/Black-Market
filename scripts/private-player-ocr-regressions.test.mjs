import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const ts = requireWeb('typescript');
function load(name) {
  const source = readFileSync(
    new URL(`../apps/web/src/app/features/scans/${name}.ts`, import.meta.url),
    'utf8',
  );
  const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
  const module = { exports: {} };
  new Function('exports', 'require', 'module', code)(module.exports, requireWeb, module);
  return module.exports;
}
const privateDirectory = process.env['BDO_PRIVATE_OCR_DIR'];
const enabled = privateDirectory && existsSync(privateDirectory);
function verifyPrivateCaptureHashes() {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        '../docs/research/evidence/player-audit-2026-10-22/new-captures-manifest.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.equal(manifest.files.length, 8, 'expected all eight authorized source captures');
  for (const entry of manifest.files) {
    let bytes;
    try {
      bytes = readFileSync(path.join(privateDirectory, entry.file));
    } catch {
      assert.fail(`missing private capture: ${entry.file}`);
    }
    const actual = createHash('sha256').update(bytes).digest('hex');
    assert.equal(actual, entry.sha256, `private capture hash mismatch: ${entry.file}`);
  }
}
for (const name of ['gear-pvp', 'gear-lifeskill']) {
  test(`private real capture: ${name} preserves outer frames`, { skip: !enabled }, async () => {
    verifyPrivateCaptureHashes();
    const sharp = requireApi('sharp');
    const { data, info } = await sharp(path.join(privateDirectory, `${name}.jpeg`))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { findEquipmentFrames, suggestEquipmentLayout } = load('equipment-slots');
    const frames = findEquipmentFrames({ ...info, data });
    assert.ok(
      frames.filter((f) => f.width >= 45).length >= 15,
      `Only ${frames.filter((f) => f.width >= 45).length} outer frames found`,
    );
    if (name === 'gear-lifeskill') {
      const { pendingLifeEquipmentReviewFields } = load('life-equipment-candidates');
      const candidates = frames
        .filter((frame) => frame.width >= 45)
        .map((sourceRect) => ({ sourceRect, ...pendingLifeEquipmentReviewFields() }));
      assert.ok(candidates.length >= 15, 'Life equipment frames were not exposed as candidates');
      assert.ok(
        candidates.every(
          (candidate) =>
            candidate.slot === '' &&
            candidate.item === null &&
            candidate.itemUncertain &&
            candidate.lifeEquipmentKind === null &&
            candidate.lifeEquipmentScope === null &&
            candidate.lifeSlotLabel === '' &&
            !candidate.lifeSlotConfirmed &&
            candidate.lifeEnhancementText === '' &&
            !candidate.lifeEnhancementConfirmed &&
            !candidate.include &&
            !candidate.reviewed,
        ),
        'Life equipment candidates must remain unassigned and pending',
      );
    }
    if (name === 'gear-pvp') {
      const layout = suggestEquipmentLayout(frames, {
        left: 0,
        top: 0,
        width: info.width,
        height: info.height,
      });
      assert.equal(layout.slots.size, 13);
      const positions = Object.fromEntries(
        [...layout.slots].map(([index, slot]) => [slot, frames[index]]),
      );
      assert.ok(Math.abs(positions.helmet.left - 126) < 3);
      assert.ok(Math.abs(positions.gloves.left - 366) < 3);
      assert.ok(Math.abs(positions.belt.left - 66) < 3);
      assert.ok(layout.statistics[0].crop.left <= 355, 'PA crop truncates its leading digit');
      assert.ok(layout.statistics[0].crop.left + layout.statistics[0].crop.width >= 401);
    }
  });
}
test(
  'private real capture: storage prefixes survive crop and OCR',
  { skip: !enabled },
  async () => {
    verifyPrivateCaptureHashes();
    const sharp = requireApi('sharp');
    const { quantityTextCrop } = load('visible-quantity');
    assert.equal(typeof quantityTextCrop, 'function', 'missing overhang-aware quantity crop');
    const { createWorker, PSM } = requireWeb('tesseract.js');
    const worker = await createWorker('eng', 1, { cachePath: process.env['TEMP'] });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: '0123456789.,kKmM',
      });
      for (const [capture, col, row, left, top, pitch, expected] of [
        [2, 0, 0, 8, 0, 500 / 9, '167.1k'],
        [2, 1, 0, 8, 0, 500 / 9, '708.2k'],
      ]) {
        const file = path.join(privateDirectory, 'armazem-' + capture + '.jpeg');
        const crop = quantityTextCrop(
          { left: left + col * pitch, top: top + row * 56, width: pitch, height: 56 },
          'storage',
        );
        const input = await sharp(file)
          .extract({
            left: Math.floor(crop.left),
            top: Math.floor(crop.top),
            width: Math.ceil(crop.width),
            height: Math.ceil(crop.height),
          })
          .resize({ width: 250 })
          .toBuffer();
        const result = await worker.recognize(input);
        assert.equal(result.data.text.trim(), expected);
      }
    } finally {
      await worker.terminate();
    }
  },
);

test(
  'private real capture: ambiguous warehouse quantities stay reviewable',
  { skip: !enabled },
  async () => {
    verifyPrivateCaptureHashes();
    const sharp = requireApi('sharp');
    const file = path.join(privateDirectory, 'armazem-1.jpeg');
    const { quantityTextCrop, parseVisibleQuantity } = load('visible-quantity');
    const { createWorker, PSM } = requireWeb('tesseract.js');
    const worker = await createWorker('eng', 1, { cachePath: process.env['TEMP'] });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: '0123456789.,kKmM',
      });
      const pitch = 500 / 9;
      for (const [label, col, row, expected] of [
        ['1.4M', 2, 0, '1400000'],
        ['18', 1, 0, '18'],
        ['169.2k', 1, 1, '169200'],
      ]) {
        const crop = quantityTextCrop(
          { left: 8 + col * pitch, top: row * 56.7, width: pitch, height: 56.7 },
          'storage',
        );
        const input = await sharp(file)
          .extract({
            left: Math.floor(crop.left),
            top: Math.floor(crop.top),
            width: Math.ceil(crop.width),
            height: Math.ceil(crop.height),
          })
          .resize({ width: 250 })
          .png()
          .toBuffer();
        const result = await worker.recognize(input);
        const rawText = result.data.text.trim();
        const parsed = parseVisibleQuantity(rawText);
        assert.ok(
          parsed === null || parsed.value === expected,
          `${label} produced an unreviewable quantity: OCR ${JSON.stringify(rawText)} parsed ${JSON.stringify(parsed)}`,
        );
      }
    } finally {
      await worker.terminate();
    }
  },
);

test(
  'private real capture: combat statistic crops retain every digit',
  { skip: !enabled },
  async () => {
    verifyPrivateCaptureHashes();
    const sharp = requireApi('sharp');
    const file = path.join(privateDirectory, 'gear-pvp.jpeg');
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { findEquipmentFrames, suggestEquipmentLayout } = load('equipment-slots');
    const layout = suggestEquipmentLayout(findEquipmentFrames({ ...info, data }), {
      left: 0,
      top: 0,
      width: info.width,
      height: info.height,
    });
    const { createWorker, PSM } = requireWeb('tesseract.js');
    const worker = await createWorker('eng', 1, { cachePath: process.env['TEMP'] });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: '0123456789',
      });
      const values = [];
      for (const { crop } of layout.statistics) {
        const input = await sharp(file)
          .extract({
            left: Math.floor(crop.left),
            top: Math.floor(crop.top),
            width: Math.ceil(crop.width),
            height: Math.ceil(crop.height),
          })
          .resize({ width: 260 })
          .toBuffer();
        const result = await worker.recognize(input);
        values.push(result.data.text.trim());
      }
      assert.deepEqual(values, ['2219', '2183', '816']);
    } finally {
      await worker.terminate();
    }
  },
);
