import type { lifeSkills } from '@bdo/calculators';

import type { Crop } from './print-reader';

export interface OcrTextLine {
  text: string;
  confidence: number;
  bounds: Crop;
}

export type ScreenKind =
  | 'storage'
  | 'inventory'
  | 'mastery'
  | 'character-roster'
  | 'character-status'
  | 'equipment'
  | 'market'
  | 'unknown';

export interface ScreenFieldCandidate {
  field: string;
  rawText: string;
  value: string | number | null;
  unit?: 'LT' | 'VT';
  confidence: number;
  bounds: Crop;
  status: 'candidate' | 'ambiguous' | 'missing' | 'unsupported';
}

export interface DetectedScreenPane {
  kind: ScreenKind;
  bounds: Crop;
  confidence: number;
}

const skillAliases: Record<string, (typeof lifeSkills)[number]> = {
  coleta: 'gathering',
  gathering: 'gathering',
  culinaria: 'cooking',
  cooking: 'cooking',
  alquimia: 'alchemy',
  alchemy: 'alchemy',
  processamento: 'processing',
  processing: 'processing',
  pesca: 'fishing',
  fishing: 'fishing',
  caca: 'hunting',
  hunting: 'hunting',
  treinamento: 'training',
  training: 'training',
  comercio: 'trading',
  trading: 'trading',
  cultivo: 'farming',
  farming: 'farming',
  navegacao: 'sailing',
  sailing: 'sailing',
  permuta: 'barter',
  barter: 'barter',
};

const titlePatterns: [ScreenKind, RegExp][] = [
  ['market', /^(?:mercado|market)(?:\s+central)?$/],
  ['mastery', /^(?:minhas informacoes|my information)$/],
  ['character-roster', /^(?:fechar o jogo|character selection)$/],
  ['equipment', /^(?:equipamento|equipment)$/],
  ['storage', /^armazem(?:\s+de\s+(?!mercado\b).+)?$|^storage(?:\s+of\s+.+)?$/],
  ['inventory', /^(?:inventario|inventory)(?:\b.*)?$/],
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function centerX(line: OcrTextLine): number {
  return line.bounds.left + line.bounds.width / 2;
}

function validLine(line: OcrTextLine, width: number, height: number): boolean {
  const { left, top, width: boxWidth, height: boxHeight } = line.bounds;
  return (
    Boolean(line.text.trim()) &&
    Number.isFinite(line.confidence) &&
    [left, top, boxWidth, boxHeight].every(Number.isFinite) &&
    left >= 0 &&
    top >= 0 &&
    boxWidth > 0 &&
    boxHeight > 0 &&
    left + boxWidth <= width &&
    top + boxHeight <= height
  );
}

/** Enlarges small game text while keeping source-coordinate boxes within the image. */
export function screenOcrScale(width: number, height: number): number {
  const longestEdge = Math.max(width, height);
  return longestEdge > 0 ? Math.max(1, Math.min(1.5, 2400 / longestEdge)) : 1;
}

function classifyTitle(text: string): ScreenKind | null {
  const value = normalize(text);
  if (/^armazem\s+de\s+mercado\b/.test(value)) return null;
  if (/^armazem\s+de\s+/.test(value) || /^storage\s+of\s+/.test(value)) return 'storage';
  if (parseBdoWeight(text)?.unit === 'VT') return 'market';
  if (
    parseCharacter({
      text,
      confidence: 100,
      bounds: { left: 0, top: 0, width: 1, height: 1 },
    }).some((entry) => entry.field === 'name')
  )
    return 'character-roster';
  return titlePatterns.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
}

/** Groups recognized window titles into horizontal panes; all returned bounds use image pixels. */
export function detectScreenPanes(
  lines: readonly OcrTextLine[],
  imageWidth: number,
  imageHeight: number,
): DetectedScreenPane[] {
  const detectedAnchors: { line: OcrTextLine; kind: ScreenKind }[] = lines
    .filter((line) => validLine(line, imageWidth, imageHeight))
    .map((line) => ({ line, kind: classifyTitle(line.text) }))
    .filter((entry): entry is { line: OcrTextLine; kind: ScreenKind } => entry.kind !== null)
    .sort((a, b) => centerX(a.line) - centerX(b.line));
  if (!detectedAnchors.some((anchor) => anchor.kind === 'mastery')) {
    const masteryLines = lines.filter((line) =>
      /(?:maestria|mastery)\s*[:\-]?\s*\d{1,4}\b/i.test(normalize(line.text)),
    );
    const skillLines = lines.filter((line) => masterySkill(line.text) !== null);
    if (masteryLines.length >= 2 && skillLines.length >= 2) {
      const evidence = [...masteryLines, ...skillLines];
      const left = Math.min(...evidence.map((line) => line.bounds.left));
      const top = Math.min(...evidence.map((line) => line.bounds.top));
      const right = Math.max(...evidence.map((line) => line.bounds.left + line.bounds.width));
      const bottom = Math.max(...evidence.map((line) => line.bounds.top + line.bounds.height));
      detectedAnchors.push({
        kind: 'mastery',
        line: {
          text: 'Minhas Informações',
          confidence: Math.min(...evidence.map((line) => line.confidence)),
          bounds: { left, top, width: right - left, height: bottom - top },
        },
      });
    }
  }
  detectedAnchors.sort((a, b) => centerX(a.line) - centerX(b.line));
  const topByKind = new Map<ScreenKind, number>();
  for (const anchor of detectedAnchors)
    topByKind.set(
      anchor.kind,
      Math.min(topByKind.get(anchor.kind) ?? Number.POSITIVE_INFINITY, anchor.line.bounds.top),
    );
  const anchors = detectedAnchors.filter(
    (anchor) =>
      anchor.line.bounds.top - (topByKind.get(anchor.kind) ?? 0) <=
      Math.max(36, imageHeight * 0.05),
  );
  const unique: typeof anchors = [];
  for (const anchor of anchors) {
    const duplicate = unique.find(
      (entry) =>
        entry.kind === anchor.kind &&
        Math.abs(centerX(entry.line) - centerX(anchor.line)) <
          Math.max(entry.line.bounds.width, 80),
    );
    if (!duplicate) unique.push(anchor);
  }
  if (!unique.length)
    return [
      {
        kind: 'unknown',
        bounds: { left: 0, top: 0, width: imageWidth, height: imageHeight },
        confidence: 0,
      },
    ];

  const boundaries = [
    unique[0].line.bounds.left,
    ...unique.slice(1).map((entry) => entry.line.bounds.left),
    imageWidth,
  ];
  return unique.map((anchor, index) => {
    const left = boundaries[index];
    const right = boundaries[index + 1];
    const paneLines = lines.filter(
      (line) =>
        validLine(line, imageWidth, imageHeight) && centerX(line) >= left && centerX(line) < right,
    );
    if (!paneLines.length)
      return {
        kind: anchor.kind,
        bounds: { left, top: 0, width: right - left, height: imageHeight },
        confidence: Math.max(0, Math.min(1, anchor.line.confidence / 100)),
      };
    const minX = Math.min(...paneLines.map((line) => line.bounds.left));
    const minY = Math.min(...paneLines.map((line) => line.bounds.top));
    const maxX = Math.max(...paneLines.map((line) => line.bounds.left + line.bounds.width));
    const maxY = Math.max(...paneLines.map((line) => line.bounds.top + line.bounds.height));
    return {
      kind: anchor.kind,
      bounds: { left: minX, top: minY, width: maxX - minX, height: maxY - minY },
      confidence: Math.max(0, Math.min(1, anchor.line.confidence / 100)),
    };
  });
}

function parseLocalizedNumber(text: string): number | null {
  const normalized = text.replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(normalized)) return null;
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  let digits = normalized;
  if (
    decimalIndex >= 0 &&
    normalized.length - decimalIndex - 1 > 0 &&
    normalized.length - decimalIndex - 1 <= 2
  ) {
    digits = `${normalized.slice(0, decimalIndex).replace(/[.,]/g, '')}.${normalized.slice(decimalIndex + 1)}`;
  } else {
    digits = normalized.replace(/[.,]/g, '');
  }
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function parseBdoWeight(
  text: string,
): { carried: number; limit: number; unit: 'LT' | 'VT' } | null {
  const match = text.match(/([\d.,\s]+)\s*\/\s*([\d.,\s]+)\s*(LT|VT)\b/i);
  if (!match) return null;
  const fraction = parseBdoFraction(`${match[1]}/${match[2]}`);
  return fraction ? { ...fraction, unit: match[3].toUpperCase() as 'LT' | 'VT' } : null;
}

function parseBdoFraction(text: string): { carried: number; limit: number } | null {
  const match = text.match(/(?<![\d.,])([\d.,\s]+)\s*\/\s*([\d.,\s]+)(?![\d.,])/);
  if (!match) return null;
  const carried = parseLocalizedNumber(match[1]);
  const limit = parseLocalizedNumber(match[2]);
  if (carried === null || limit === null || limit <= 0 || carried > limit * 2) return null;
  return { carried, limit };
}

export function parseBdoCapacity(text: string): { used: number; total: number } | null {
  if (/\b(?:LT|VT)\b/i.test(text)) return null;
  const match = text.match(/(?<![\d.,])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d.,])/);
  if (!match) return null;
  const used = Number(match[1]);
  const total = Number(match[2]);
  if (total <= 0 || used > total || total > 300) return null;
  return { used, total };
}

function candidate(
  line: OcrTextLine,
  field: string,
  value: string | number | null,
  unit?: 'LT' | 'VT',
  status?: ScreenFieldCandidate['status'],
): ScreenFieldCandidate {
  return {
    field,
    rawText: line.text,
    value,
    ...(unit ? { unit } : {}),
    confidence: line.confidence,
    bounds: line.bounds,
    status: status ?? (line.confidence >= 45 ? 'candidate' : 'ambiguous'),
  };
}

function paneContains(pane: DetectedScreenPane, line: OcrTextLine): boolean {
  const x = centerX(line);
  const y = line.bounds.top + line.bounds.height / 2;
  return (
    x >= pane.bounds.left &&
    x <= pane.bounds.left + pane.bounds.width &&
    y >= pane.bounds.top &&
    y <= pane.bounds.top + pane.bounds.height
  );
}

function masterySkill(text: string): (typeof lifeSkills)[number] | null {
  const value = normalize(text);
  for (const [alias, skill] of Object.entries(skillAliases))
    if (new RegExp(`\\b${alias}\\b`).test(value)) return skill;
  return null;
}

function locationMatches(rowLocation: string, selectedLocation: string): boolean {
  const row = normalize(rowLocation);
  const selected = normalize(selectedLocation);
  return row === selected || row.endsWith(` ${selected}`) || selected.endsWith(` ${row}`);
}

function associatedWeight(
  line: OcrTextLine,
  visibleLines: readonly OcrTextLine[],
): {
  line: OcrTextLine;
  weight: { carried: number; limit: number; unit: 'LT' | 'VT' | null };
} | null {
  const direct = parseBdoWeight(line.text);
  if (direct) return { line, weight: direct };
  const fraction = parseBdoFraction(line.text);
  if (!fraction) return null;
  const amountX = centerX(line);
  const amountY = line.bounds.top + line.bounds.height / 2;
  const labels = visibleLines
    .filter((label) => /^(?:peso|weight)$/i.test(normalize(label.text)))
    .flatMap((label) => {
      const horizontalGap = amountX - centerX(label);
      const verticalGap = Math.abs(amountY - (label.bounds.top + label.bounds.height / 2));
      return horizontalGap > 0 && horizontalGap <= 300 && verticalGap <= 14
        ? [{ label, horizontalGap, verticalGap }]
        : [];
    })
    .sort((a, b) => a.verticalGap - b.verticalGap || a.horizontalGap - b.horizontalGap);
  const label = labels[0]?.label;
  if (!label) return null;
  const left = Math.min(label.bounds.left, line.bounds.left);
  const top = Math.min(label.bounds.top, line.bounds.top);
  const right = Math.max(
    label.bounds.left + label.bounds.width,
    line.bounds.left + line.bounds.width,
  );
  const bottom = Math.max(
    label.bounds.top + label.bounds.height,
    line.bounds.top + line.bounds.height,
  );
  return {
    line: {
      text: `${label.text} · ${line.text}`,
      confidence: Math.min(label.confidence, line.confidence),
      bounds: { left, top, width: right - left, height: bottom - top },
    },
    weight: { ...fraction, unit: null },
  };
}

function masteryRankOrProgress(text: string): boolean {
  const value = normalize(text);
  return (
    /^(?:guru|artesao|artisan|professional|profissional|master|expert|especialista|apprentice|aprendiz|skilled|beginner|iniciante)(?:\s*\.?\s*\d{1,3})?(?:\s+\d{1,3}(?:[.,]\d+)?\s*%)?$/.test(
      value,
    ) || /^\d{1,3}(?:[.,]\d+)?\s*%$/.test(value)
  );
}

function unknownMasteryLabel(text: string): boolean {
  const value = normalize(text);
  if (!value || masterySkill(value) || masteryRankOrProgress(value)) return false;
  if (/(?:maestria|mastery)/.test(value)) {
    const prefix = value
      .split(/(?:maestria|mastery)/, 1)[0]
      .replace(
        /\b(?:guru|artesao|artisan|professional|profissional|master|expert)\s*\.?\s*\d{0,3}\b/g,
        '',
      )
      .replace(/[\d.,:%\s]/g, '');
    return /[a-z]/.test(prefix);
  }
  return /[a-z]{3,}/.test(value);
}

function combineSourceLines(first: OcrTextLine, second: OcrTextLine): OcrTextLine {
  const left = Math.min(first.bounds.left, second.bounds.left);
  const top = Math.min(first.bounds.top, second.bounds.top);
  const right = Math.max(
    first.bounds.left + first.bounds.width,
    second.bounds.left + second.bounds.width,
  );
  const bottom = Math.max(
    first.bounds.top + first.bounds.height,
    second.bounds.top + second.bounds.height,
  );
  return {
    text: `${first.text} · ${second.text}`,
    confidence: Math.min(first.confidence, second.confidence),
    bounds: { left, top, width: right - left, height: bottom - top },
  };
}

function parseMastery(
  line: OcrTextLine,
  visibleLines: readonly OcrTextLine[],
): ScreenFieldCandidate | null {
  const value = normalize(line.text);
  const amount = value.match(/(?:maestria|mastery)\s*[:\-]?\s*(\d{1,4})\b/);
  if (!amount) return null;
  const directSkill = masterySkill(value);
  if (directSkill) return candidate(line, `mastery.${directSkill}`, Number(amount[1]));

  if (unknownMasteryLabel(value))
    return candidate(line, 'mastery.unknown', null, undefined, 'unsupported');

  const amountX = centerX(line);
  const amountY = line.bounds.top + line.bounds.height / 2;
  const sameRowUnknown = visibleLines
    .filter((labelLine) => {
      const horizontalGap = amountX - centerX(labelLine);
      const verticalGap = Math.abs(amountY - (labelLine.bounds.top + labelLine.bounds.height / 2));
      return (
        horizontalGap > 0 &&
        horizontalGap <= 240 &&
        verticalGap <= 12 &&
        unknownMasteryLabel(labelLine.text)
      );
    })
    .sort((a, b) => Math.abs(amountX - centerX(a)) - Math.abs(amountX - centerX(b)));
  if (sameRowUnknown[0])
    return candidate(
      combineSourceLines(sameRowUnknown[0], line),
      'mastery.unknown',
      null,
      undefined,
      'unsupported',
    );

  const nearbySkills = visibleLines
    .flatMap((skillLine) => {
      const skill = masterySkill(skillLine.text);
      if (!skill) return [];
      const horizontalGap = amountX - centerX(skillLine);
      const verticalGap = Math.abs(amountY - (skillLine.bounds.top + skillLine.bounds.height / 2));
      return horizontalGap > 0 && horizontalGap <= 320 && verticalGap <= 28
        ? [{ skill, line: skillLine, horizontalGap, verticalGap }]
        : [];
    })
    .sort((a, b) => a.verticalGap - b.verticalGap || a.horizontalGap - b.horizontalGap);
  const nearest = nearbySkills[0];
  if (!nearest) return candidate(line, 'mastery.unknown', null, undefined, 'unsupported');
  const second = nearbySkills[1];
  if (
    second &&
    second.skill !== nearest.skill &&
    second.verticalGap === nearest.verticalGap &&
    second.horizontalGap === nearest.horizontalGap
  )
    return candidate(line, 'mastery.unknown', null, undefined, 'ambiguous');
  const source = combineSourceLines(nearest.line, line);
  return candidate(source, `mastery.${nearest.skill}`, Number(amount[1]));
}

function parseCharacter(line: OcrTextLine): ScreenFieldCandidate[] {
  const normalized = normalize(line.text);
  const result: ScreenFieldCandidate[] = [];
  const heading = line.text.match(/(?:nv\.?|nivel|level)\s*(\d{1,3})\s+([\p{L}\d_-]{2,40})/iu);
  if (heading) {
    result.push(candidate(line, 'level', Number(heading[1])));
    result.push(candidate(line, 'name', heading[2]));
  } else if (/^(?:nome de personagem|character name)\s*[:\-]?\s*.+$/i.test(normalized)) {
    result.push(candidate(line, 'name', line.text.split(/[:\-]/).slice(1).join(':').trim()));
  }
  if (/(?:classe|class)\s*[:\-]/i.test(line.text))
    result.push(candidate(line, 'className', line.text.split(/[:\-]/).slice(1).join(':').trim()));
  return result;
}

/** Converts only recognized, labeled text into candidates; every candidate keeps its source bounds. */
export function parseScreenFields(
  pane: DetectedScreenPane,
  lines: readonly OcrTextLine[],
): ScreenFieldCandidate[] {
  const candidates: ScreenFieldCandidate[] = [];
  const visible = lines.filter((line) => paneContains(pane, line));
  const storageTitle = visible.find((line) =>
    /^(?:armaz[eé]m\s+de\s+|storage\s+of\s+)/i.test(line.text.trim()),
  );
  const storageLocation = storageTitle?.text
    .trim()
    .match(/^(?:armaz[eé]m\s+de\s+|storage\s+of\s+)(.+)$/i)?.[1]
    .trim();

  for (const line of visible) {
    const raw = line.text.trim();
    const normalized = normalize(raw);
    const parsedWeight = associatedWeight(line, visible);
    const weight = parsedWeight?.weight;
    if (weight) {
      if (weight.unit === 'LT') {
        candidates.push(candidate(parsedWeight.line, 'carriedWeight', weight.carried, 'LT'));
        candidates.push(candidate(parsedWeight.line, 'weightLimit', weight.limit, 'LT'));
      } else if (weight.unit === 'VT') {
        candidates.push(candidate(parsedWeight.line, 'market.load', null, 'VT', 'unsupported'));
      } else {
        candidates.push(
          candidate(parsedWeight.line, 'carriedWeight', weight.carried, undefined, 'ambiguous'),
        );
        candidates.push(
          candidate(parsedWeight.line, 'weightLimit', weight.limit, undefined, 'ambiguous'),
        );
      }
    }

    if (pane.kind === 'storage') {
      const location = raw.match(/(?:armaz[eé]m\s+de\s+)(?!mercado\b)(.+)$/i);
      if (location) candidates.push(candidate(line, 'storage.location', location[1].trim()));
      const capacity = parseBdoCapacity(raw);
      const capacityLocation = raw.match(/^(.+?)\s+\(?\s*\d{1,3}\s*\/\s*\d{1,3}\s*\)?\s*$/)?.[1];
      const separateLocation = visible.find(
        (row) =>
          normalize(row.text) === normalize(storageLocation ?? '') &&
          Math.abs(
            line.bounds.top + line.bounds.height / 2 - (row.bounds.top + row.bounds.height / 2),
          ) <= 14 &&
          centerX(row) < centerX(line),
      );
      if (
        capacity &&
        storageLocation &&
        ((capacityLocation && locationMatches(capacityLocation, storageLocation)) ||
          separateLocation)
      )
        candidates.push(candidate(line, 'storage.capacity', `${capacity.used}/${capacity.total}`));
    }

    if (pane.kind === 'inventory') {
      const capacity = parseBdoCapacity(raw);
      const adjacentInventoryLabel = visible.some(
        (label) =>
          /\b(?:invent[aá]rio|inventory)\b/i.test(label.text) &&
          Math.abs(
            line.bounds.top + line.bounds.height / 2 - (label.bounds.top + label.bounds.height / 2),
          ) <= 14 &&
          centerX(label) < centerX(line) &&
          centerX(line) - centerX(label) <= 300,
      );
      if (capacity && (/\b(?:invent[aá]rio|inventory)\b/i.test(raw) || adjacentInventoryLabel)) {
        candidates.push(candidate(line, 'inventoryUsed', capacity.used));
        candidates.push(candidate(line, 'inventoryCapacity', capacity.total));
      }
    }

    if (pane.kind === 'mastery') {
      const parsed = parseMastery(line, visible);
      if (parsed) candidates.push(parsed);
    }

    if (pane.kind === 'character-roster' || pane.kind === 'character-status') {
      candidates.push(...parseCharacter(line));
      const stat = normalized.match(
        /(?:pa principal|main ap|attack\s*\(ap\))\s*[:\-]?\s*(\d{1,4})\b/,
      );
      if (stat) candidates.push(candidate(line, 'mainAp', Number(stat[1])));
      const awake = normalized.match(
        /(?:pa de despertar|awake(?:ning)? ap)\s*[:\-]?\s*(\d{1,4})\b/,
      );
      if (awake) candidates.push(candidate(line, 'awakeAp', Number(awake[1])));
      const defense = normalized.match(/(?:pd|defense\s*\(dp\))\s*[:\-]?\s*(\d{1,4})\b/);
      if (defense) candidates.push(candidate(line, 'dp', Number(defense[1])));
    }
  }
  return candidates;
}
