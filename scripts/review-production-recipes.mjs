// Read-only review of every imported recipe and the currently served production snapshot.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { readExtractorDataset } = require('./dist/catalog/extractor-dataset.js');
const [directory, reportPath, apiBase = 'http://localhost:3000', regionalXmlDirectory] =
  process.argv.slice(2);
if (!directory || !reportPath)
  throw new Error(
    'Usage: node scripts/review-production-recipes.mjs <extraction> <report.json> [api URL]',
  );
const dataset = await readExtractorDataset(resolve(directory), {
  supplementFile: resolve('docs/recipe-supplements/sa-pt-edania-recipes.json'),
  region: 'sa',
  locale: 'pt',
});
const items = new Map(dataset.items.map((item) => [item.id, item]));
const normalize = (name) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
function materials(description) {
  const text = (description ?? '').replace(/<[^>]+>/g, '');
  const section = text.match(/Material de Produ[çc][ãa]o\s*:?\s*\n([\s\S]*)/i)?.[1];
  if (!section) return [];
  const groups = [];
  for (const line of section.split('\n')) {
    if (!line.trim() && groups.length) break;
    const alternatives = [...line.matchAll(/([^+×]+?)\s+[x×]\s*(\d+(?:[.,]\d+)?)/g)].map(
      (match) => ({
        name: normalize(match[1].replace(/^\s*(?:ou\s+|[-•]\s*)/i, '')),
        quantity: Number(match[2].replace(',', '.')),
      }),
    );
    if (alternatives.length) groups.push(alternatives);
    else if (groups.length) break;
  }
  return groups;
}
const byType = {},
  structural = [],
  quantityCandidates = [],
  outputGroups = new Map(),
  compositions = new Map();
for (const recipe of dataset.recipes) {
  const stats = (byType[recipe.type] ??= {
    recipes: 0,
    products: new Set(),
    unknownYields: 0,
    unknownIngredientQuantities: 0,
    comparedToDescription: 0,
  });
  stats.recipes++;
  stats.products.add(recipe.outputItemId);
  stats.unknownYields += Number(recipe.outputQuantity === null);
  stats.unknownIngredientQuantities += recipe.inputs.filter(
    (part) => part.quantity === null,
  ).length;
  const problems = [];
  if (!items.has(recipe.outputItemId)) problems.push('missing output');
  if (!recipe.inputs.length) problems.push('empty inputs');
  for (const part of recipe.inputs) {
    if (!items.has(part.itemId)) problems.push('missing ingredient ' + part.itemId);
    if (part.quantity !== null && (!Number.isFinite(part.quantity) || part.quantity <= 0))
      problems.push('invalid ingredient quantity ' + part.itemId);
  }
  if (
    recipe.outputQuantity !== null &&
    (!Number.isFinite(recipe.outputQuantity) || recipe.outputQuantity <= 0)
  )
    problems.push('invalid yield');
  if (recipe.byproductOfItemId && !items.has(recipe.byproductOfItemId))
    problems.push('missing byproduct parent');
  if (problems.length)
    structural.push({ key: recipe.key, outputId: recipe.outputItemId, problems });
  const sameOutput = outputGroups.get(recipe.outputItemId) ?? [];
  sameOutput.push(recipe);
  outputGroups.set(recipe.outputItemId, sameOutput);
  const signature = JSON.stringify([
    recipe.outputItemId,
    recipe.outputQuantity,
    recipe.type,
    recipe.station,
    recipe.byproductOfItemId,
    [...recipe.inputs].sort((a, b) => a.itemId - b.itemId || (a.quantity ?? 0) - (b.quantity ?? 0)),
  ]);
  const duplicate = compositions.get(signature) ?? [];
  duplicate.push(recipe.key);
  compositions.set(signature, duplicate);
  // Batch conversions and byproducts are not directly comparable to the base tooltip.
  if (!['ALCHEMY', 'COOK'].includes(recipe.type) || recipe.byproductOfItemId) continue;
  const groups = materials(items.get(recipe.outputItemId)?.description);
  if (!groups.length) continue;
  const differences = [];
  let matched = 0;
  for (const part of recipe.inputs) {
    const name = items.get(part.itemId)?.name;
    const alternatives = groups.flat().filter((entry) => entry.name === normalize(name ?? ''));
    if (!alternatives.length) continue;
    matched++;
    if (part.quantity !== null && !alternatives.some((entry) => entry.quantity === part.quantity))
      differences.push({
        ingredientId: part.itemId,
        ingredient: name,
        imported: part.quantity,
        description: [...new Set(alternatives.map((entry) => entry.quantity))],
      });
  }
  if (matched) stats.comparedToDescription++;
  if (differences.length)
    quantityCandidates.push({
      key: recipe.key,
      type: recipe.type,
      outputId: recipe.outputItemId,
      output: items.get(recipe.outputItemId)?.name,
      differences,
    });
}
const missingRecipes = dataset.items
  .filter(
    (item) =>
      materials(item.description).length &&
      /Ferramenta de Alquimia|Utens[ií]lios Culin[aá]rios/i.test(item.description ?? '') &&
      !outputGroups.has(item.id),
  )
  .map((item) => ({ id: item.id, name: item.name }));
const snapshotResponse = await fetch(
  `${apiBase}/api/v1/production/catalog?region=sa&preferredLocale=pt`,
  { signal: AbortSignal.timeout(30000) },
);
if (!snapshotResponse.ok) throw new Error('Production snapshot HTTP ' + snapshotResponse.status);
const snapshot = await snapshotResponse.json();
if (snapshot.dataset?.checksum !== dataset.checksum)
  throw new Error(
    'Active snapshot and extraction checksums differ; do not compare different versions.',
  );
const lifeTypes = new Set([
  'COOK',
  'SIMPLE_COOK',
  'ALCHEMY',
  'SIMPLE_ALCHEMY',
  'HEAT',
  'GRIND',
  'DRY',
  'FIREWOOD',
  'SHAKE',
  'THINNING',
  'ROYALGIFT_COOK',
  'ROYALGIFT_ALCHEMY',
]);
const expected = dataset.recipes.filter((recipe) => lifeTypes.has(recipe.type));
const expectedKeys = new Set(expected.map((recipe) => recipe.key));
const activeKeys = new Set(snapshot.recipes.map((recipe) => recipe.key));
const apiDifferences = [];
for (const recipe of expected)
  if (!activeKeys.has(recipe.key))
    apiDifferences.push({ key: recipe.key, problem: 'missing from API' });
const localByKey = new Map(expected.map((recipe) => [recipe.key, recipe]));
for (const recipe of snapshot.recipes) {
  if (!expectedKeys.has(recipe.key)) {
    apiDifferences.push({ key: recipe.key, problem: 'unexpected API recipe' });
    continue;
  }
  const local = localByKey.get(recipe.key);
  const inputs = recipe.inputs.map((part) => ({
    itemId: part.itemId,
    quantity: part.quantity === null ? null : Number(part.quantity),
  }));
  if (
    JSON.stringify(inputs) !== JSON.stringify(local.inputs) ||
    recipe.outputs.length !== 1 ||
    recipe.outputs[0].itemId !== local.outputItemId ||
    (recipe.outputs[0].quantity === null ? null : Number(recipe.outputs[0].quantity)) !==
      local.outputQuantity ||
    recipe.type !== local.type ||
    (recipe.byproductOfItemId ?? null) !== local.byproductOfItemId
  )
    apiDifferences.push({ key: recipe.key, problem: 'composition differs from extraction' });
}
const unresolvedParents = dataset.recipes
  .filter((recipe) => recipe.byproductOfItemId && !outputGroups.has(recipe.byproductOfItemId))
  .map((recipe) => ({
    key: recipe.key,
    outputId: recipe.outputItemId,
    parentId: recipe.byproductOfItemId,
  }));
let regionalXml = null;
if (regionalXmlDirectory) {
  const files = (await readdir(regionalXmlDirectory)).filter((name) => /^\d+\.xml$/.test(name));
  const localized = [];
  for (let offset = 0; offset < files.length; offset += 32) {
    const batch = await Promise.all(
      files.slice(offset, offset + 32).map(async (file) => ({
        file,
        text: await readFile(resolve(regionalXmlDirectory, file), 'utf8'),
      })),
    );
    for (const { file, text } of batch) {
      const outputId = Number(text.match(/<itemKey>\s*(\d+)\s*<\/itemKey>/)?.[1]);
      if (!items.has(outputId)) continue;
      for (const block of text.matchAll(
        /<(cook|alchemy|manufacture|house)\b([^>]*)>([\s\S]*?)<\/\1>/g,
      )) {
        let type = block[1].toUpperCase();
        const action = block[2].match(/action="MANUFACTURE_([^"]+)"/)?.[1];
        if (action) type = ['ALCHEMY', 'COOK'].includes(action) ? 'SIMPLE_' + action : action;
        if (!lifeTypes.has(type) || type.startsWith('ROYALGIFT')) continue;
        const inputs = new Map();
        for (const entry of block[3].matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
          const itemId = Number(entry[1].match(/<id>\s*(\d+)\s*<\/id>/)?.[1]);
          const quantityText = entry[1].match(/<count>\s*(\d+)\s*<\/count>/)?.[1];
          if (!itemId) continue;
          const quantity = quantityText === undefined ? null : Number(quantityText);
          const old = inputs.get(itemId);
          inputs.set(
            itemId,
            old === undefined
              ? quantity
              : old === null || quantity === null
                ? null
                : old + quantity,
          );
        }
        if (inputs.size)
          localized.push({
            outputId,
            type,
            file,
            inputs: [...inputs]
              .map(([itemId, quantity]) => ({ itemId, quantity }))
              .sort((a, b) => a.itemId - b.itemId),
          });
      }
    }
  }
  const regionalByOutput = new Map();
  for (const recipe of localized) {
    const key = recipe.outputId + '/' + recipe.type;
    const group = regionalByOutput.get(key) ?? [];
    group.push(recipe);
    regionalByOutput.set(key, group);
  }
  const quantityMismatches = [],
    unrepresentedVariants = [],
    noRegionalXml = [];
  let exactMatches = 0;
  for (const recipe of expected.filter((entry) => !entry.type.startsWith('ROYALGIFT'))) {
    const variants = regionalByOutput.get(recipe.outputItemId + '/' + recipe.type) ?? [];
    if (!variants.length) {
      noRegionalXml.push(recipe.key);
      continue;
    }
    const sorted = [...recipe.inputs].sort((a, b) => a.itemId - b.itemId);
    const matchingIds = variants.filter(
      (variant) =>
        JSON.stringify(variant.inputs.map((part) => part.itemId)) ===
        JSON.stringify(sorted.map((part) => part.itemId)),
    );
    if (!matchingIds.length) {
      unrepresentedVariants.push(recipe.key);
      continue;
    }
    if (matchingIds.some((variant) => JSON.stringify(variant.inputs) === JSON.stringify(sorted))) {
      exactMatches++;
      continue;
    }
    quantityMismatches.push({
      key: recipe.key,
      outputId: recipe.outputItemId,
      output: items.get(recipe.outputItemId)?.name,
      type: recipe.type,
      imported: sorted,
      regionalVariants: matchingIds,
    });
  }
  const missingProducts = [...new Set(localized.map((recipe) => recipe.outputId))]
    .filter((id) => !outputGroups.has(id))
    .map((id) => ({
      id,
      name: items.get(id)?.name,
      types: [
        ...new Set(
          localized.filter((recipe) => recipe.outputId === id).map((recipe) => recipe.type),
        ),
      ],
    }));
  regionalXml = {
    filesRead: files.length,
    productionRelations: localized.length,
    exactMatches,
    quantityMismatches,
    missingProducts,
    unrepresentedVariants,
    noRegionalXml,
    note: 'Absent variants or XMLs are coverage gaps, not proof of invalid recipes. Imperial box orientation is excluded from XML quantity comparisons.',
  };
}
for (const stats of Object.values(byType)) stats.products = stats.products.size;
const report = {
  checkedAt: new Date().toISOString(),
  checksum: dataset.checksum,
  activeVersion: snapshot.dataset.version,
  totalRecipes: dataset.recipes.length,
  productionRecipes: expected.length,
  types: byType,
  structural,
  orderEquivalentDuplicates: [...compositions.values()].filter((keys) => keys.length > 1),
  apiDifferences,
  descriptionQuantityCandidates: quantityCandidates,
  missingRecipeCandidates: missingRecipes,
  unresolvedByproductParents: unresolvedParents,
  regionalXml,
  limitations: [
    'Description comparisons cover explicit Material de Produção sections and exact ingredient names only.',
    'Quantity differences are review candidates, not automatic corrections: substitutions and server behavior require validation.',
    'Unknown yields stay unknown; XML and tooltips do not prove live server coverage.',
    'No database, inventory, or catalog records were changed.',
  ],
};
await mkdir(dirname(resolve(reportPath)), { recursive: true });
await writeFile(resolve(reportPath), JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      totalRecipes: report.totalRecipes,
      productionRecipes: report.productionRecipes,
      types: byType,
      structural: structural.length,
      duplicates: report.orderEquivalentDuplicates.length,
      apiDifferences: apiDifferences.length,
      quantityCandidateRecipes: quantityCandidates.length,
      quantityCandidateProducts: new Set(quantityCandidates.map((row) => row.outputId)).size,
      missingRecipes: missingRecipes.length,
      unresolvedByproductParents: unresolvedParents.length,
      regionalXml: regionalXml && {
        files: regionalXml.filesRead,
        relations: regionalXml.productionRelations,
        exactMatches: regionalXml.exactMatches,
        quantityMismatches: regionalXml.quantityMismatches.length,
        affectedProducts: new Set(regionalXml.quantityMismatches.map((recipe) => recipe.outputId))
          .size,
        missingProducts: regionalXml.missingProducts.length,
        unrepresentedVariants: regionalXml.unrepresentedVariants.length,
        noRegionalXml: regionalXml.noRegionalXml.length,
      },
      report: resolve(reportPath),
    },
    null,
    2,
  ),
);
