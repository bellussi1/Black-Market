import { By } from '@angular/platform-browser';
import { familyProfileSchema } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { LifeEquipmentEditor } from './life-equipment-editor';

describe('Family life equipment editor', () => {
  useMemoryStorage();

  const item: CatalogItem = {
    id: 16479,
    name: 'Enxada Manos',
    description: null,
    grade: 'yellow',
    weight: null,
    category: 'Ferramenta de Vida',
    categories: [],
    icon: null,
  };

  const emptyValue = () => familyProfileSchema.parse({}).lifeEquipment;

  it('adds a selected catalogue item only to the chosen family skill', async () => {
    const value = emptyValue();
    const fixture = await renderComponent(LifeEquipmentEditor, { value });
    const emitted: unknown[] = [];
    fixture.componentInstance.changed.subscribe((next) => emitted.push(next));
    fixture.componentInstance.skill = 'gathering';
    fixture.componentInstance.skillItem = item;
    fixture.componentInstance.skillKind = 'tool';
    fixture.componentInstance.addSkillItem();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      sharedItems: [],
      bySkill: { gathering: [{ catalogItemId: 16479, name: 'Enxada Manos', kind: 'tool' }] },
    });
    expect(value.bySkill.gathering).toEqual([]);
  });

  it('keeps life equipment pickers unrestricted so gear outside recipes is searchable', async () => {
    const fixture = await renderComponent(LifeEquipmentEditor, { value: emptyValue() });
    const select = fixture.nativeElement.querySelector(
      '#life-equipment-shared-kind',
    ) as HTMLSelectElement;

    expect([...select.options].map((option) => option.value)).toEqual([
      'accessory',
      'alchemyStone',
      'purityOrb',
    ]);
    expect(fixture.debugElement.queryAll(By.directive(CatalogItemPicker))).toHaveLength(2);
    expect(
      fixture.debugElement
        .queryAll(By.directive(CatalogItemPicker))
        .every((picker) => picker.componentInstance.scope() === undefined),
    ).toBe(true);
  });

  it('edits and removes one skill item without changing another skill list', async () => {
    const value = emptyValue();
    value.bySkill.gathering = [
      {
        id: 'gathering-item',
        catalogItemId: 16479,
        name: 'Enxada Manos',
        kind: 'tool',
        enhancementText: null,
      },
    ];
    value.bySkill.cooking = [
      {
        id: 'cooking-item',
        catalogItemId: 16481,
        name: 'Utensílio Manos',
        kind: 'tool',
        enhancementText: null,
      },
    ];
    const fixture = await renderComponent(LifeEquipmentEditor, { value });
    const emitted: unknown[] = [];
    fixture.componentInstance.changed.subscribe((next) => emitted.push(next));

    fixture.componentInstance.updateSkillItem('gathering', 'gathering-item', {
      kind: 'artifact',
      slotLabel: 'Mão principal',
      enhancementText: 'TRI',
    });
    fixture.componentInstance.removeSkillItem('gathering', 'gathering-item');

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toMatchObject({
      bySkill: {
        gathering: [{ kind: 'artifact', slotLabel: 'Mão principal', enhancementText: 'TRI' }],
        cooking: [{ id: 'cooking-item' }],
      },
    });
    expect(emitted[1]).toMatchObject({
      bySkill: { gathering: [], cooking: [{ id: 'cooking-item' }] },
    });
    expect(value.bySkill.gathering[0]?.kind).toBe('tool');
  });

  it('blocks additions when the common or selected skill list has reached the 50-item limit', async () => {
    const value = emptyValue();
    value.sharedItems = Array.from({ length: 50 }, (_, index) => ({
      id: `shared-${index}`,
      catalogItemId: 1000 + index,
      name: `Item comum ${index}`,
      kind: 'accessory' as const,
      enhancementText: null,
    }));
    value.bySkill.gathering = Array.from({ length: 50 }, (_, index) => ({
      id: `skill-${index}`,
      catalogItemId: 2000 + index,
      name: `Ferramenta ${index}`,
      kind: 'tool' as const,
      enhancementText: null,
    }));
    const fixture = await renderComponent(LifeEquipmentEditor, { value });
    const emitted: unknown[] = [];
    const editor = fixture.componentInstance;
    editor.changed.subscribe((next) => emitted.push(next));
    editor.sharedItem = { ...item, id: 90001 };
    editor.addSharedItem();
    expect(editor.message()).toMatch(/limite de 50/i);
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(
      buttons.find((button) => button.textContent?.includes('Adicionar item comum'))?.disabled,
    ).toBe(true);

    editor.skillItem = { ...item, id: 90002 };
    editor.addSkillItem();
    expect(editor.message()).toMatch(/limite de 50/i);
    expect(
      buttons.find((button) => button.textContent?.includes('Adicionar à profissão'))?.disabled,
    ).toBe(true);
    expect(emitted).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Limite de 50 itens por lista');
  });
});
