import { describe, expect, it } from 'vitest';

import {
  availableInventory,
  characterSchema,
  personalPlanSchema,
  reservationIssues,
} from './personal';
import { emptyWorkspace, workspaceSchema } from './workspace';
describe('Personal planning', () => {
  const plan = (id: string, quantity: number) =>
    personalPlanSchema.parse({
      id,
      name: 'Plano',
      region: 'sa',
      createdAt: '2026-10-08T00:00:00Z',
      status: 'reserved',
      materials: [{ itemId: 1, name: 'Material', quantity }],
    });
  const inventory = [
    { region: 'sa', itemId: 1, name: 'Material', location: 'Velia', quantity: 10 },
  ];
  it('does not reserve the same units twice', () => {
    expect(reservationIssues([plan('a', 6), plan('b', 6)], inventory)).toHaveLength(1);
    expect(availableInventory([plan('a', 6)], inventory)[0].quantity).toBe(4);
    expect(inventory[0].quantity).toBe(10);
  });
  it('keeps markets separated', () => {
    const other = { ...plan('a', 6), region: 'eu' };
    expect(availableInventory([other], inventory)[0].quantity).toBe(10);
  });
  it('rejects duplicate equipment slots', () => {
    expect(
      characterSchema.safeParse({
        id: 'a',
        name: 'Personagem',
        region: 'sa',
        gear: [
          { slot: 'armor', itemId: 1, name: 'Armadura' },
          { slot: 'armor', itemId: 2, name: 'Outra' },
        ],
      }).success,
    ).toBe(false);
  });
  it('accepts existing backups without the new fields', () => {
    const old: Record<string, unknown> = { ...emptyWorkspace() };
    delete old['characters'];
    delete old['personalPlans'];
    expect(workspaceSchema.parse(old).characters).toEqual([]);
  });
});
