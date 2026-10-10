import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

const optionalText = z.string().nullish();
const optionalWeight = z.number().finite().nonnegative().nullish();
const marketRef = z.union([z.string(), z.number().int()]).nullish();
const itemReference = z.union([
  z.number().int().positive(),
  z
    .string()
    .regex(/^urn::item:[1-9]\d*$/)
    .transform((value) => Number(value.slice(10)))
    .pipe(z.number().int().positive().safe()),
]);
const gradeNames = ['white', 'green', 'blue', 'yellow', 'red', 'purple'] as const;

const extractedItemSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().nullish(),
    description: optionalText,
    icon: optionalText,
    grade: z.union([z.string(), z.number().int().min(-1).max(5)]).nullish(),
    category: optionalText,
    marketCategory: marketRef,
    marketSubCategory: marketRef,
    weight: optionalWeight,
  })
  .passthrough();

const marketSubCategorySchema = z
  .object({
    id: z.union([z.string(), z.number().int()]),
    name: z.string().trim().min(1),
  })
  .passthrough();

const marketCategorySchema = z
  .object({
    id: z.union([z.string(), z.number().int()]),
    name: z.string().trim().min(1),
    subCategories: z.array(marketSubCategorySchema).default([]),
  })
  .passthrough();

const recipeItemSchema = z
  .object({
    item: itemReference,
    count: z.number().finite().nonnegative().nullish(),
  })
  .passthrough();

const recipeOutputSchema = z.union([
  itemReference,
  z
    .object({
      item: itemReference,
      count: z.number().finite().nonnegative().nullish(),
    })
    .passthrough(),
]);

const extractedRecipeSchema = z
  .object({
    output: recipeOutputSchema,
    type: z.string().trim().min(1),
    station: optionalText,
    inputs: z.array(recipeItemSchema),
    byproductOf: itemReference.nullish(),
  })
  .passthrough();

const extractedFilesSchema = z.object({
  items: z.array(extractedItemSchema).min(1),
  recipes: z.array(extractedRecipeSchema),
  marketCategories: z.array(marketCategorySchema),
});

const recipeSupplementSchema = z.object({
  region: z.string().min(2),
  locale: z.string().min(2),
  extractorChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrls: z.array(z.url().refine((value) => value.startsWith('https://'))).min(1),
  items: z.array(z.object({ id: z.number().int().positive(), name: z.string().min(1) })),
  recipes: z.array(extractedRecipeSchema).min(1),
});

export interface RecipeSupplementOptions {
  supplementFile: string;
  region: string;
  locale: string;
}

export interface ImportCategory {
  id: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
  name: string;
}

export interface ImportItem {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  grade: string | null;
  category: string | null;
  weight: number | null;
  categoryIds: string[];
  sourceData?: Record<string, unknown>;
}

export interface ImportRecipeIngredient {
  itemId: number;
  quantity: number | null;
}

export interface ImportRecipe {
  key: string;
  outputItemId: number;
  outputQuantity: number | null;
  type: string;
  station: string | null;
  inputs: ImportRecipeIngredient[];
  byproductOfItemId?: number | null;
}

export interface ExtractedDataset {
  checksum: string;
  items: ImportItem[];
  categories: ImportCategory[];
  recipes: ImportRecipe[];
}

function refKey(value: string | number): string {
  return String(value).trim().toLocaleLowerCase('en-US');
}

function slugPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function outputItem(output: z.infer<typeof recipeOutputSchema>): {
  itemId: number;
  quantity: number | null;
} {
  if (typeof output === 'number') {
    return { itemId: output, quantity: null };
  }
  return { itemId: output.item, quantity: output.count ?? null };
}

export async function readExtractorDataset(
  inputDirectory: string,
  supplementOptions?: RecipeSupplementOptions,
): Promise<ExtractedDataset> {
  const filenames = ['items.json', 'recipes.json', 'marketcategories.json'] as const;
  const contents = await Promise.all(
    filenames.map((filename) => readFile(join(inputDirectory, filename))),
  );
  const parsedFiles = filenames.map((filename, index) => {
    try {
      return JSON.parse(contents[index].toString('utf8')) as unknown;
    } catch {
      throw new Error(`${filename} não contém JSON válido.`);
    }
  });

  const validation = extractedFilesSchema.safeParse({
    items: parsedFiles[0],
    recipes: parsedFiles[1],
    marketCategories: parsedFiles[2],
  });
  if (!validation.success) {
    const issue = validation.error.issues[0];
    const location = issue?.path.map(String).join('.') || 'dataset';
    throw new Error(
      `Formato do extractor incompatível em ${location}: ${issue?.message ?? 'dados inválidos'}.`,
    );
  }

  const extracted = validation.data;
  const itemIds = new Set(extracted.items.map((item) => item.id));
  if (itemIds.size !== extracted.items.length) {
    throw new Error('items.json contém IDs de item duplicados.');
  }

  const categories: ImportCategory[] = [];
  const mainCategoryIds = new Map<string, string>();
  const mainCategoryNames = new Map<string, string>();
  const subCategoryIds = new Map<string, string>();
  const subCategoryNames = new Map<string, string>();

  extracted.marketCategories.forEach((main, mainIndex) => {
    const mainId = `market:main:${refKey(main.id)}`;
    if (mainCategoryIds.has(refKey(main.id))) {
      throw new Error(
        `marketcategories.json contém a categoria ${String(main.id)} mais de uma vez.`,
      );
    }
    mainCategoryIds.set(refKey(main.id), mainId);
    mainCategoryNames.set(refKey(main.name), mainId);
    categories.push({
      id: mainId,
      parentId: null,
      slug: `market-${slugPart(main.name)}-${slugPart(String(main.id))}`,
      sortOrder: mainIndex,
      name: main.name,
    });

    main.subCategories.forEach((sub, subIndex) => {
      const subId = `market:sub:${refKey(main.id)}:${refKey(sub.id)}`;
      const subKey = `${refKey(main.id)}:${refKey(sub.id)}`;
      if (subCategoryIds.has(subKey)) {
        throw new Error(`marketcategories.json contém subcategoria duplicada ${String(sub.id)}.`);
      }
      subCategoryIds.set(subKey, subId);
      subCategoryNames.set(`${refKey(main.name)}:${refKey(sub.name)}`, subId);
      categories.push({
        id: subId,
        parentId: mainId,
        slug: `market-${slugPart(main.name)}-${slugPart(sub.name)}-${slugPart(String(sub.id))}`,
        sortOrder: mainIndex * 10_000 + subIndex + 1,
        name: sub.name,
      });
    });
  });

  const items: ImportItem[] = extracted.items.map((item) => {
    const mainRef = item.marketCategory;
    const subRef = item.marketSubCategory;
    const mainId =
      mainRef == null
        ? undefined
        : (mainCategoryIds.get(refKey(mainRef)) ?? mainCategoryNames.get(refKey(mainRef)));
    const subId =
      mainId && subRef != null
        ? (subCategoryIds.get(`${refKey(mainRef ?? '')}:${refKey(subRef)}`) ??
          (typeof mainRef === 'string'
            ? subCategoryNames.get(`${refKey(mainRef)}:${refKey(subRef)}`)
            : undefined))
        : undefined;
    return {
      id: item.id,
      name: item.name || `Item #${item.id} (sem nome no cliente)`,
      description: item.description ?? null,
      icon: item.icon ?? null,
      grade:
        typeof item.grade === 'number' ? (gradeNames[item.grade] ?? null) : (item.grade ?? null),
      category: item.category ?? null,
      weight: item.weight ?? null,
      categoryIds: [...new Set([mainId, subId].filter((id): id is string => Boolean(id)))],
      sourceData: item,
    };
  });

  const normalizeRecipe = (recipe: z.infer<typeof extractedRecipeSchema>): ImportRecipe => {
    const output = outputItem(recipe.output);
    const inputs = recipe.inputs.map((input) => ({
      itemId: input.item,
      quantity: input.count || null,
    }));
    if (!itemIds.has(output.itemId)) {
      throw new Error(`Receita produz o item ${output.itemId}, ausente em items.json.`);
    }
    const missingIngredient = inputs.find((input) => !itemIds.has(input.itemId));
    if (missingIngredient) {
      throw new Error(`Receita usa o item ${missingIngredient.itemId}, ausente em items.json.`);
    }
    if (recipe.byproductOf != null && !itemIds.has(recipe.byproductOf)) {
      throw new Error(`Subproduto referencia o item ${recipe.byproductOf}, ausente em items.json.`);
    }
    const canonical = JSON.stringify({
      output: [output.itemId, output.quantity],
      type: recipe.type,
      station: recipe.station ?? null,
      inputs,
      ...(recipe.byproductOf == null ? {} : { byproductOfItemId: recipe.byproductOf }),
    });
    const key = createHash('sha256').update(canonical).digest('hex');
    return {
      key,
      outputItemId: output.itemId,
      outputQuantity: output.quantity,
      type: recipe.type,
      station: recipe.station ?? null,
      inputs,
      byproductOfItemId: recipe.byproductOf ?? null,
    };
  };

  const recipes = extracted.recipes.map(normalizeRecipe);

  const distinctRecipes = new Map(recipes.map((recipe) => [recipe.key, recipe]));
  let checksum = createHash('sha256')
    .update(
      filenames
        .map((filename, index) => `${filename}\0${contents[index].toString('base64')}`)
        .join('\0'),
    )
    .digest('hex');

  if (supplementOptions) {
    const bytes = await readFile(supplementOptions.supplementFile);
    const supplement = recipeSupplementSchema.parse(JSON.parse(bytes.toString('utf8')));
    if (
      supplement.region !== supplementOptions.region ||
      supplement.locale !== supplementOptions.locale
    ) {
      throw new Error('Suplemento de receitas revisado para outra região ou idioma.');
    }
    if (supplement.extractorChecksum !== checksum) {
      throw new Error(
        'O checksum do cliente diverge do suplemento revisado; revise as receitas antes de publicar.',
      );
    }
    const reviewedItems = new Map(supplement.items.map((item) => [item.id, item.name]));
    const itemMap = new Map(items.map((item) => [item.id, item]));
    // A shared name may exist on several item IDs. Every reviewed reference must
    // match the exact installed ID and localized name; never resolve it by name.
    for (const recipe of supplement.recipes) {
      const normalized = normalizeRecipe(recipe);
      const references = [
        normalized.outputItemId,
        ...normalized.inputs.map((input) => input.itemId),
        ...(normalized.byproductOfItemId ? [normalized.byproductOfItemId] : []),
      ];
      for (const id of references) {
        if (!reviewedItems.has(id) || reviewedItems.get(id) !== itemMap.get(id)?.name) {
          throw new Error(`Identidade do item ${id} diverge da receita revisada.`);
        }
      }
      const composition = (value: ImportRecipe) =>
        JSON.stringify({
          output: value.outputItemId,
          type: value.type,
          station: value.station,
          byproductOf: value.byproductOfItemId ?? null,
          inputs: [...value.inputs].sort((a, b) => a.itemId - b.itemId),
        });
      // Client records take priority, including genuinely unknown yields. The
      // supplement fills omissions, rather than changing extracted recipes.
      if (
        [...distinctRecipes.values()].some(
          (value) => composition(value) === composition(normalized),
        )
      )
        continue;
      distinctRecipes.set(normalized.key, normalized);
      const item = itemMap.get(normalized.outputItemId)!;
      const provenance = {
        recipeKey: normalized.key,
        reviewedAt: supplement.reviewedAt,
        sourceUrls: supplement.sourceUrls,
        extractorChecksum: supplement.extractorChecksum,
      };
      const previous = item.sourceData?.['verifiedRecipeSupplements'];
      item.sourceData = {
        ...item.sourceData,
        verifiedRecipeSupplements: [
          ...(Array.isArray(previous) ? (previous as unknown[]) : []),
          provenance,
        ],
      };
    }
    checksum = createHash('sha256')
      .update(`${checksum}\0reviewed-recipes\0`)
      .update(bytes)
      .digest('hex');
  }

  return {
    checksum,
    items,
    categories,
    recipes: [...distinctRecipes.values()],
  };
}
