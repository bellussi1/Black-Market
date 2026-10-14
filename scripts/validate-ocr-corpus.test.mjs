import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import { validateOcrCorpus } from './validate-ocr-corpus.mjs';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
const temporaryDirectories = new Set();

afterEach(async () => {
  await Promise.all(
    [...temporaryDirectories].map((directory) => rm(directory, { recursive: true })),
  );
  temporaryDirectories.clear();
});

async function writeCorpus(captures) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-corpus-'));
  temporaryDirectories.add(root);
  const imageDirectory = path.join(root, 'images');
  await mkdir(imageDirectory);
  const manifestCaptures = [];

  for (const capture of captures) {
    const image = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: { r: manifestCaptures.length + 1, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
    const imagePath = `images/${capture.id}.png`;
    await writeFile(path.join(root, imagePath), image);
    manifestCaptures.push({
      id: capture.id,
      path: imagePath,
      sha256: createHash('sha256').update(image).digest('hex'),
      width: 8,
      height: 8,
      sessionId: capture.sessionId,
      locale: 'pt-BR',
      source: 'user-authorized',
      split: capture.split,
      ...(capture.split === 'evaluation'
        ? {
            authorizationRef:
              capture.authorizationRef === undefined
                ? 'owner-provided-session'
                : capture.authorizationRef,
            authorizedAt: '2026-10-10T12:00:00.000Z',
          }
        : {}),
      screens: ['storage'],
      labels: capture.labels ?? [],
    });
  }

  const manifestPath = path.join(root, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, captures: manifestCaptures }));
  return manifestPath;
}

const verifiedLabel = {
  field: 'storage.location',
  rawText: 'Velia',
  expectedValue: 'Velia',
  status: 'verified',
  bounds: { left: 0, top: 0, width: 4, height: 4 },
};

test('validates calibration and independently labeled evaluation sessions', async () => {
  const manifestPath = await writeCorpus([
    { id: 'calibration', sessionId: 'session-calibration', split: 'calibration' },
    {
      id: 'evaluation',
      sessionId: 'session-evaluation',
      split: 'evaluation',
      labels: [verifiedLabel],
    },
  ]);

  assert.deepEqual(await validateOcrCorpus(manifestPath), {
    captures: 2,
    labels: 1,
    splits: {
      calibration: { captures: 1, labels: 0 },
      evaluation: { captures: 1, labels: 1 },
    },
  });
});

test('rejects a session reused between calibration and evaluation', async () => {
  const manifestPath = await writeCorpus([
    { id: 'calibration', sessionId: 'same-session', split: 'calibration' },
    {
      id: 'evaluation',
      sessionId: 'same-session',
      split: 'evaluation',
      labels: [verifiedLabel],
    },
  ]);

  await assert.rejects(validateOcrCorpus(manifestPath), /sessão.*splits/i);
});

test('requires manually verified ground truth for evaluation captures', async () => {
  const manifestPath = await writeCorpus([
    { id: 'evaluation', sessionId: 'session-evaluation', split: 'evaluation' },
  ]);

  await assert.rejects(validateOcrCorpus(manifestPath), /rótulo verificado/i);
});

test('requires an authorization record for evaluation captures', async () => {
  const manifestPath = await writeCorpus([
    {
      id: 'evaluation',
      sessionId: 'session-evaluation',
      split: 'evaluation',
      authorizationRef: '',
      labels: [verifiedLabel],
    },
  ]);

  await assert.rejects(validateOcrCorpus(manifestPath), /avaliação.*autorização/i);
});
