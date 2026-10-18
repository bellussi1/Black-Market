export interface DescriptionPart {
  text: string;
  tone: 'text' | 'info' | 'accent' | 'positive' | 'warning';
}
export interface DescriptionLine {
  parts: DescriptionPart[];
  breakBefore: boolean;
  bullet: boolean;
  note: boolean;
}
export function itemDescriptionLines(description: string | null | undefined): DescriptionLine[] {
  if (!description?.trim()) return [];
  const tones: Record<string, DescriptionPart['tone']> = {
    ff57b4e2: 'info',
    ffe9bd23: 'accent',
    ffffd700: 'accent',
    ff64e6c6: 'positive',
    ff00ff00: 'positive',
    ffff0000: 'warning',
    ffff6c6c: 'warning',
  };
  const decode = (text: string) =>
    text.replace(
      /&(nbsp|amp|lt|gt|quot|#39);/g,
      (entity) =>
        ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[
          entity
        ] ?? entity,
    );
  const source = description
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>|<\/(?:p|div)>/gi, '\n')
    .replace(/<[^>]*>/g, (tag) => (/^<PAColor0x[\da-f]{8}>$|^<PAOldColor>$/i.test(tag) ? tag : ''))
    .replace(/\{TextBind:TEXTBIND_MY_INFORMATION\}/g, 'Informações do personagem');
  const lines: DescriptionLine[] = [];
  let tone: DescriptionPart['tone'] = 'text';
  let breakBefore = false;
  for (const raw of source.split(/\r?\n/)) {
    if (!raw.trim()) {
      breakBefore = true;
      continue;
    }
    const bullet = /^\s*[-•]\s/.test(raw);
    const line = raw.replace(/^\s*[-•]\s+/, '').trim();
    const parts: DescriptionPart[] = [];
    const tokens = /<PAColor0x([\da-f]{8})>|<PAOldColor>/gi;
    let cursor = 0;
    for (const match of line.matchAll(tokens)) {
      if (match.index > cursor) parts.push({ text: decode(line.slice(cursor, match.index)), tone });
      tone = match[1] ? (tones[match[1].toLowerCase()] ?? 'text') : 'text';
      cursor = match.index + match[0].length;
    }
    if (cursor < line.length) parts.push({ text: decode(line.slice(cursor)), tone });
    if (!parts.length) continue;
    lines.push({ parts, breakBefore, bullet, note: parts[0].text.trimStart().startsWith('※') });
    breakBefore = false;
  }
  return lines;
}
