import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { readExtractorDataset } = require('./dist/catalog/extractor-dataset.js');
const [input, output, previous] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    'Uso: node scripts/audit-recipe-catalog.mjs <extração> <relatório.json> [extração anterior]',
  );
const dataset = await readExtractorDataset(resolve(input));
const provenance = JSON.parse(await readFile(resolve(input, 'provenance.json'), 'utf8'));
const raw = JSON.parse(await readFile(resolve(input, 'recipes.json'), 'utf8'));
const processing = JSON.parse(await readFile(resolve(input, 'manufacture.json'), 'utf8'));
const types = {};
const outputs = new Map(),
  uses = new Map();
const count = (map, id) => map.set(id, (map.get(id) ?? 0) + 1);
for (const recipe of dataset.recipes) {
  const type = (types[recipe.type] ??= { recipes: 0, unknownYields: 0, unknownIngredients: 0 });
  type.recipes++;
  type.unknownYields += Number(recipe.outputQuantity === null);
  type.unknownIngredients += recipe.inputs.filter((row) => row.quantity === null).length;
  count(outputs, recipe.outputItemId);
  for (const id of new Set(recipe.inputs.map((row) => row.itemId))) count(uses, id);
}
const names = new Map(dataset.items.map((item) => [item.id, item.name]));
const large = (map) =>
  [...map]
    .filter(([, total]) => total > 50)
    .sort((a, b) => b[1] - a[1])
    .map(([itemId, total]) => ({ itemId, name: names.get(itemId), total }));
const report = {
  checkedAt: new Date().toISOString(),
  provenance,
  checksum: dataset.checksum,
  items: dataset.items.length,
  rawRecipes: raw.length,
  distinctRecipes: dataset.recipes.length,
  duplicatesRemoved: raw.length - dataset.recipes.length,
  types,
  productsWithRecipes: outputs.size,
  unknownYields: dataset.recipes.filter((r) => r.outputQuantity === null).length,
  subproductRecipes: dataset.recipes.filter((r) => r.byproductOfItemId !== null).length,
  outputItemsAboveOldLimit: large(outputs),
  ingredientItemsAboveOldLimit: large(uses),
  unresolvedProcessingGroups: processing.filter((r) => !r.output && !r.outputs).length,
  limitations: [
    'Cobertura de todas as relações de receitas expostas pelos XMLs do cliente instalado; não prova cobertura de todas as receitas válidas no servidor.',
    'Rendimentos ausentes permanecem desconhecidos. Quantidades de ingredientes extraídas podem divergir das descrições ou do servidor.',
    'Grupos de processamento sem resultado não são convertidos em receitas fabricadas.',
    'Metadados e coleções omitidos explicitamente constam na procedência e não são misturados com outra versão.',
  ],
};
if (previous) {
  const old = await readExtractorDataset(resolve(previous));
  const oldKeys = new Set(old.recipes.map((r) => r.key)),
    newKeys = new Set(dataset.recipes.map((r) => r.key));
  const composition = (recipe) =>
    JSON.stringify({
      output: recipe.outputItemId,
      quantity: recipe.outputQuantity,
      type: recipe.type,
      station: recipe.station,
      inputs: recipe.inputs,
    });
  const oldCompositions = new Set(old.recipes.map(composition));
  const newCompositions = new Set(dataset.recipes.map(composition));
  report.change = {
    previousRecipes: old.recipes.length,
    addedRelations: dataset.recipes.filter((r) => !oldKeys.has(r.key)).length,
    removedRelations: old.recipes.filter((r) => !newKeys.has(r.key)).length,
    previousChecksum: old.checksum,
    addedCompositions: [...newCompositions].filter((key) => !oldCompositions.has(key)).length,
    removedCompositions: [...oldCompositions].filter((key) => !newCompositions.has(key)).length,
    note: 'Mudanças nas chaves incluem metadados de subproduto inferidos pelo extractor; não demonstram mudança de receita no servidor.',
  };
}
await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n');
process.stdout.write(
  JSON.stringify(
    {
      distinctRecipes: report.distinctRecipes,
      unknownYields: report.unknownYields,
      change: report.change,
      report: resolve(output),
    },
    null,
    2,
  ) + '\n',
);
