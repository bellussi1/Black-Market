#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
const allowedScreens = new Set([
  'storage',
  'inventory',
  'mastery',
  'character-roster',
  'character-status',
  'equipment',
  'market',
  'unknown',
]);
const allowedStatuses = new Set(['verified', 'ambiguous', 'occluded', 'not_present']);

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateBounds(bounds, width, height) {
  if (!isRecord(bounds)) return false;
  const { left, top, width: boxWidth, height: boxHeight } = bounds;
  return (
    [left, top, boxWidth, boxHeight].every(Number.isFinite) &&
    left >= 0 &&
    top >= 0 &&
    boxWidth > 0 &&
    boxHeight > 0 &&
    left + boxWidth <= width &&
    top + boxHeight <= height
  );
}

export async function validateOcrCorpus(manifestPath) {
  const absoluteManifest = path.resolve(manifestPath);
  const corpusRoot = path.dirname(absoluteManifest);
  const realCorpusRoot = await realpath(corpusRoot).catch(() => null);
  if (!realCorpusRoot) fail('Diretório do corpus indisponível.');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(absoluteManifest, 'utf8'));
  } catch {
    fail('Manifesto OCR inválido ou indisponível.');
  }
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.captures))
    fail('Esquema do manifesto OCR inválido.');

  const ids = new Set();
  const hashes = new Set();
  let labels = 0;
  for (const capture of manifest.captures) {
    if (!isRecord(capture) || typeof capture.id !== 'string' || !capture.id || ids.has(capture.id))
      fail('Identificador de captura inválido ou repetido.');
    ids.add(capture.id);
    if (
      typeof capture.path !== 'string' ||
      path.isAbsolute(capture.path) ||
      capture.path.split(/[\\/]/).includes('..')
    )
      fail('Caminho de captura inválido.');
    const absoluteImage = path.resolve(corpusRoot, capture.path);
    const relativeImage = path.relative(corpusRoot, absoluteImage);
    if (
      !relativeImage ||
      relativeImage === '..' ||
      relativeImage.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeImage)
    )
      fail('Caminho de captura fora do corpus.');
    if (!/^[a-f0-9]{64}$/i.test(capture.sha256) || hashes.has(capture.sha256.toLowerCase()))
      fail('Hash de captura inválido ou duplicado.');
    hashes.add(capture.sha256.toLowerCase());
    if (
      typeof capture.sessionId !== 'string' ||
      !capture.sessionId ||
      typeof capture.locale !== 'string' ||
      typeof capture.source !== 'string' ||
      capture.split !== 'calibration' ||
      !Array.isArray(capture.screens) ||
      capture.screens.some((screen) => !allowedScreens.has(screen)) ||
      !Array.isArray(capture.labels)
    )
      fail('Metadados de captura inválidos.');

    let image;
    let metadata;
    try {
      const realImage = await realpath(absoluteImage);
      const realRelativeImage = path.relative(realCorpusRoot, realImage);
      if (
        !realRelativeImage ||
        realRelativeImage === '..' ||
        realRelativeImage.startsWith(`..${path.sep}`) ||
        path.isAbsolute(realRelativeImage)
      )
        fail('Caminho de captura fora do corpus.');
      image = await readFile(realImage);
      metadata = await sharp(image).metadata();
    } catch {
      fail('Imagem do corpus inválida ou indisponível.');
    }
    const actualHash = createHash('sha256').update(image).digest('hex');
    if (actualHash !== capture.sha256.toLowerCase()) fail('Hash da imagem não confere.');
    if (
      metadata.width !== capture.width ||
      metadata.height !== capture.height ||
      !Number.isInteger(capture.width) ||
      !Number.isInteger(capture.height)
    )
      fail('Dimensões da imagem não conferem.');

    for (const label of capture.labels) {
      if (
        !isRecord(label) ||
        typeof label.field !== 'string' ||
        typeof label.rawText !== 'string' ||
        !allowedStatuses.has(label.status) ||
        !validateBounds(label.bounds, capture.width, capture.height) ||
        (label.status === 'verified' &&
          typeof label.expectedValue !== 'string' &&
          typeof label.expectedValue !== 'number')
      )
        fail('Rótulo do corpus OCR inválido.');
      labels++;
    }
  }
  return { captures: manifest.captures.length, labels };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  try {
    const report = await validateOcrCorpus(process.argv[2] ?? '');
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Falha na validação.'}\n`);
    process.exitCode = 1;
  }
}
