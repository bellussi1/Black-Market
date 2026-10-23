import { describe, expect, it } from 'vitest';

import {
  detectScreenPanes,
  lifeEquipmentSkill,
  type OcrTextLine,
  parseScreenFields,
} from './screen-recognition';
const line = (
  text: string,
  left: number,
  top: number,
  width: number,
  height = 16,
): OcrTextLine => ({ text, confidence: 94, bounds: { left, top, width, height } });
describe('real capture recognition regressions (22 October)', () => {
  it('recognizes equipment controls when sparse OCR misses the gold title', () => {
    const lines = [
      line('Bônus de Artefato', 253, 789, 153),
      line('E Bônus de Conjunto', 21, 829, 168),
      line('Ver Cristal Equipado', 245, 839, 168),
    ];
    const [pane] = detectScreenPanes(lines, 444, 884);
    expect(pane.kind).toBe('equipment');
    expect(pane.bounds).toEqual({ left: 0, top: 0, width: 444, height: 884 });
  });
  it('classifies a life equipment pane from its title or one clear skill label', () => {
    const explicit = detectScreenPanes(
      [line('Equipamento de Vida', 20, 12, 190), line('Coleta', 25, 58, 72)],
      400,
      300,
    );
    const generic = detectScreenPanes(
      [line('Equipamento', 20, 12, 120), line('Coleta', 25, 58, 72)],
      400,
      300,
    );

    expect(explicit[0]?.kind).toBe('life-equipment');
    expect(generic[0]?.kind).toBe('life-equipment');
    expect(lifeEquipmentSkill(generic[0]!, [line('Coleta', 25, 58, 72)])).toBe('gathering');
  });
  it('keeps combat equipment controls authoritative and requires one high-confidence skill', () => {
    const combatLines = [
      line('Equipamento', 20, 12, 120),
      line('Coleta', 25, 58, 72),
      line('Bônus de Artefato', 30, 120, 150),
      line('Ver Cristal Equipado', 30, 160, 150),
    ];
    const combat = detectScreenPanes(combatLines, 400, 300);
    const lifePane = {
      kind: 'life-equipment' as const,
      bounds: { left: 0, top: 0, width: 200, height: 220 },
      confidence: 0.9,
    };

    expect(combat[0]?.kind).toBe('equipment');
    expect(lifeEquipmentSkill(lifePane, [line('Coleta', 20, 40, 70, 16)])).toBe('gathering');
    expect(lifeEquipmentSkill(lifePane, [])).toBeNull();
    expect(
      lifeEquipmentSkill(lifePane, [{ ...line('Coleta', 20, 40, 70), confidence: 69 }]),
    ).toBeNull();
    expect(
      lifeEquipmentSkill(lifePane, [line('Coleta', 20, 40, 70), line('Culinária', 20, 70, 90)]),
    ).toBeNull();
    expect(lifeEquipmentSkill(lifePane, [line('Coleta', 250, 40, 70)])).toBeNull();
  });
  it('keeps full-width mastery labels and associates separated columns using text scale', () => {
    const lines = [
      line('Maestria 785', 273, 141, 109),
      line('Coleta (%) e', 21, 137, 149, 27),
      line('Caça', 412, 213, 38, 18),
      line('Maestria 3080', 694, 213, 117),
      line('Navegação', 412, 641, 93, 20),
      line('Maestria 2425', 691, 641, 120),
      line('Permuta', 412, 713, 70),
      line('Maestria O', 725, 713, 86),
    ];
    const [pane] = detectScreenPanes(lines, 832, 933);
    const fields = parseScreenFields(pane, lines);
    expect(fields.find((f) => f.field === 'mastery.gathering')?.value).toBe(785);
    expect(fields.find((f) => f.field === 'mastery.hunting')?.value).toBe(3080);
    expect(fields.find((f) => f.field === 'mastery.sailing')?.value).toBe(2425);
    expect(fields.find((f) => f.field === 'mastery.barter')).toMatchObject({
      value: null,
      status: 'ambiguous',
    });
  });
});
