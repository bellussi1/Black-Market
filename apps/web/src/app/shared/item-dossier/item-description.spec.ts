import { describe, expect, it } from 'vitest';

import { itemDescriptionLines } from './item-description';

describe('game item descriptions', () => {
  it('preserves game line breaks, paragraph spacing and known semantic colors', () => {
    const lines = itemDescriptionLines(
      'Descrição <PAColor0xff57b4e2>Vida<PAOldColor>.\n\n- <PAColor0xffe9bd23>Efeito confirmado<PAOldColor>',
    );
    expect(lines).toHaveLength(2);
    expect(lines[0].parts).toContainEqual({ text: 'Vida', tone: 'info' });
    expect(lines[1]).toMatchObject({ breakBefore: true, bullet: true });
    expect(lines[1].parts).toContainEqual({ text: 'Efeito confirmado', tone: 'accent' });
  });
  it('keeps readable text and entities without executing source HTML or arbitrary color attributes', () => {
    const lines = itemDescriptionLines(
      '<script>alert(1)</script><b>Texto &amp; peso</b><br>※ Aviso <PAColor0xff123456>legível<PAOldColor>',
    );
    expect(
      lines
        .map((row) => row.parts.map((part) => part.text).join(''))
        .join(' ')
        .replace(/\s+/g, ' '),
    ).toBe('Texto & peso ※ Aviso legível');
    expect(lines[1].note).toBe(true);
    expect(
      lines
        .flatMap((row) => row.parts)
        .every((part) => ['text', 'info', 'accent', 'positive', 'warning'].includes(part.tone)),
    ).toBe(true);
  });
  it('handles missing descriptions and resolves the known character information label', () => {
    expect(itemDescriptionLines(null)).toEqual([]);
    expect(itemDescriptionLines('Veja {TextBind:TEXTBIND_MY_INFORMATION}')[0].parts[0].text).toBe(
      'Veja Informações do personagem',
    );
  });
});
