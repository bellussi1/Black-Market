import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { groupItemOptions } from './item-option-groups';

const item = (id: number, icon: string): CatalogItem => ({
  id,
  name: `Item ${id}`,
  description: null,
  grade: null,
  weight: null,
  category: null,
  categories: [],
  icon,
});

describe('Visual material families', () => {
  it('groups shared blood icons while retaining each exact inventory identity', () => {
    const deer = item(6201, 'New_Icon/03_ETC/07_ProductMaterial/00006201.dds');
    const sheep = item(6202, 'New_Icon/03_ETC/07_ProductMaterial/00006201.dds');
    const wolf = item(6214, 'New_Icon/03_ETC/07_ProductMaterial/00006226.dds');
    const groups = groupItemOptions([wolf, deer, sheep]);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toContain('Sangue tipo 4');
    expect(groups[1].label).toContain('Sangue tipo 1');
    expect(groups[1].items).toEqual([deer, sheep]);
  });
  it('does not infer blood or recipe substitutions from names or a similarly named quest icon', () => {
    const quest = {
      ...item(66715, 'New_Icon/03_ETC/03_Quest_Item/00006201.dds'),
      name: 'Sangue de Cavalo',
    };
    expect(groupItemOptions([quest])[0].label).toBe('Outras sugestões visuais');
    expect(groupItemOptions([])).toEqual([]);
  });
});
