import { emptyWorkspace } from '@bdo/calculators/workspace';
import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { buildRecipeProductionInput } from './recipe-production-adapter';
import type { RecipeProductionGraph } from './recipe-production-graph';

const catalogSamples = [
  {
    skill: 'cooking',
    key: '5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0',
    type: 'COOK',
    itemId: 9209,
    name: 'Acompanhamentos Variados',
  },
  {
    skill: 'cooking',
    key: 'fd6c7493f4ce2fed743038717de2df6120561f9423973a65db428168a85b26b4',
    type: 'COOK',
    itemId: 9217,
    name: 'Arroz Frito com Pistache',
  },
  {
    skill: 'cooking',
    key: '100e48997231ee9421f20434968b8458ee9860e867805ac4c3aa0fba98d57370',
    type: 'COOK',
    itemId: 9261,
    name: 'Aveia',
  },
  {
    skill: 'cooking',
    key: 'df86f619605f1c590b534bb297efeaaf8a4e6bde0d01f703124d354fc0f29a1f',
    type: 'COOK',
    itemId: 9401,
    name: 'Bife',
  },
  {
    skill: 'cooking',
    key: '584cec5dc324808ee49aa4cb6792b1dbf0e2b85cc44028f9c346ac1b9c9e49e0',
    type: 'COOK',
    itemId: 9205,
    name: 'Biscoito de Aloés',
  },
  {
    skill: 'alchemy',
    key: '3ffbec535adf5166c3905e78e6609581fc32731fd5976b6c4856926be4a9ebae',
    type: 'ALCHEMY',
    itemId: 664,
    name: 'Elixir de Amizade',
  },
  {
    skill: 'alchemy',
    key: 'b67960d806bdedeb5905f15860bbc0e768c3b25ed3ce9ccd5989616fdfd63a58',
    type: 'ALCHEMY',
    itemId: 670,
    name: 'Elixir de Caça a Humano',
  },
  {
    skill: 'alchemy',
    key: '7e1f345e88900e8c551760121258d47779ce7c3919d3130826d5580f4d61f197',
    type: 'ALCHEMY',
    itemId: 678,
    name: 'Elixir de Caça a Humanoide',
  },
  {
    skill: 'alchemy',
    key: 'b3c0ea77bf24cb8fc16e7ee804e6b4948bcee72e74faf27c25ba2eb665252df4',
    type: 'ALCHEMY',
    itemId: 682,
    name: 'Elixir da Energia',
  },
  {
    skill: 'alchemy',
    key: '4411882f0c02c4e62cbef4e269f7d5c149b24720775a71abc3c120fc82e33f85',
    type: 'ALCHEMY',
    itemId: 683,
    name: 'Elixir de Energia Afluente',
  },
] as const;

function productionInput(sample: (typeof catalogSamples)[number], mastery: number) {
  const recipe: CatalogRecipe = {
    key: sample.key,
    type: sample.type,
    station: null,
    inputs: [],
    outputs: [{ itemId: sample.itemId, name: sample.name, quantity: null }],
  };
  const graph: RecipeProductionGraph = {
    rootRecipe: recipe,
    producerRecipes: [],
    itemIds: [sample.itemId],
    issues: [],
    datasetVersion: 'catalog-fixture',
  };
  return buildRecipeProductionInput(
    graph,
    1,
    emptyWorkspace(),
    new Map(),
    new Map(),
    new Map(),
    new Map(),
    new Date('2026-10-12T12:00:00Z'),
    { masteryOverride: mastery, masterySkill: sample.skill },
  );
}

describe('mastery coverage on real catalog recipes', () => {
  it.each(catalogSamples)('$name responds to $skill mastery', (sample) => {
    const zero = productionInput(sample, 0).estimates[sample.key]?.expectedYield;
    const maximum = productionInput(sample, 3000).estimates[sample.key]?.expectedYield;

    expect(zero).toBe(2.5);
    expect(maximum).toBe(sample.skill === 'cooking' ? 3.647 : 3.438);
    expect(maximum).toBeGreaterThan(zero!);
  });
});
