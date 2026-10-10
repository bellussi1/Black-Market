#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { validateOcrCorpus } from './validate-ocr-corpus.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const typescript = requireWeb('typescript');
const { createWorker, PSM } = requireWeb('tesseract.js');
const sharp = requireApi('sharp');
const allowedScreens = new Set([
  'storage',
  'inventory',
  'mastery',
  'characters',
  'market',
  'other',
]);
const fieldScreens = [
  [/^storage\./, 'storage'],
  [/^inventory\./, 'inventory'],
  [/^mastery\./, 'mastery'],
  [/^character\./, 'characters'],
  [/^market\./, 'market'],
];
const outcomeNames = ['exact', 'unread', 'incorrect', 'ambiguous', 'unsupported'];
const allowedFields = new Set([
  'storage.location',
  'storage.capacity',
  'inventory.usedCapacity',
  'character.carriedWeight',
  'market.load',
  'character.level',
  'character.name',
  'character.className',
  'character.mainAp',
  'character.awakeAp',
  'character.dp',
  ...[
    'gathering',
    'cooking',
    'alchemy',
    'processing',
    'fishing',
    'hunting',
    'training',
    'trading',
    'farming',
    'sailing',
    'barter',
  ].map((skill) => `mastery.${skill}`),
]);

function emptyCounts() {
  return Object.fromEntries(outcomeNames.map((name) => [name, 0]));
}

function safeGroupName(value, allowed) {
  return typeof value === 'string' && allowed.has(value) ? value : 'other';
}

/** Aggregates only screen/field names and outcomes; it never returns OCR text or image paths. */
export function summarizeScreenOcrRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const screen = safeGroupName(row.screen, allowedScreens);
    const field = allowedFields.has(row.field) ? row.field : 'other';
    const key = `${screen}\u0000${field}`;
    const group = groups.get(key) ?? { screen, field, ...emptyCounts() };
    group[outcomeNames.includes(row.outcome) ? row.outcome : 'unread']++;
    groups.set(key, group);
  }
  const byScreenAndField = [...groups.values()].sort((a, b) =>
    `${a.screen}.${a.field}`.localeCompare(`${b.screen}.${b.field}`),
  );
  const totals = emptyCounts();
  for (const group of byScreenAndField)
    for (const name of outcomeNames) totals[name] += group[name];
  return { evaluatedLabels: rows.length, totals, byScreenAndField };
}

async function loadScreenParser() {
  const sourcePath = path.resolve(
    scriptDirectory,
    '../apps/web/src/app/features/scans/screen-recognition.ts',
  );
  const source = await readFile(sourcePath, 'utf8');
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

function mapOcrLines(data, scaleX, scaleY) {
  return (
    data.blocks?.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((line) => {
          const text = line.text.trim();
          const { x0, y0, x1, y1 } = line.bbox;
          if (!text || x1 <= x0 || y1 <= y0) return [];
          return [
            {
              text,
              confidence: Math.max(0, Math.min(100, line.confidence)),
              bounds: {
                left: x0 / scaleX,
                top: y0 / scaleY,
                width: (x1 - x0) / scaleX,
                height: (y1 - y0) / scaleY,
              },
            },
          ];
        }),
      ),
    ) ?? []
  );
}

function parserFieldsFor(field) {
  if (field === 'inventory.usedCapacity') return ['inventoryUsed', 'inventoryCapacity'];
  if (field === 'character.carriedWeight') return ['carriedWeight', 'weightLimit'];
  return [field.replace(/^character\./, '')];
}

function labelScreen(field, screens) {
  const expectedScreen = fieldScreens.find(([pattern]) => pattern.test(field))?.[1];
  return expectedScreen ?? screens[0] ?? 'other';
}

function paneKindsForField(field) {
  if (field.startsWith('storage.')) return ['storage'];
  if (field.startsWith('inventory.')) return ['inventory'];
  if (field.startsWith('mastery.')) return ['mastery'];
  if (field.startsWith('market.')) return ['market'];
  if (field === 'character.name' || field === 'character.level' || field === 'character.className')
    return ['character-roster', 'character-status'];
  if (field === 'character.carriedWeight') return ['inventory', 'character-status', 'equipment'];
  return ['character-status', 'character-roster', 'equipment'];
}

function boundsMatch(candidateBounds, labelBounds) {
  const intersectionWidth = Math.max(
    0,
    Math.min(candidateBounds.left + candidateBounds.width, labelBounds.left + labelBounds.width) -
      Math.max(candidateBounds.left, labelBounds.left),
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(candidateBounds.top + candidateBounds.height, labelBounds.top + labelBounds.height) -
      Math.max(candidateBounds.top, labelBounds.top),
  );
  const intersectionArea = intersectionWidth * intersectionHeight;
  const smallerArea = Math.min(
    candidateBounds.width * candidateBounds.height,
    labelBounds.width * labelBounds.height,
  );
  if (smallerArea > 0 && intersectionArea / smallerArea >= 0.15) return true;

  const candidateCenter = {
    x: candidateBounds.left + candidateBounds.width / 2,
    y: candidateBounds.top + candidateBounds.height / 2,
  };
  const horizontalTolerance = Math.max(14, labelBounds.height * 0.75);
  const verticalTolerance = Math.max(8, labelBounds.height * 0.4);
  return (
    candidateCenter.x >= labelBounds.left - horizontalTolerance &&
    candidateCenter.x <= labelBounds.left + labelBounds.width + horizontalTolerance &&
    candidateCenter.y >= labelBounds.top - verticalTolerance &&
    candidateCenter.y <= labelBounds.top + labelBounds.height + verticalTolerance
  );
}

function sameValue(actual, expected) {
  if (typeof expected === 'number') return typeof actual === 'number' && actual === expected;
  if (typeof expected !== 'string') return actual === expected;
  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, ' ')
      .trim();
  return typeof actual === 'string' && normalize(actual) === normalize(expected);
}

function evaluateLabel(label, candidates, parser) {
  const fields = parserFieldsFor(label.field);
  const matches = candidates.filter((candidate) => fields.includes(candidate.field));
  if (matches.some((candidate) => candidate.status === 'unsupported')) return 'unsupported';
  if (!matches.length) return 'unread';
  if (matches.some((candidate) => candidate.status !== 'candidate')) return 'ambiguous';

  for (const field of fields) {
    const fieldValues = new Set(
      matches
        .filter((candidate) => candidate.field === field)
        .map((candidate) => JSON.stringify([candidate.value, candidate.unit])),
    );
    if (fieldValues.size > 1) return 'ambiguous';
  }

  if (label.field === 'inventory.usedCapacity') {
    const used = matches.find((candidate) => candidate.field === 'inventoryUsed')?.value;
    const total = matches.find((candidate) => candidate.field === 'inventoryCapacity')?.value;
    if (typeof used !== 'number' || typeof total !== 'number') return 'unread';
    const actual = `${used}/${total}`;
    return sameValue(actual, String(label.expectedValue)) ? 'exact' : 'incorrect';
  }

  if (label.field === 'character.carriedWeight') {
    const carried = matches.find((candidate) => candidate.field === 'carriedWeight');
    const limit = matches.find((candidate) => candidate.field === 'weightLimit');
    if (
      typeof carried?.value !== 'number' ||
      typeof limit?.value !== 'number' ||
      carried.unit !== 'LT' ||
      limit.unit !== 'LT'
    )
      return 'unread';
    const expected = parser.parseBdoWeight(String(label.expectedValue));
    if (!expected || expected.unit !== 'LT') return 'ambiguous';
    return carried.value === expected.carried && limit.value === expected.limit
      ? 'exact'
      : 'incorrect';
  }

  const values = new Set(
    matches.map((candidate) => JSON.stringify([candidate.value, candidate.unit])),
  );
  if (values.size > 1) return 'ambiguous';
  const candidate = matches[0];
  if (candidate.value === null) return 'unread';
  return sameValue(candidate.value, label.expectedValue) ? 'exact' : 'incorrect';
}

async function run(manifestPath) {
  const { captures } = await validateOcrCorpus(manifestPath);
  const absoluteManifest = path.resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, 'utf8'));
  const parser = await loadScreenParser();
  const worker = await createWorker('por', 1);
  const rows = [];
  const paneSources = { detected: 0, manifestFallback: 0 };
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });
    for (const capture of manifest.captures) {
      const imagePath = path.resolve(path.dirname(absoluteManifest), capture.path);
      const originalImage = await readFile(imagePath);
      const coordinateScale = parser.screenOcrScale(capture.width, capture.height);
      const scaledWidth = Math.round(capture.width * coordinateScale);
      const scaledHeight = Math.round(capture.height * coordinateScale);
      const image =
        coordinateScale > 1
          ? await sharp(originalImage)
              .resize({
                width: scaledWidth,
                height: scaledHeight,
                fit: 'fill',
              })
              .png()
              .toBuffer()
          : originalImage;
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
      const lines = mapOcrLines(data, scaledWidth / capture.width, scaledHeight / capture.height);
      const panes = parser.detectScreenPanes(lines, capture.width, capture.height);
      const evaluationPanes = [];
      for (const kind of capture.screens) {
        if (kind === 'unknown') continue;
        const detected = panes.filter((pane) => pane.kind === kind);
        if (detected.length) {
          paneSources.detected += detected.length;
          evaluationPanes.push(...detected);
        } else {
          paneSources.manifestFallback++;
          evaluationPanes.push({
            kind,
            bounds: { left: 0, top: 0, width: capture.width, height: capture.height },
            confidence: 0,
          });
        }
      }
      const candidatesByPane = evaluationPanes.map((pane) => ({
        kind: pane.kind,
        candidates: parser.parseScreenFields(pane, lines),
      }));
      for (const label of capture.labels) {
        if (label.status !== 'verified') continue;
        const screen = labelScreen(label.field, capture.screens);
        const expectedKinds = paneKindsForField(label.field);
        const candidates = candidatesByPane
          .filter((group) => expectedKinds.includes(group.kind))
          .flatMap((group) => group.candidates)
          .filter((candidate) => boundsMatch(candidate.bounds, label.bounds));
        rows.push({
          screen,
          field: label.field,
          outcome: evaluateLabel(label, candidates, parser),
        });
      }
    }
  } finally {
    await worker.terminate();
  }
  return { captures, paneSources, ...summarizeScreenOcrRows(rows) };
}

const manifestPath = process.argv[2];
if (!manifestPath || process.argv.includes('--help')) {
  process.stdout.write('Uso: node scripts/validate-screen-ocr.mjs <caminho-do-manifesto>\n');
  process.exitCode = manifestPath ? 0 : 2;
} else {
  try {
    process.stdout.write(`${JSON.stringify(await run(manifestPath), null, 2)}\n`);
  } catch {
    process.stderr.write(
      'A avaliação OCR local falhou. Confira o manifesto, as dependências e os dados locais de idioma do Tesseract.\n',
    );
    process.exitCode = 1;
  }
}
