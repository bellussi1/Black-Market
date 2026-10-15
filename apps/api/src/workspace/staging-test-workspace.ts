import { characterSchema, gearSlots, lifeSkills, reservationIssues } from '@bdo/calculators';
import { emptyWorkspace, type Workspace, workspaceSchema } from '@bdo/calculators/workspace';
import type { CatalogItem, CatalogRecipe } from '@bdo/shared';
import { stagingTestCharacter, stagingTestFamily } from '@bdo/shared';

export type StagingRecipeGroup = 'cooking' | 'alchemy' | 'processing';
export type StagingRecipeFixture = { group: StagingRecipeGroup; recipe: CatalogRecipe };
export type StagingGearItems = Partial<Record<(typeof gearSlots)[number], CatalogItem>>;

const profession = {
  cooking: { label: 'Culinária', skill: 'cooking' },
  alchemy: { label: 'Alquimia', skill: 'alchemy' },
  processing: { label: 'Processamento', skill: 'processing' },
} as const;

function positiveNumber(value: string | null | undefined, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function integerQuantity(value: string | null | undefined): number {
  return Math.max(1, Math.ceil(positiveNumber(value)));
}

function priceFor(index: number, equipment = false): string {
  return String((equipment ? 2_000_000 : 10_000) * (index + 1));
}

function uniqueByIdLimited<T extends { id: string }>(
  current: T[],
  additions: T[],
  limit: number,
): T[] {
  const ids = new Set(current.map((record) => record.id));
  const merged = [...current];
  for (const record of additions) {
    if (merged.length >= limit) break;
    if (ids.has(record.id)) continue;
    ids.add(record.id);
    merged.push(record);
  }
  return merged;
}

function recipeIngredients(fixture: StagingRecipeFixture) {
  return fixture.recipe.inputs.map((part) => ({
    itemId: part.itemId,
    name: part.name,
    quantity: integerQuantity(part.quantity),
    price: '10000',
    recipeId: null,
  }));
}

export function buildStagingTestWorkspace(
  catalogRecipes: readonly StagingRecipeFixture[],
  gearItems: StagingGearItems,
  now = new Date(),
): Workspace {
  for (const group of ['cooking', 'alchemy', 'processing'] as const)
    if (!catalogRecipes.some((entry) => entry.group === group && entry.recipe.inputs.length))
      throw new Error(`O catálogo ativo não contém receita de ${profession[group].label}.`);

  const region = stagingTestCharacter.region;
  const timestamp = now.toISOString();
  const gear = gearSlots.flatMap((slot) => {
    const item = gearItems[slot];
    return item
      ? [
          {
            slot,
            itemId: item.id,
            name: item.name,
            level: slot === 'tool' || slot === 'clothes' ? 18 : slot.includes('ring') ? 5 : 19,
            caphras: 0,
            levelConfirmed: true,
            caphrasConfirmed: true,
          },
        ]
      : [];
  });
  if (gear.length < 3)
    throw new Error('O catálogo ativo não contém equipamento suficiente para o seed.');

  const mainCharacter = characterSchema.parse({
    ...stagingTestCharacter,
    mainAp: 304,
    awakeAp: 306,
    dp: 401,
    gear,
    mastery: {
      ...stagingTestCharacter.mastery,
      gathering: 1100,
      cooking: 1650,
      alchemy: 1450,
      processing: 1300,
      fishing: 850,
      hunting: 700,
    },
  });
  const characters = [
    mainCharacter,
    characterSchema.parse({
      ...mainCharacter,
      id: 'staging-demo-shai',
      name: 'BrisaVale',
      className: 'Shai',
      level: 61,
      mainAp: 285,
      awakeAp: 287,
      dp: 390,
      silver: '450000000',
      mastery: Object.fromEntries(
        lifeSkills.map((skill) => [skill, Math.min(mainCharacter.mastery[skill], 1100)]),
      ),
    }),
    characterSchema.parse({
      ...mainCharacter,
      id: 'staging-demo-gatherer',
      name: 'LuarDourado',
      className: 'Ranger',
      level: 60,
      gear: gear.filter((piece) => ['mainhand', 'offhand', 'tool', 'clothes'].includes(piece.slot)),
      mainAp: 278,
      awakeAp: 280,
      dp: 372,
      silver: '125000000',
      mastery: Object.fromEntries(
        lifeSkills.map((skill) => [
          skill,
          skill === 'gathering' ? 1500 : Math.min(mainCharacter.mastery[skill], 750),
        ]),
      ),
    }),
  ];

  const families = {
    [region]: {
      ...stagingTestFamily,
      lifeSkills: Object.fromEntries(
        lifeSkills.map((skill) => [
          skill,
          {
            tier:
              skill === 'cooking' || skill === 'alchemy'
                ? 'Guru'
                : skill === 'gathering' || skill === 'processing'
                  ? 'Mestre'
                  : 'Artesão',
            level: skill === 'cooking' ? 12 : skill === 'alchemy' ? 10 : 5,
            xpPercent: 35,
          },
        ]),
      ),
      pets: [
        {
          id: 'staging-test-pet',
          name: 'Raposa Dourada',
          tier: 4,
          level: 10,
          skills: 'Coleta, saque',
        },
        {
          id: 'staging-test-pet-2',
          name: 'Coruja de Vale',
          tier: 3,
          level: 10,
          skills: 'Conhecimento',
        },
      ],
      mounts: [
        {
          id: 'staging-test-mount',
          name: 'Brisa de Velia',
          kind: 'Cavalo',
          level: 30,
          notes: 'Montaria sintética de teste.',
        },
        {
          id: 'staging-test-mount-2',
          name: 'Carroça do Vale',
          kind: 'Carroça',
          level: 1,
          notes: 'Veículo sintético de teste.',
        },
      ],
    },
  };

  const recipeRecords = catalogRecipes.map(({ group, recipe }, index) => {
    const output = recipe.outputs[0];
    if (!output) throw new Error(`A receita ${recipe.key} não tem produto de saída.`);
    return {
      itemId: output.itemId,
      id: `staging-saved-recipe-${recipe.key.slice(0, 40)}`,
      name: output.name,
      yield: positiveNumber(output.quantity),
      ingredients: recipeIngredients({ group, recipe }),
      savedAt: timestamp,
      index,
    };
  });

  const items = new Map<
    number,
    { id: number; name: string; category: string; equipment: boolean }
  >();
  for (const { group, recipe } of catalogRecipes) {
    for (const part of [...recipe.inputs, ...recipe.outputs])
      if (!items.has(part.itemId))
        items.set(part.itemId, {
          id: part.itemId,
          name: part.name,
          category: profession[group].label,
          equipment: false,
        });
  }
  for (const piece of gear)
    if (!items.has(piece.itemId))
      items.set(piece.itemId, {
        id: piece.itemId,
        name: piece.name,
        category: 'Equipamento',
        equipment: true,
      });

  const orderedItems = [...items.values()];
  const prices = new Map(
    orderedItems.map((item, index) => [item.id, priceFor(index, item.equipment)]),
  );
  const quotes = orderedItems.map((item, index) => {
    const price = prices.get(item.id)!;
    const observedAt = new Date(now.getTime() - index * 60_000).toISOString();
    return {
      id: `staging-saved-quote-${item.id}`,
      name: item.name,
      category: item.category,
      region,
      price,
      source: 'manual' as const,
      nameLocale: 'pt',
      itemId: item.id,
      subId: null,
      stock: 125 + index * 17,
      observedAt,
      favorite: index < 3,
      history: [
        {
          price: String((BigInt(price) * 95n) / 100n),
          stock: 110 + index * 17,
          observedAt: new Date(now.getTime() - 86_400_000).toISOString(),
          source: 'manual' as const,
        },
        {
          price,
          stock: 125 + index * 17,
          observedAt,
          source: 'manual' as const,
        },
      ],
    };
  });

  const reservedRecipe = catalogRecipes.find((entry) => entry.group === 'cooking')!;
  const reservedQuantities = new Map<number, { name: string; quantity: number }>();
  for (const ingredient of recipeIngredients(reservedRecipe)) {
    const current = reservedQuantities.get(ingredient.itemId);
    reservedQuantities.set(ingredient.itemId, {
      name: ingredient.name,
      quantity: (current?.quantity ?? 0) + ingredient.quantity * 10,
    });
  }
  const reservedMaterials = [...reservedQuantities].map(([itemId, material]) => ({
    itemId,
    name: material.name,
    quantity: material.quantity,
    location: 'Velia',
  }));
  const storageItemIds = new Set(
    catalogRecipes.flatMap(({ recipe }) => recipe.inputs.map((part) => part.itemId)),
  );
  const inventory = [
    ...orderedItems
      .filter((item) => storageItemIds.has(item.id))
      .map((item, index) => ({
        id: `staging-storage-${item.id}`,
        itemId: item.id,
        name: item.name,
        location: index % 2 === 0 ? 'Velia' : 'Heidel',
        quantity: 250 + index * 25,
        target: 100,
        price: prices.get(item.id)!,
        region,
        kind: 'storage' as const,
        updatedAt: timestamp,
      })),
    ...reservedMaterials.map((material) => ({
      id: `staging-reserved-stock-${material.itemId}`,
      ...material,
      quantity: material.quantity,
      target: material.quantity,
      price: prices.get(material.itemId) ?? '10000',
      region,
      kind: 'storage' as const,
      updatedAt: timestamp,
    })),
    ...catalogRecipes
      .filter(
        ({ recipe }, index, all) =>
          all.findIndex(
            ({ recipe: candidate }) => candidate.outputs[0]?.itemId === recipe.outputs[0]?.itemId,
          ) === index,
      )
      .map(({ recipe }, index) => {
        const output = recipe.outputs[0];
        return {
          id: `staging-inventory-${output.itemId}`,
          itemId: output.itemId,
          name: output.name,
          location: 'Inventário · AuroraVale',
          quantity: 12 + index * 5,
          target: 30,
          price: prices.get(output.itemId) ?? '10000',
          region,
          kind: 'inventory' as const,
          characterId: mainCharacter.id,
          updatedAt: timestamp,
        };
      }),
  ];

  const plans = (['cooking', 'alchemy', 'processing'] as const)
    .map((group) => catalogRecipes.find((entry) => entry.group === group)!)
    .map(({ group, recipe }, index) => {
      const output = recipe.outputs[0];
      const materials = recipeIngredients({ group, recipe }).map((ingredient) => ({
        itemId: ingredient.itemId,
        name: ingredient.name,
        quantity: ingredient.quantity * (index === 0 ? 10 : 5),
        location: index === 0 ? 'Velia' : undefined,
      }));
      return {
        id: `staging-plan-${group}-${recipe.key.slice(0, 24)}`,
        name: `${output.name} · demonstração`,
        region,
        status:
          index === 0
            ? ('reserved' as const)
            : index === 1
              ? ('draft' as const)
              : ('completed' as const),
        createdAt: timestamp,
        sourceItemId: output.itemId,
        estimatedProfit: String(3_000_000 + index * 2_000_000),
        minutes: 60 + index * 15,
        materials,
        tasks: [
          {
            id: `staging-plan-task-${group}`,
            label: `Preparar ${profession[group].label.toLocaleLowerCase('pt-BR')}`,
            done: index === 2,
          },
        ],
      };
    });

  const sessions = (['cooking', 'alchemy', 'processing'] as const).map((group, index) => {
    const fixture = catalogRecipes.find((entry) => entry.group === group)!;
    const output = fixture.recipe.outputs[0];
    return {
      id: `staging-session-${group}`,
      createdAt: timestamp,
      region,
      input: {
        taxPercent: 35,
        valuePack: false,
        collectionBonus: 0,
        exempt: false,
        name: `${profession[group].label} · sessão de teste`,
        skill: profession[group].skill,
        mastery: mainCharacter.mastery[profession[group].skill],
        mode: 'active' as const,
        minutes: 60,
        energy: 100,
        cost: String(2_000_000 + index * 1_000_000),
        directIncome: String(5_000_000 + index * 2_000_000),
        items: [
          {
            itemId: output.itemId,
            name: output.name,
            quantity: 100 + index * 50,
            price: prices.get(output.itemId) ?? '10000',
          },
        ],
      },
    };
  });

  const gearInput = {
    mainAp: mainCharacter.mainAp,
    awakeAp: mainCharacter.awakeAp,
    dp: mainCharacter.dp,
    budget: mainCharacter.silver,
    upgrades: [
      {
        id: 'staging-upgrade-weapon',
        name: 'Melhoria de arma · cenário sintético',
        cost: '1500000000',
        mainApGain: 8,
        awakeApGain: 8,
        dpGain: 0,
      },
    ],
  };
  const firstRecipe = recipeRecords[0];
  const firstQuote = quotes[0];
  const gearPresetInput = {
    ...gearInput,
    upgrades: [],
  };
  const presets = [
    {
      id: 'staging-preset-market',
      name: 'Mercado · cotação sintética',
      tool: 'market' as const,
      region,
      savedAt: timestamp,
      input: {
        taxPercent: 35,
        valuePack: false,
        collectionBonus: 0,
        exempt: false,
        price: firstQuote.price,
        quantity: 100,
        cost: '500000',
      },
    },
    {
      id: 'staging-preset-crafting',
      name: `${firstRecipe.name} · cenário sintético`,
      tool: 'crafting' as const,
      region,
      savedAt: timestamp,
      input: {
        taxPercent: 35,
        valuePack: false,
        collectionBonus: 0,
        exempt: false,
        crafts: 100,
        yield: firstRecipe.yield,
        salePrice: prices.get(firstRecipe.itemId) ?? '10000',
        extraCost: '0',
        minutes: 60,
        ingredients: firstRecipe.ingredients.map((ingredient) => ({
          itemId: ingredient.itemId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          owned: 0,
          price: ingredient.price,
        })),
      },
    },
    {
      id: 'staging-preset-gear',
      name: 'Equipamento · cenário sintético',
      tool: 'gear' as const,
      region,
      savedAt: timestamp,
      input: gearPresetInput,
    },
  ];

  const projectRecipe = catalogRecipes.find((entry) => entry.group === 'cooking')!;
  const project = {
    id: 'staging-project-cooking',
    name: `${projectRecipe.recipe.outputs[0].name} · coleta e produção`,
    region,
    materials: recipeIngredients(projectRecipe).map((ingredient) => ({
      itemId: ingredient.itemId,
      name: ingredient.name,
      target: ingredient.quantity * 100,
      price: prices.get(ingredient.itemId) ?? '10000',
    })),
  };
  const buffs = [
    {
      id: 'staging-buff-cooking',
      name: 'Culinária · bônus de teste',
      effect: 'Maestria de Culinária +100',
      group: 'Vida',
      value: 100,
      unit: 'Maestria',
      duration: 60,
      enabled: true,
      startedAt: null,
    },
    {
      id: 'staging-buff-gathering',
      name: 'Coleta · bônus de teste',
      effect: 'Maestria de Coleta +50',
      group: 'Vida',
      value: 50,
      unit: 'Maestria',
      duration: 60,
      enabled: false,
      startedAt: null,
    },
  ];

  const enhancementLog = [
    {
      id: 'staging-enhancement-success',
      createdAt: timestamp,
      region,
      name: 'Aprimoramento · sucesso de teste',
      chance: 30,
      cost: '25000000',
      outcome: 'success' as const,
    },
    {
      id: 'staging-enhancement-failure',
      createdAt: new Date(now.getTime() - 3_600_000).toISOString(),
      region,
      name: 'Aprimoramento · falha de teste',
      chance: 30,
      cost: '25000000',
      outcome: 'failure' as const,
    },
  ];

  const workspace = workspaceSchema.parse({
    ...emptyWorkspace(),
    schemaVersion: 1,
    region,
    demonstration: { version: 'brazil-v1', label: 'Dados sintéticos do staging' },
    activeCharacterId: mainCharacter.id,
    familySilver: '800000000',
    familySilverRegion: region,
    families,
    familyLifeSkills: families[region].lifeSkills,
    characters,
    recipes: recipeRecords.map(({ index: _index, ...recipe }) => recipe),
    quotes,
    inventory,
    personalPlans: plans,
    sessions,
    gear: [
      {
        id: 'staging-gear-pve',
        name: 'Progressão PvE · cenário sintético',
        region,
        input: gearInput,
      },
      {
        id: 'staging-gear-budget',
        name: 'Próximo marco · cenário sintético',
        region,
        input: { ...gearInput, budget: '500000000', upgrades: [] },
      },
    ],
    presets,
    projects: [project],
    buffs,
    buffPresets: [
      {
        id: 'staging-buff-preset-life',
        name: 'Vida · cenário sintético',
        buffIds: buffs.map((buff) => buff.id),
      },
    ],
    enhancementLog,
  });

  return workspace;
}

export function mergeStagingTestWorkspace(existing: Workspace, fixture: Workspace): Workspace {
  const fixtureMain = fixture.characters.find(
    (character) => character.id === stagingTestCharacter.id,
  )!;
  const currentMain = existing.characters.find(
    (character) => character.id === stagingTestCharacter.id,
  );
  const characters = uniqueByIdLimited(existing.characters, fixture.characters, 30).map(
    (character) =>
      character.id !== stagingTestCharacter.id || !currentMain || currentMain.gear.length
        ? character
        : {
            ...fixtureMain,
            ...currentMain,
            mainAp: currentMain.mainAp || fixtureMain.mainAp,
            awakeAp: currentMain.awakeAp || fixtureMain.awakeAp,
            dp: currentMain.dp || fixtureMain.dp,
            gear: fixtureMain.gear,
          },
  );
  const family = existing.families?.[stagingTestCharacter.region];
  const fixtureFamily = fixture.families?.[stagingTestCharacter.region];
  const mergedFamily =
    family && fixtureFamily
      ? {
          ...fixtureFamily,
          ...family,
          name: family.name.trim() ? family.name : fixtureFamily.name,
          contribution: family.contribution ?? fixtureFamily.contribution,
          energyMax: family.energyMax ?? fixtureFamily.energyMax,
          lifeSkills: { ...fixtureFamily.lifeSkills, ...(family.lifeSkills ?? {}) },
          pets: uniqueByIdLimited(family.pets, fixtureFamily.pets, 50),
          mounts: uniqueByIdLimited(family.mounts, fixtureFamily.mounts, 100),
        }
      : (family ?? fixtureFamily);
  const merged = workspaceSchema.parse({
    ...fixture,
    ...existing,
    activeCharacterId:
      existing.activeCharacterId ??
      (characters.some((character) => character.id === fixture.activeCharacterId)
        ? fixture.activeCharacterId
        : (characters[0]?.id ?? null)),
    familySilver: existing.familySilver === '0' ? fixture.familySilver : existing.familySilver,
    families: {
      ...fixture.families,
      ...existing.families,
      [stagingTestCharacter.region]: mergedFamily,
    },
    familyLifeSkills: {
      ...(fixture.familyLifeSkills ?? {}),
      ...(existing.familyLifeSkills ?? {}),
    },
    characters,
    personalPlans: uniqueByIdLimited(existing.personalPlans, fixture.personalPlans, 200),
    workerEmpires: uniqueByIdLimited(existing.workerEmpires, fixture.workerEmpires, 30),
    quotes: uniqueByIdLimited(existing.quotes, fixture.quotes, 300),
    inventory: uniqueByIdLimited(existing.inventory, fixture.inventory, 4000),
    screenshotImports: uniqueByIdLimited(existing.screenshotImports, fixture.screenshotImports, 60),
    recipes: uniqueByIdLimited(existing.recipes, fixture.recipes, 100),
    gear: uniqueByIdLimited(existing.gear, fixture.gear, 100),
    sessions: uniqueByIdLimited(existing.sessions, fixture.sessions, 500),
    buffs: uniqueByIdLimited(existing.buffs, fixture.buffs, 100),
    presets: uniqueByIdLimited(existing.presets, fixture.presets, 200),
    projects: uniqueByIdLimited(existing.projects, fixture.projects, 100),
    buffPresets: uniqueByIdLimited(existing.buffPresets, fixture.buffPresets, 100),
    enhancementLog: uniqueByIdLimited(existing.enhancementLog, fixture.enhancementLog, 1000),
    demonstration: existing.demonstration ?? fixture.demonstration,
  });
  if (!reservationIssues(merged.personalPlans, merged.inventory).length) return merged;

  const fixtureReservedPlanIds = new Set(
    fixture.personalPlans.filter((plan) => plan.status === 'reserved').map((plan) => plan.id),
  );
  return workspaceSchema.parse({
    ...merged,
    personalPlans: merged.personalPlans.map((plan) =>
      fixtureReservedPlanIds.has(plan.id) ? { ...plan, status: 'draft' } : plan,
    ),
  });
}
