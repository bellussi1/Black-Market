import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { createProductionDemoWorkspace, productionDemoItemIds } from './production-demo';
import { workspaceSchema } from './workspace-models';

const items: CatalogItem[] = productionDemoItemIds.map((id) => ({
  id,
  name: 'Item real ' + id,
  description: null,
  grade: null,
  weight: null,
  category: null,
  icon: null,
  categories: [],
}));

describe('production test character', () => {
  it('has a schema-valid reversible workspace without invented market prices', () => {
    const scenario = createProductionDemoWorkspace(items);
    expect(workspaceSchema.safeParse(scenario).success).toBe(true);
    expect(scenario.demonstration?.label).toContain('Teste');
    expect(scenario.characters[0].gear[0].itemId).toBe(705047);
    expect(scenario.quotes).toEqual([]);
    expect(scenario.inventory.every((row) => row.price === '0')).toBe(true);
    expect(scenario.inventory.find((row) => row.itemId === 1399)?.quantity).toBe(100);
    expect(scenario.inventory.find((row) => row.itemId === 1409)?.quantity).toBe(300);
  });
  it('uses regional catalog names and fails instead of inventing missing item identities', () => {
    const scenario = createProductionDemoWorkspace(items, 'eu');
    expect(scenario.inventory.every((row) => row.region === 'eu')).toBe(true);
    expect(scenario.characters[0].pearlOutfits?.[0].name).toBe('Item real 22020');
    expect(() => createProductionDemoWorkspace(items.slice(1))).toThrow('1399');
    expect(createProductionDemoWorkspace(items)).toEqual(createProductionDemoWorkspace(items));
  });
});
