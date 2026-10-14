import { characterSchema, lifeSkills } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';

import { emptyWorkspace, workspaceSchema } from './workspace-models';

export const productionDemoItemIds = [
  1399, 1407, 1409, 1410, 702, 703, 4986, 820936, 821372, 6354, 5960, 5008, 5301, 5025, 9001, 5401,
  6656, 5439, 705047, 705037, 16847, 15101, 22020, 3703,
] as const;

export const productionDemoExplanation =
  'AuroraVale é uma personagem fictícia: Mestre 10 em Alquimia e Culinária, ' +
  'maestrias efetivas de 1.000 e 1.250, 1.500 LT, 2 bilhões de prata e 60 minutos ativos. ' +
  'Quantidades, equipamentos e aprimoramentos são premissas de teste. Identidades dos itens ' +
  'vêm do catálogo regional; preços devem ser consultados no mercado. Rendimentos de culinária, ' +
  'alquimia e processamento seguem as tabelas de maestria; trajes e cristais não são inferidos. ' +
  'O teste fica em memória e preserva seus dados.';

/** Adjustable test measurements, deliberately not claimed as game formulas. */
export const productionDemoCalibrations = {
  alchemy: { seconds: 2 },
  cooking: { seconds: 2 },
  processing: { seconds: 10 },
} as const;

/** Call WorkspaceStore.startDemo to enter this isolated, reversible fixture. */
export function createProductionDemoWorkspace(items: readonly CatalogItem[], region = 'sa') {
  const catalog = new Map(items.map((item) => [item.id, item]));
  const missing = productionDemoItemIds.filter((id) => !catalog.has(id));
  if (missing.length)
    throw new Error('Faltam itens do catálogo para o teste: ' + missing.join(', ') + '.');
  const name = (id: number) => catalog.get(id)!.name;
  const character = characterSchema.parse({
    id: 'production-demo-main',
    name: 'AuroraVale',
    familyName: 'ValeDourado',
    className: 'Guerreiro',
    specialization: 'succession',
    level: 62,
    server: 'Balenos 2',
    region,
    silver: '2000000000',
    energy: 320,
    energyMax: 450,
    contribution: 360,
    inventoryCapacity: 192,
    inventoryUsed: 2,
    weightLimit: 1500,
    carriedWeight: 10,
    activeMinutes: 60,
    afkMinutes: 240,
    mastery: Object.fromEntries(
      lifeSkills.map((skill) => [
        skill,
        skill === 'alchemy' ? 1000 : skill === 'cooking' ? 1250 : 0,
      ]),
    ),
    gear: [
      { slot: 'clothes', itemId: 705047, name: name(705047), level: 18, caphras: 0 },
      { slot: 'tool', itemId: 16847, name: name(16847), level: 18, caphras: 0 },
    ],
    crystals: [{ itemId: 15101, name: name(15101) }],
    pearlOutfits: [{ itemId: 22020, name: name(22020) }],
    activityPresets: [
      {
        id: 'production-demo-cooking',
        name: 'Culinária · teste',
        gear: [{ slot: 'clothes', itemId: 705037, name: name(705037), level: 18, caphras: 0 }],
        crystals: [],
      },
    ],
  });
  const stock = [
    [1399, 100],
    [1409, 300],
    [1410, 100],
    [702, 300],
    [703, 100],
    [4986, 100],
    [820936, 100],
    [821372, 10],
    [6354, 1000],
    [5960, 2000],
    [5008, 2500],
    [5301, 2500],
    [5025, 3000],
    [9001, 500],
    [5401, 500],
    [6656, 500],
    [5439, 500],
    [3703, 1],
  ];
  return workspaceSchema.parse({
    ...emptyWorkspace(),
    region,
    demonstration: { version: 'brazil-v1', label: 'Teste de produção · Família ValeDourado' },
    activeCharacterId: character.id,
    characters: [character],
    families: {
      [region]: {
        name: 'ValeDourado',
        contribution: 360,
        energyMax: 450,
        lifeSkills: {
          alchemy: { tier: 'Mestre', level: 10, xpPercent: 0 },
          cooking: { tier: 'Mestre', level: 10, xpPercent: 0 },
        },
        pets: [],
        mounts: [],
      },
    },
    quotes: [],
    inventory: stock.map(([itemId, quantity], index) => ({
      id: 'production-demo-stock-' + index,
      itemId,
      quantity,
      name: name(itemId),
      location: index % 2 ? 'Heidel' : 'Velia',
      kind: 'storage',
      price: '0',
      target: 0,
      region,
    })),
  });
}
