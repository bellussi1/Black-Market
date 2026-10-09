import { characterSchema, lifeSkills } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';

import { emptyWorkspace, workspaceSchema } from './workspace-models';

export const demoItemIds = [
  10010, 10140, 14702, 11101, 11017, 11015, 11103, 11648, 12245, 12053, 11847, 16847, 705517, 15101,
  7001, 7101, 7201, 9002, 9059, 9213, 5301, 5302, 5401, 6214, 7913, 16002, 721003, 9005, 6656,
  16481,
] as const;
const moment = '2026-10-08T12:00:00.000Z';
/** Deterministic scenario. Item identity comes from the current regional catalog; balances and prices are simulated. */
export function createDemoWorkspace(items: readonly CatalogItem[], region = 'sa') {
  const catalog = new Map(items.map((item) => [item.id, item]));
  for (const id of demoItemIds)
    if (!catalog.has(id))
      throw new Error('O catálogo desta região ainda não contém todos os itens da demonstração.');
  const name = (id: number) => catalog.get(id)!.name;
  const mastery = Object.fromEntries(
    lifeSkills.map((skill) => [
      skill,
      (
        {
          cooking: 1250,
          alchemy: 1000,
          gathering: 1100,
          processing: 1050,
          fishing: 850,
          hunting: 700,
          training: 650,
          farming: 0,
          sailing: 400,
          barter: 0,
          trading: 0,
        } as Record<string, number>
      )[skill],
    ]),
  );
  const gear = [
    ['mainhand', 10010, 19],
    ['offhand', 10140, 19],
    ['awakening', 14702, 19],
    ['helmet', 11101, 19],
    ['armor', 11017, 19],
    ['gloves', 11015, 19],
    ['shoes', 11103, 19],
    ['necklace', 11648, 5],
    ['belt', 12245, 5],
    ['ring1', 12053, 5],
    ['ring2', 12053, 5],
    ['earring1', 11847, 5],
    ['earring2', 11847, 5],
    ['tool', 16847, 18],
    ['clothes', 705517, 18],
  ] as const;
  const character = characterSchema.parse({
    id: 'demo-main',
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
    mainAp: 260,
    awakeAp: 262,
    dp: 326,
    inventoryCapacity: 192,
    inventoryUsed: 2,
    weightLimit: 1500,
    carriedWeight: 10,
    activeMinutes: 90,
    afkMinutes: 240,
    mastery,
    gear: gear.map(([slot, itemId, level]) => ({
      slot,
      itemId,
      name: name(itemId),
      level,
      caphras: 0,
    })),
    crystals: [{ itemId: 15101, name: name(15101) }],
  });
  const stock = [
    [7001, 350, 'Velia', 1800],
    [7001, 250, 'Heidel', 1800],
    [7101, 70, 'Heidel', 3000],
    [7201, 15, 'Inventário · AuroraVale', 4000],
    [9002, 80, 'Heidel', 20],
    [9005, 60, 'Heidel', 40],
    [6656, 25, 'Heidel', 1500],
    [16481, 1, 'Heidel', 15000000],
    [9059, 160, 'Heidel', 30],
    [9213, 60, 'Inventário da família', 2500],
    [5301, 30, 'Olvia', 8500],
    [5302, 40, 'Olvia', 9000],
    [5401, 120, 'Olvia', 1500],
    [6214, 450, 'Velia', 9000],
    [7913, 300, 'Velia', 12000],
    [16002, 85, 'Inventário · AuroraVale', 300000],
    [721003, 320, 'Heidel', 2500000],
  ] as const;
  const inventory = stock.map(([itemId, quantity, location, price], i) => ({
    id: 'demo-stock-' + i,
    itemId,
    name: name(itemId),
    quantity,
    location,
    price: String(price),
    target: 0,
    region,
  }));
  const prices = new Map<number, number>(stock.map(([id, , , price]) => [id, price]));
  prices.set(10010, 1500000000);
  prices.set(14702, 1700000000);
  const quotes = [...prices].map(([itemId, price]) => ({
    id: 'demo-quote-' + itemId,
    itemId,
    name: name(itemId),
    category: catalog.get(itemId)?.category || 'Outros',
    price: String(price),
    stock: 1000,
    region,
    source: 'manual' as const,
    observedAt: moment,
    favorite: [9213, 5301, 7001].includes(itemId),
    history: [
      {
        price: String(Math.round(price * 0.95)),
        stock: 900,
        observedAt: '2026-10-07T12:00:00.000Z',
        source: 'manual' as const,
      },
    ],
  }));
  return workspaceSchema.parse({
    ...emptyWorkspace(),
    region,
    demonstration: { version: 'brazil-v1', label: 'Família ValeDourado' },
    activeCharacterId: character.id,
    familySilver: '800000000',
    familySilverRegion: region,
    characters: [
      character,
      characterSchema.parse({
        ...character,
        id: 'demo-alt',
        name: 'BrisaVale',
        className: 'Shai',
        level: 58,
        gear: [],
        mainAp: 0,
        awakeAp: 0,
        dp: 5,
        silver: '150000000',
        energy: 120,
        inventoryUsed: 0,
        carriedWeight: 0,
        mastery: Object.fromEntries(
          lifeSkills.map((skill) => [skill, Math.min(character.mastery[skill], 400)]),
        ),
      }),
    ],
    familyLifeSkills: Object.fromEntries(
      lifeSkills.map((skill) => [
        skill,
        {
          tier:
            skill === 'cooking'
              ? 'Guru'
              : skill === 'alchemy' || skill === 'gathering'
                ? 'Mestre'
                : 'Artesão',
          level: skill === 'cooking' ? 12 : skill === 'gathering' ? 15 : 5,
          xpPercent: 35,
        },
      ]),
    ),
    quotes,
    inventory,
    sessions: [
      {
        id: 'demo-session',
        createdAt: moment,
        region,
        input: {
          name: 'Coleta de carne · exemplo',
          minutes: 60,
          energy: 180,
          cost: '5000000',
          directIncome: '0',
          items: [{ itemId: 7913, name: name(7913), quantity: 3500, price: '12000' }],
        },
      },
    ],
    gear: [
      {
        id: 'demo-upgrade',
        name: 'Melhorias ilustrativas — conferir no jogo',
        region,
        input: {
          mainAp: character.mainAp,
          awakeAp: character.awakeAp,
          dp: character.dp,
          budget: character.silver,
          upgrades: [
            {
              id: 'demo-kzarka',
              name: 'Kzarka TET → PEN (cenário simulado)',
              cost: '1500000000',
              mainApGain: 8,
              awakeApGain: 0,
              dpGain: 0,
            },
          ],
        },
      },
    ],
  });
}
