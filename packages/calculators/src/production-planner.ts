import type { TaxOptions } from './models';
import { retention } from './tools';

export type ProductionQuantity = number | { min: number; max: number } | null;
export interface ProductionRecipe {
  id: string;
  name: string;
  method: string;
  catalogVersion?: string;
  output: { itemId: number; quantity: ProductionQuantity };
  ingredients: { itemId: number; quantity: ProductionQuantity }[];
  byproducts?: { itemId: number; quantity: ProductionQuantity }[];
  /** Maximum number of primary-item units one rare output can satisfy when selected. */
  rareSubstitution?: { itemId: number; ratio: number };
}
export interface ProductionEstimate {
  expectedYield?: number;
  craftSeconds?: number;
  source: 'informed' | 'calibrated' | 'fixed' | 'default';
  /** Duration provenance is independent of a verified fixed output yield. */
  timeSource?: 'default' | 'informed' | 'calibrated';
  contextHash?: string;
  origin?: 'user-confirmed';
}
export type ProductionChoice = 'buy' | 'produce' | 'gather' | 'stock';
export type ProductionScenario = 'buy-all' | 'produce-all' | 'custom' | 'optimized';
export interface ProductionCandidate {
  recipeId: string;
  crafts?: number;
  /** Adds one fixed-size automatic buy/produce search for this recipe. */
  optimizeCrafts?: number;
}
export interface ProductionPlannerInput {
  recipes: ProductionRecipe[];
  catalogVersion?: string;
  recipeAlternativesByItemId?: Record<number, string[]>;
  /** Coverage failures reported by the versioned catalog loader. */
  optimizationIssues?: ProductionIssue[];
  quotes: Record<
    number,
    {
      unitPrice: string;
      available: number | null;
      observedAt: string;
      source: 'market' | 'npc' | 'manual';
      sourceUrl?: string;
    }
  >;
  inventory: { itemId: number; quantity: number; reserved?: number }[];
  estimates: Record<string, ProductionEstimate>;
  candidates: ProductionCandidate[];
  profile: {
    budget: string;
    activeMinutes: number;
    contextHash?: string;
    maxWeight?: number;
    currentWeight?: number;
  };
  tax: TaxOptions;
  now: string;
  maxQuoteAgeMinutes?: number;
  /** Automatic rate optimization checks every feasible batch up to this bound, capped at 10,000. */
  maxCrafts?: number;
  /** Maximum exact decision states for a focused candidate, capped at 10,000. Defaults to 10,000. */
  maxOptimizationStates?: number;
  gatheringEstimates?: Record<number, ProductionEstimate>;
  itemWeights?: Record<number, number>;
  customChoices?: Record<number, ProductionChoice>;
  customRecipes?: Record<number, string>;
  useOwnedInProduction?: boolean;
  /** False for economic simulations independent of current purchasing capacity. Defaults to true. */
  enforcePurchaseLimits?: boolean;
  /** False when market prices are used as valuation references regardless of current stock. */
  enforceMarketAvailability?: boolean;
  byproductValues?: Record<
    string,
    { itemId: number; expectedQuantity: number; unitPrice: string; sell: boolean }[]
  >;
  /** Explicit market-sale choices for leftover outputs of intermediate recipes. */
  surplusSales?: Record<number, boolean>;
  /** Selected intermediate recipes whose rare output can replace ordinary dishes. */
  useRareProcs?: Record<string, boolean>;
}
export interface ProductionIssue {
  code:
    | 'missing-recipe'
    | 'missing-yield'
    | 'missing-quantity'
    | 'missing-time'
    | 'missing-quote'
    | 'stale-quote'
    | 'unknown-availability'
    | 'market-stock'
    | 'stock-shortage'
    | 'cycle'
    | 'calibration-mismatch'
    | 'budget'
    | 'time'
    | 'weight'
    | 'missing-weight'
    | 'optimization-limit'
    | 'invalid-input'
    | 'dataset-mismatch'
    | 'invalid-alternative';
  message: string;
  itemId?: number;
  recipeId?: string;
}
export interface ProductionPlan {
  recipeId: string;
  recipeChoices?: Record<number, string>;
  name: string;
  scenario: ProductionScenario;
  crafts: number;
  output: number | null;
  seconds: number | null;
  /** Exact duration for merging ranked batches without rounding their rates. */
  durationMilliseconds: string | null;
  cashCost: string | null;
  economicCost: string | null;
  grossRevenue: string | null;
  netRevenue: string | null;
  profit: string | null;
  profitPerHour: string | null;
  peakWeight: number | null;
  issues: ProductionIssue[];
  assumptions: string[];
  materials: {
    itemId: number;
    required: number;
    bought: number;
    owned: number;
    produced: number;
    /** Base-item equivalent fulfilled with selected rare outputs. */
    substituted: number;
  }[];
  returns: { itemId: number; quantity: number; sell: boolean }[];
  /** Exact source decisions certified by the optimized scenario. */
  sourceChoices?: Record<number, ProductionChoice>;
  steps: { recipeId: string; crafts: number; output: number; seconds: number | null }[];
}
export interface ProductionOptimizationResult {
  best: ProductionPlan | null;
  bestFound: ProductionPlan | null;
  incompleteAlternatives: { itemId: number; recipeId: string; issues: ProductionIssue[] }[];
  complete: boolean;
  reason:
    | 'complete'
    | 'state-limit'
    | 'missing-data'
    | 'dataset-mismatch'
    | 'cycle'
    | 'invalid-alternative';
  rootRecipesTotal: number;
  rootRecipesEvaluated: number;
  recursiveRecipesEvaluated: number;
  statesVisited: number;
  statesPruned: number;
  catalogVersion: string | null;
}
export interface ProductionPlannerResult {
  optimization: ProductionOptimizationResult | null;
  ranked: ProductionPlan[];
  incomplete: ProductionPlan[];
  best: ProductionPlan | null;
}

/** Descending economic profit/time, with deterministic ties; only complete plans are ranked. */
export function compareProductionPlans(a: ProductionPlan, b: ProductionPlan): number {
  const first = a.durationMilliseconds && a.profit !== null ? BigInt(a.durationMilliseconds) : 0n;
  const second = b.durationMilliseconds && b.profit !== null ? BigInt(b.durationMilliseconds) : 0n;
  if (first <= 0n || second <= 0n) return first > 0n ? -1 : second > 0n ? 1 : 0;
  const difference = BigInt(a.profit!) * second - BigInt(b.profit!) * first;
  return difference === 0n ? a.recipeId.localeCompare(b.recipeId) : difference > 0n ? -1 : 1;
}

const QUANTITY_SCALE = 1_000_000n;
const scaled = (value: number) => BigInt(Math.round(value * Number(QUANTITY_SCALE)));
const unscaled = (value: bigint) => Number(value) / Number(QUANTITY_SCALE);
const ceilDivide = (value: bigint, divisor: bigint) => (value + divisor - 1n) / divisor;
const positive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0 && value <= 1_000_000_000;
const money = (value: string | undefined) => value !== undefined && /^\d{1,24}$/.test(value);
function exactQuantity(value: ProductionQuantity): number | undefined {
  if (typeof value === 'number') return positive(value) ? value : undefined;
  if (value && value.min === value.max && positive(value.min)) return value.min;
  return undefined;
}

/** Money remains integer silver. Quantities use six decimal places, never floating point money. */
export function planProduction(input: ProductionPlannerInput): ProductionPlannerResult {
  const recipes = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
  const producers = new Map<number, ProductionRecipe>();
  for (const recipe of input.recipes) {
    if (!producers.has(recipe.output.itemId)) producers.set(recipe.output.itemId, recipe);
  }
  for (const [id, recipeId] of Object.entries(input.customRecipes ?? {})) {
    const recipe = recipes.get(recipeId);
    if (recipe?.output.itemId === Number(id)) producers.set(Number(id), recipe);
  }
  const tax = retention(input.tax);
  const net = (gross: bigint) => (gross * tax.numerator) / tax.denominator;
  const freshness = (input.maxQuoteAgeMinutes ?? 30) * 60_000;
  const timestamp = Date.parse(input.now);
  const searchLimit = Math.min(input.maxCrafts ?? 10_000, 10_000);
  const durations = new WeakMap<ProductionPlan, bigint>();
  const compareRate = (first: ProductionPlan, second: ProductionPlan) => {
    const difference =
      BigInt(first.profit!) * durations.get(second)! -
      BigInt(second.profit!) * durations.get(first)!;
    return difference === 0n ? 0 : difference > 0n ? 1 : -1;
  };

  function evaluate(
    recipeId: string,
    crafts: number,
    scenario: ProductionScenario,
    optimizedChoices: Record<number, ProductionChoice> = {},
    recipeChoices?: Record<number, string>,
  ): ProductionPlan {
    const root = recipes.get(recipeId);
    const issues: ProductionIssue[] = [];
    const issue = (
      code: ProductionIssue['code'],
      message: string,
      details: { itemId?: number; recipeId?: string } = {},
    ) => {
      if (
        !issues.some(
          (row) =>
            row.code === code &&
            row.itemId === details.itemId &&
            (details.itemId !== undefined || row.recipeId === details.recipeId),
        )
      )
        issues.push({ code, message, ...details });
    };
    const assumptions = new Set<string>([
      'Materiais próprios são avaliados pelo preço de reposição informado; não são gratuitos.',
      'Receita de venda usa o imposto e os bônus informados; a cotação não garante venda imediata.',
      'Tempos e rendimentos seguem as premissas indicadas; valores padrão não são medições pessoais. A maestria só é aplicada quando há regra catalogada.',
    ]);
    const owned = new Map<number, bigint>();
    for (const entry of input.inventory) {
      const available = Math.max(0, entry.quantity - (entry.reserved ?? 0));
      if (!Number.isFinite(available) || available > 1_000_000_000)
        issue('invalid-input', 'Quantidade de estoque inválida.', { itemId: entry.itemId });
      else owned.set(entry.itemId, (owned.get(entry.itemId) ?? 0n) + scaled(available));
    }
    const surplus = new Map<number, bigint>();
    const materials = new Map<
      number,
      {
        itemId: number;
        required: bigint;
        bought: bigint;
        owned: bigint;
        produced: bigint;
        substituted: bigint;
      }
    >();
    const material = (id: number) => {
      let row = materials.get(id);
      if (!row) {
        row = { itemId: id, required: 0n, bought: 0n, owned: 0n, produced: 0n, substituted: 0n };
        materials.set(id, row);
      }
      return row;
    };
    const steps: ProductionPlan['steps'] = [];
    const returns = new Map<number, { quantity: bigint; sell: boolean }>();
    const addReturn = (itemId: number, quantity: bigint, sell: boolean) => {
      if (quantity <= 0n) return;
      const current = returns.get(itemId) ?? { quantity: 0n, sell };
      current.quantity += quantity;
      current.sell ||= sell;
      returns.set(itemId, current);
    };
    const weightSteps: {
      ingredients: { itemId: number; quantity: bigint }[];
      outputs: { itemId: number; quantity: bigint | null }[];
    }[] = [];
    let cashScaled = 0n;
    let economicScaled = 0n;
    let costsKnown = true;
    let totalMilliseconds = 0n;
    let timesKnown = true;
    let output: bigint | null = null;
    let byproductGross = 0n;
    let byproductNet = 0n;
    let surplusGross = 0n;
    let surplusNet = 0n;

    function quote(id: number, buying = false): bigint | null {
      const value = input.quotes[id];
      if (!value || !money(value.unitPrice) || value.unitPrice === '0') {
        issue('missing-quote', 'Informe o preço unitário.', { itemId: id });
        return null;
      }
      if (value.source === 'market') {
        const observed = Date.parse(value.observedAt);
        if (
          !Number.isFinite(timestamp) ||
          !Number.isFinite(observed) ||
          observed > timestamp ||
          timestamp - observed > freshness
        )
          issue('stale-quote', 'Atualize a cotação de mercado.', { itemId: id });
        if (
          buying &&
          input.enforcePurchaseLimits !== false &&
          input.enforceMarketAvailability !== false &&
          (value.available === null || !Number.isFinite(value.available) || value.available < 0)
        )
          issue('unknown-availability', 'Informe a quantidade disponível no mercado.', {
            itemId: id,
          });
      }
      return BigInt(value.unitPrice);
    }

    function purchase(id: number, quantity: bigint) {
      const row = material(id);
      row.bought += quantity;
      const price = quote(id, true);
      if (price === null) costsKnown = false;
      else {
        cashScaled += quantity * price;
        economicScaled += quantity * price;
      }
      const value = input.quotes[id];
      if (
        input.enforcePurchaseLimits !== false &&
        input.enforceMarketAvailability !== false &&
        value?.source === 'market' &&
        value.available !== null &&
        Number.isFinite(value.available) &&
        value.available >= 0 &&
        row.bought > scaled(value.available)
      )
        issue('market-stock', 'O lote exige mais unidades que a oferta de mercado.', {
          itemId: id,
        });
    }

    function useStock(id: number, needed: bigint): bigint {
      const available = owned.get(id) ?? 0n;
      const used = available < needed ? available : needed;
      if (used === 0n) return needed;
      owned.set(id, available - used);
      material(id).owned += used;
      const price = quote(id);
      if (price === null) costsKnown = false;
      else economicScaled += price * used;
      return needed - used;
    }

    function satisfy(
      id: number,
      quantity: bigint,
      path: Set<string>,
      maxRareSubstitutionPerOperation = 3,
    ) {
      const row = material(id);
      row.required += quantity;
      const choice: ProductionChoice =
        scenario === 'buy-all'
          ? 'buy'
          : scenario === 'produce-all'
            ? 'produce'
            : scenario === 'optimized'
              ? (optimizedChoices[id] ?? 'buy')
              : (input.customChoices?.[id] ?? 'buy');
      if (choice === 'buy' && scenario !== 'optimized') {
        purchase(id, quantity);
        return;
      }
      let missing = quantity;
      const made = surplus.get(id) ?? 0n;
      const reused = made < missing ? made : missing;
      missing -= reused;
      surplus.set(id, made - reused);
      if (
        choice === 'stock' ||
        (input.useOwnedInProduction &&
          (scenario === 'produce-all' ||
            scenario === 'optimized' ||
            (scenario === 'custom' && choice !== 'buy')))
      )
        missing = useStock(id, missing);
      if (missing === 0n) return;
      if (choice === 'buy') {
        purchase(id, missing);
        return;
      }
      if (choice === 'stock') {
        issue('stock-shortage', 'O estoque livre não cobre o cenário personalizado.', {
          itemId: id,
        });
        return;
      }
      if (choice === 'gather') {
        const estimate = input.gatheringEstimates?.[id];
        const yieldValue = estimate?.expectedYield;
        const seconds = estimate?.craftSeconds;
        if (!positive(yieldValue) || scaled(yieldValue) === 0n) {
          issue('missing-yield', 'Informe o rendimento esperado da coleta.', { itemId: id });
          costsKnown = false;
        }
        if (!positive(seconds) || Math.round(seconds * 1000) === 0) {
          issue('missing-time', 'Informe os segundos por operação de coleta.', { itemId: id });
          timesKnown = false;
        }
        if (!positive(yieldValue) || scaled(yieldValue) === 0n) return;
        const count = ceilDivide(missing, scaled(yieldValue));
        if (count > 1_000_000_000n) {
          issue('invalid-input', 'A coleta excede o limite de operações.', { itemId: id });
          return;
        }
        const gathered = count * scaled(yieldValue);
        material(id).produced += gathered;
        surplus.set(id, (surplus.get(id) ?? 0n) + gathered - missing);
        if (positive(seconds) && Math.round(seconds * 1000) > 0)
          totalMilliseconds += BigInt(Math.round(seconds * 1000)) * count;
        steps.push({
          recipeId: `gather:${id}`,
          crafts: Number(count),
          output: unscaled(gathered),
          seconds: positive(seconds) ? seconds * Number(count) : null,
        });
        weightSteps.push({ ingredients: [], outputs: [{ itemId: id, quantity: gathered }] });
        assumptions.add(
          `Item ${id}: coleta estimada com rendimento e tempo ${estimate?.source === 'calibrated' ? 'calibrados' : 'informados'}.`,
        );
        return;
      }
      const producer = recipeChoices?.[id] ? recipes.get(recipeChoices[id]) : producers.get(id);
      if (!producer) {
        if (scenario === 'custom' && input.customChoices?.[id] === 'produce')
          issue('missing-recipe', 'Nenhuma receita disponível para produzir este ingrediente.', {
            itemId: id,
          });
        else purchase(id, missing);
        return;
      }
      const rareRatio =
        input.useRareProcs?.[producer.id] && producer.rareSubstitution
          ? Math.min(
              3,
              producer.rareSubstitution.ratio,
              Math.max(1, Math.ceil(maxRareSubstitutionPerOperation)),
            )
          : 0;
      const yieldValue = recipeYieldForDemand(producer, rareRatio);
      if (yieldValue === null) return;
      const count = ceilDivide(missing, yieldValue);
      if (count > 1_000_000_000n) {
        issue('invalid-input', 'A cadeia excede o limite de operações.', { recipeId: producer.id });
        return;
      }
      const produced = produce(producer, Number(count), path, missing, rareRatio);
      if (produced !== null) {
        row.produced += produced;
        surplus.set(id, (surplus.get(id) ?? 0n) + (produced > missing ? produced - missing : 0n));
      }
    }

    function recipeYield(recipe: ProductionRecipe): bigint | null {
      const estimate = input.estimates[recipe.id];
      if (
        (estimate?.source === 'calibrated' || estimate?.timeSource === 'calibrated') &&
        (!estimate.contextHash ||
          !input.profile.contextHash ||
          estimate.contextHash !== input.profile.contextHash)
      )
        issue(
          'calibration-mismatch',
          'Rendimento ou tempo foi calibrado para outro perfil/equipamento.',
          { recipeId: recipe.id },
        );
      const value = estimate?.expectedYield ?? exactQuantity(recipe.output.quantity);
      if (!positive(value) || scaled(value) === 0n) {
        issue('missing-yield', 'Informe o rendimento esperado desta receita.', {
          recipeId: recipe.id,
        });
        costsKnown = false;
        return null;
      }
      if (estimate?.expectedYield !== undefined)
        assumptions.add(`${recipe.name}: rendimento esperado informado de ${value} por operação.`);
      return scaled(value);
    }

    function rareSubstitutionYield(recipe: ProductionRecipe, ratio: number): bigint {
      if (!input.useRareProcs?.[recipe.id] || ratio === 0) return 0n;
      const substitution = recipe.rareSubstitution;
      const byproduct = substitution
        ? recipe.byproducts?.find((part) => part.itemId === substitution.itemId)
        : undefined;
      if (
        !substitution ||
        !byproduct ||
        !Number.isSafeInteger(substitution.itemId) ||
        substitution.itemId < 1 ||
        !Number.isSafeInteger(substitution.ratio) ||
        substitution.ratio < 1 ||
        substitution.ratio > 3
      ) {
        issue('invalid-input', 'A substituição por procs raros está mal configurada.', {
          recipeId: recipe.id,
        });
        return 0n;
      }
      const expected = input.byproductValues?.[recipe.id]?.find(
        (value) => value.itemId === substitution.itemId,
      )?.expectedQuantity;
      const quantity = expected ?? exactQuantity(byproduct.quantity);
      if (!positive(quantity)) {
        issue('missing-yield', 'Informe o rendimento esperado do proc raro.', {
          recipeId: recipe.id,
          itemId: substitution.itemId,
        });
        return 0n;
      }
      return scaled(quantity) * BigInt(ratio);
    }

    function recipeYieldForDemand(
      recipe: ProductionRecipe,
      substitutionRatio: number,
    ): bigint | null {
      const primary = recipeYield(recipe);
      return primary === null ? null : primary + rareSubstitutionYield(recipe, substitutionRatio);
    }

    function produce(
      recipe: ProductionRecipe,
      count: number,
      path: Set<string>,
      requiredQuantity?: bigint,
      substitutionRatio = 0,
    ): bigint | null {
      if (path.has(recipe.id)) {
        issue('cycle', 'A cadeia de ingredientes contém um ciclo.', { recipeId: recipe.id });
        costsKnown = false;
        timesKnown = false;
        return null;
      }
      const yieldValue = recipeYield(recipe);
      if (yieldValue === null) return null;
      const next = new Set(path).add(recipe.id);
      const ingredients: { itemId: number; quantity: bigint }[] = [];
      for (const part of recipe.ingredients) {
        const quantity = exactQuantity(part.quantity);
        if (!quantity || scaled(quantity) === 0n) {
          issue('missing-quantity', 'A quantidade deste ingrediente não é determinada.', {
            recipeId: recipe.id,
            itemId: part.itemId,
          });
          costsKnown = false;
          continue;
        }
        const total = scaled(quantity) * BigInt(count);
        ingredients.push({ itemId: part.itemId, quantity: total });
        satisfy(part.itemId, total, next, quantity);
      }
      const seconds = input.estimates[recipe.id]?.craftSeconds;
      if (!positive(seconds) || Math.round(seconds * 1000) === 0) {
        issue('missing-time', 'Informe os segundos por operação.', { recipeId: recipe.id });
        timesKnown = false;
      } else {
        totalMilliseconds += BigInt(Math.round(seconds * 1000)) * BigInt(count);
        assumptions.add(
          `${recipe.name}: ${seconds} s por operação (${(input.estimates[recipe.id]?.timeSource ?? input.estimates[recipe.id]?.source) === 'default' ? 'tempo padrão estimado, não medido' : (input.estimates[recipe.id]?.timeSource ?? input.estimates[recipe.id]?.source) === 'calibrated' ? 'tempo calibrado para o contexto' : 'tempo informado'}).`,
        );
      }
      const result = yieldValue * BigInt(count);
      const substitution =
        substitutionRatio > 0 && input.useRareProcs?.[recipe.id]
          ? recipe.rareSubstitution
          : undefined;
      const substitutionPart = substitution
        ? recipe.byproducts?.find((part) => part.itemId === substitution.itemId)
        : undefined;
      const substitutionQuantity =
        substitution && substitutionPart
          ? (input.byproductValues?.[recipe.id]?.find(
              (value) => value.itemId === substitution.itemId,
            )?.expectedQuantity ?? exactQuantity(substitutionPart.quantity))
          : undefined;
      const substitutionTotal = positive(substitutionQuantity)
        ? scaled(substitutionQuantity) * BigInt(count)
        : 0n;
      const requiredBeyondPrimary =
        requiredQuantity !== undefined && requiredQuantity > result
          ? requiredQuantity - result
          : 0n;
      const consumedSubstitution =
        substitution &&
        substitutionPart &&
        Number.isSafeInteger(substitution.ratio) &&
        substitutionRatio > 0 &&
        substitutionTotal > 0n &&
        requiredBeyondPrimary > 0n
          ? (() => {
              const requiredUnits = ceilDivide(requiredBeyondPrimary, BigInt(substitutionRatio));
              return requiredUnits < substitutionTotal ? requiredUnits : substitutionTotal;
            })()
          : 0n;
      if (consumedSubstitution > 0n)
        assumptions.add(
          `${recipe.name}: ${unscaled(consumedSubstitution)} unidade(s) de procs raros usadas como ${unscaled(consumedSubstitution * BigInt(substitutionRatio))} unidade(s) do prato normal.`,
        );
      if (consumedSubstitution > 0n)
        material(recipe.output.itemId).substituted +=
          consumedSubstitution * BigInt(substitutionRatio);
      steps.push({
        recipeId: recipe.id,
        crafts: count,
        output: unscaled(result),
        seconds: positive(seconds) ? seconds * count : null,
      });
      weightSteps.push({
        ingredients,
        outputs: [
          { itemId: recipe.output.itemId, quantity: result },
          ...(recipe.byproducts ?? []).map((part) => {
            const expected =
              input.byproductValues?.[recipe.id]?.find((value) => value.itemId === part.itemId)
                ?.expectedQuantity ?? exactQuantity(part.quantity);
            const total = positive(expected) ? scaled(expected) * BigInt(count) : null;
            return {
              itemId: part.itemId,
              quantity:
                total === null
                  ? null
                  : part.itemId === substitution?.itemId
                    ? total - consumedSubstitution
                    : total,
            };
          }),
        ],
      });
      for (const byproduct of input.byproductValues?.[recipe.id] ?? []) {
        const total = positive(byproduct.expectedQuantity)
          ? scaled(byproduct.expectedQuantity) * BigInt(count)
          : 0n;
        const consumed = byproduct.itemId === substitution?.itemId ? consumedSubstitution : 0n;
        const remaining = total > consumed ? total - consumed : 0n;
        if (!byproduct.sell || remaining === 0n) continue;
        if (!positive(byproduct.expectedQuantity) || !money(byproduct.unitPrice)) {
          issue('invalid-input', 'A valoração de subproduto é inválida.', {
            recipeId: recipe.id,
            itemId: byproduct.itemId,
          });
          continue;
        }
        if (!recipe.byproducts?.some((part) => part.itemId === byproduct.itemId)) {
          issue('invalid-input', 'O subproduto informado não pertence à receita.', {
            recipeId: recipe.id,
            itemId: byproduct.itemId,
          });
          continue;
        }
        const gross = (remaining * BigInt(byproduct.unitPrice)) / QUANTITY_SCALE;
        byproductGross += gross;
        byproductNet += net(gross);
        assumptions.add(
          `${recipe.name}: subproduto ${byproduct.itemId} valorizado pelo rendimento e preço explicitamente informados.`,
        );
      }
      for (const byproduct of recipe.byproducts ?? []) {
        const configured = input.byproductValues?.[recipe.id]?.find(
          (value) => value.itemId === byproduct.itemId,
        );
        const quantity = configured?.expectedQuantity ?? exactQuantity(byproduct.quantity);
        if (positive(quantity)) {
          const total = scaled(quantity) * BigInt(count);
          const consumed = byproduct.itemId === substitution?.itemId ? consumedSubstitution : 0n;
          addReturn(
            byproduct.itemId,
            total > consumed ? total - consumed : 0n,
            configured?.sell ?? false,
          );
        }
      }
      return result;
    }

    if (
      !Number.isSafeInteger(crafts) ||
      crafts <= 0 ||
      crafts > 1_000_000_000 ||
      !money(input.profile.budget) ||
      !Number.isFinite(input.profile.activeMinutes) ||
      input.profile.activeMinutes < 0 ||
      (input.maxCrafts !== undefined &&
        (!Number.isSafeInteger(input.maxCrafts) || input.maxCrafts < 1))
    )
      issue('invalid-input', 'Confira o tamanho do lote, a prata e o tempo disponível.');
    else if (!root) issue('missing-recipe', 'Receita não encontrada.', { recipeId });
    else output = produce(root, crafts, new Set());
    const cash = costsKnown ? ceilDivide(cashScaled, QUANTITY_SCALE) : null;
    const economic = costsKnown ? ceilDivide(economicScaled, QUANTITY_SCALE) : null;
    if (
      input.enforcePurchaseLimits !== false &&
      cash !== null &&
      money(input.profile.budget) &&
      cash > BigInt(input.profile.budget)
    )
      issue('budget', 'A prata disponível não cobre as compras do lote.');
    if (
      input.enforcePurchaseLimits !== false &&
      timesKnown &&
      unscaled(totalMilliseconds * 1000n) > input.profile.activeMinutes * 60
    )
      issue('time', 'A cadeia excede o tempo ativo disponível.');

    let peakWeight: number | null = null;
    if (input.itemWeights || input.profile.maxWeight !== undefined) {
      const weight = (id: number, quantity: bigint) => {
        const unit = input.itemWeights?.[id];
        if (unit === undefined || !Number.isFinite(unit) || unit < 0) {
          if (input.profile.maxWeight !== undefined)
            issue('missing-weight', 'Informe o peso deste item para limitar o lote.', {
              itemId: id,
            });
          return null;
        }
        return unit * unscaled(quantity);
      };
      let held = input.profile.currentWeight ?? 0;
      let known = true;
      for (const part of materials.values()) {
        if (part.bought + part.owned === 0n) continue;
        const amount = weight(part.itemId, part.bought + part.owned);
        if (amount === null) known = false;
        else held += amount;
      }
      let peak = held;
      for (const step of weightSteps) {
        for (const part of step.ingredients) {
          const amount = weight(part.itemId, part.quantity);
          if (amount === null) known = false;
          else held -= amount;
        }
        for (const part of step.outputs) {
          if (part.quantity === null) {
            known = false;
            if (input.profile.maxWeight !== undefined)
              issue(
                'missing-weight',
                'O rendimento deste subproduto é necessário para limitar o peso.',
                { itemId: part.itemId },
              );
            continue;
          }
          const amount = weight(part.itemId, part.quantity);
          if (amount === null) known = false;
          else held += amount;
        }
        peak = Math.max(peak, held);
      }
      if (known) peakWeight = peak;
      if (known && input.profile.maxWeight !== undefined && peak > input.profile.maxWeight)
        issue('weight', 'O lote excede a capacidade de peso informada.');
      assumptions.add(
        'Peso simula a compra dos materiais do lote antes da cadeia; peso atual deve excluir os materiais próprios alocados ao lote.',
      );
    }
    for (const [itemId, quantity] of surplus) {
      if (quantity <= 0n) continue;
      const sell = input.surplusSales?.[itemId] ?? false;
      addReturn(itemId, quantity, sell);
      if (!sell) continue;
      const saleQuote = input.quotes[itemId];
      if (saleQuote?.source !== 'market') {
        issue('missing-quote', 'Informe uma cotação de mercado para vender o excedente.', {
          itemId,
        });
        continue;
      }
      const unitPrice = quote(itemId);
      if (unitPrice === null) continue;
      const gross = (quantity * unitPrice) / QUANTITY_SCALE;
      surplusGross += gross;
      surplusNet += net(gross);
      assumptions.add(`Excedente do item ${itemId} valorizado pelo preço de mercado informado.`);
    }

    const salePrice = root && output !== null ? quote(root.output.itemId) : null;
    const gross =
      output !== null && salePrice !== null ? (output * salePrice) / QUANTITY_SCALE : null;
    const revenue = gross === null ? null : net(gross) + byproductNet + surplusNet;
    const profit =
      issues.length === 0 && revenue !== null && economic !== null ? revenue - economic : null;
    const perHour =
      profit !== null && timesKnown && totalMilliseconds > 0n
        ? (profit * 3_600_000n) / totalMilliseconds
        : null;
    const plan: ProductionPlan = {
      recipeId,
      name: root?.name ?? recipeId,
      scenario,
      crafts,
      output: output === null ? null : unscaled(output),
      seconds: timesKnown ? Number(totalMilliseconds) / 1000 : null,
      durationMilliseconds: timesKnown ? String(totalMilliseconds) : null,
      cashCost: cash === null ? null : String(cash),
      economicCost: economic === null ? null : String(economic),
      grossRevenue: gross === null ? null : String(gross + byproductGross + surplusGross),
      netRevenue: revenue === null ? null : String(revenue),
      profit: profit === null ? null : String(profit),
      profitPerHour: perHour === null ? null : String(perHour),
      peakWeight,
      issues,
      assumptions: [...assumptions],
      materials: [...materials.values()].map((part) => ({
        itemId: part.itemId,
        required: unscaled(part.required),
        bought: unscaled(part.bought),
        owned: unscaled(part.owned),
        produced: unscaled(part.produced),
        substituted: unscaled(part.substituted),
      })),
      returns: [...returns].map(([itemId, value]) => ({
        itemId,
        quantity: unscaled(value.quantity),
        sell: value.sell,
      })),
      ...(scenario === 'optimized'
        ? {
            sourceChoices: Object.fromEntries(
              [...materials.keys()].map((itemId) => [itemId, optimizedChoices[itemId] ?? 'buy']),
            ),
          }
        : {}),
      ...(recipeChoices
        ? {
            recipeChoices: Object.fromEntries([
              [root?.output.itemId ?? 0, recipeId],
              ...steps
                .filter((step) => recipes.has(step.recipeId))
                .map((step) => [recipes.get(step.recipeId)!.output.itemId, step.recipeId]),
            ]),
          }
        : {}),
      steps,
    };
    durations.set(plan, totalMilliseconds);
    return plan;
  }

  function optimizationRevenueCeiling(
    recipeId: string,
    crafts: number,
    choices: Readonly<Record<number, ProductionChoice>>,
  ): bigint | null {
    const root = recipes.get(recipeId);
    if (!root) return null;
    const postorder: ProductionRecipe[] = [];
    const visited = new Set<string>();
    const active = new Set<string>();
    const visit = (recipe: ProductionRecipe): boolean => {
      if (active.has(recipe.id)) return false;
      if (visited.has(recipe.id)) return true;
      active.add(recipe.id);
      for (const ingredient of recipe.ingredients) {
        const choice = choices[ingredient.itemId];
        if (choice === 'buy') continue;
        if (choice === 'gather' || choice === 'stock') return false;
        const producer = producers.get(ingredient.itemId);
        if (producer && active.has(producer.id)) {
          if (choice === 'produce') return false;
          continue;
        }
        if (producer && !visit(producer)) return false;
      }
      active.delete(recipe.id);
      visited.add(recipe.id);
      postorder.push(recipe);
      return true;
    };
    if (!visit(root)) return null;
    const order = postorder.reverse();
    const yieldOf = (recipe: ProductionRecipe) => {
      const estimate =
        input.estimates[recipe.id]?.expectedYield ?? exactQuantity(recipe.output.quantity);
      return positive(estimate) && scaled(estimate) > 0n ? scaled(estimate) : null;
    };
    const rootYield = yieldOf(root);
    const rootQuote = input.quotes[root.output.itemId]?.unitPrice;
    if (!rootYield || !money(rootQuote) || rootQuote === '0') return null;
    const requestedCrafts = BigInt(crafts);
    let revenueGross = (rootYield * requestedCrafts * BigInt(rootQuote)) / QUANTITY_SCALE;
    const demands = new Map<number, bigint>();
    const calls = new Map<string, bigint>([[root.id, 1n]]);

    const addByproductCeiling = (recipe: ProductionRecipe, recipeCrafts: bigint) => {
      for (const byproduct of input.byproductValues?.[recipe.id] ?? []) {
        if (!byproduct.sell || !positive(byproduct.expectedQuantity) || !money(byproduct.unitPrice))
          continue;
        revenueGross +=
          (scaled(byproduct.expectedQuantity) * recipeCrafts * BigInt(byproduct.unitPrice)) /
          QUANTITY_SCALE;
      }
    };
    const addIngredientDemand = (
      recipe: ProductionRecipe,
      recipeCrafts: bigint,
      recipeCalls: bigint,
    ): boolean => {
      for (const ingredient of recipe.ingredients) {
        const choice = choices[ingredient.itemId];
        if (choice === 'buy') continue;
        const quantity = exactQuantity(ingredient.quantity);
        if (quantity === undefined) return false;
        const producer = producers.get(ingredient.itemId);
        if (!producer) continue;
        demands.set(
          ingredient.itemId,
          (demands.get(ingredient.itemId) ?? 0n) + scaled(quantity) * recipeCrafts,
        );
        calls.set(producer.id, (calls.get(producer.id) ?? 0n) + recipeCalls);
      }
      return true;
    };

    addByproductCeiling(root, requestedCrafts);
    if (!addIngredientDemand(root, requestedCrafts, 1n)) return null;
    for (const recipe of order.slice(1)) {
      const recipeCalls = calls.get(recipe.id) ?? 0n;
      const demand = demands.get(recipe.output.itemId) ?? 0n;
      if (recipeCalls === 0n || demand === 0n) continue;
      const yieldScaled = yieldOf(recipe);
      if (!yieldScaled) return null;
      // The per-call ceiling allows one extra operation for every incoming
      // request, covering batches that cannot reuse another call's surplus.
      const recipeCrafts = ceilDivide(demand, yieldScaled) + recipeCalls;
      addByproductCeiling(recipe, recipeCrafts);

      const saleQuote = input.quotes[recipe.output.itemId];
      if (
        input.surplusSales?.[recipe.output.itemId] &&
        saleQuote?.source === 'market' &&
        money(saleQuote.unitPrice) &&
        saleQuote.unitPrice !== '0'
      ) {
        // Each production call can leave less than one recipe yield as surplus.
        revenueGross +=
          ((yieldScaled - 1n) * recipeCalls * BigInt(saleQuote.unitPrice)) / QUANTITY_SCALE;
      }
      if (!addIngredientDemand(recipe, recipeCrafts, recipeCalls)) return null;
    }
    return net(revenueGross);
  }

  function minimumEconomicCost(
    recipeId: string,
    crafts: number,
    choices: Readonly<Record<number, ProductionChoice>>,
  ): bigint {
    const root = recipes.get(recipeId);
    if (!root) return 0n;
    const unitCosts = new Map<number, bigint>();
    const minimumUnitCost = (itemId: number, path: ReadonlySet<number>): bigint => {
      if (path.has(itemId)) return 0n;
      const choice = choices[itemId];
      const quote = input.quotes[itemId]?.unitPrice;
      const buyCost = money(quote) && quote !== '0' ? BigInt(quote) : null;
      if (choice === 'buy') return buyCost ?? 0n;
      if (choice === 'gather' || choice === 'stock') return 0n;
      const cached = unitCosts.get(itemId);
      if (cached !== undefined) return cached;
      const producer = producers.get(itemId);
      if (!producer) return buyCost ?? 0n;
      const yieldScaled =
        input.estimates[producer.id]?.expectedYield ?? exactQuantity(producer.output.quantity);
      if (!positive(yieldScaled)) return choice === 'produce' ? 0n : (buyCost ?? 0n);
      let ingredientCostScaled = 0n;
      const nextPath = new Set(path).add(itemId);
      for (const ingredient of producer.ingredients) {
        const quantity = exactQuantity(ingredient.quantity);
        if (quantity === undefined) return choice === 'produce' ? 0n : (buyCost ?? 0n);
        ingredientCostScaled += scaled(quantity) * minimumUnitCost(ingredient.itemId, nextPath);
      }
      const producedCost = ingredientCostScaled / scaled(yieldScaled);
      const result =
        choice === 'produce'
          ? producedCost
          : buyCost === null || producedCost < buyCost
            ? producedCost
            : buyCost;
      unitCosts.set(itemId, result);
      return result;
    };

    let costScaled = 0n;
    for (const ingredient of root.ingredients) {
      const quantity = exactQuantity(ingredient.quantity);
      if (quantity === undefined) return 0n;
      costScaled +=
        scaled(quantity) * BigInt(crafts) * minimumUnitCost(ingredient.itemId, new Set());
    }
    return costScaled / QUANTITY_SCALE;
  }

  function hasForcedProductionCycle(
    recipeId: string,
    choices: ReadonlyMap<number, ProductionChoice>,
  ): boolean {
    const root = recipes.get(recipeId);
    if (!root) return false;
    const visit = (recipe: ProductionRecipe, active: ReadonlySet<string>): boolean => {
      const nextActive = new Set(active).add(recipe.id);
      for (const ingredient of recipe.ingredients) {
        if (choices.get(ingredient.itemId) !== 'produce') continue;
        const producer = producers.get(ingredient.itemId);
        if (!producer) continue;
        if (nextActive.has(producer.id) || visit(producer, nextActive)) return true;
      }
      return false;
    };
    return visit(root, new Set());
  }

  const branchImpact = new Map<number, { recipes: number; milliseconds: number }>();
  function optimizationBranchImpact(itemId: number): { recipes: number; milliseconds: number } {
    const cached = branchImpact.get(itemId);
    if (cached) return cached;
    const recipesInBranch = new Set<string>();
    const pending = [itemId];
    let milliseconds = 0;
    while (pending.length) {
      const currentItemId = pending.pop()!;
      const producer = producers.get(currentItemId);
      if (!producer || recipesInBranch.has(producer.id)) continue;
      recipesInBranch.add(producer.id);
      const seconds = input.estimates[producer.id]?.craftSeconds;
      if (positive(seconds)) milliseconds += Math.round(seconds * 1000);
      for (const ingredient of producer.ingredients) pending.push(ingredient.itemId);
    }
    const impact = { recipes: recipesInBranch.size, milliseconds };
    branchImpact.set(itemId, impact);
    return impact;
  }

  function nextOptimizationDecision(
    recipeId: string,
    choices: ReadonlyMap<number, ProductionChoice>,
  ): number | null {
    const root = recipes.get(recipeId);
    if (!root) return null;
    const visitedItems = new Set<number>();
    const frontier: number[] = [];
    const visit = (itemId: number, activeRecipes: ReadonlySet<string>): number | null => {
      if (visitedItems.has(itemId)) return null;
      visitedItems.add(itemId);
      const producer = producers.get(itemId);
      const hasGatherEstimate = input.gatheringEstimates?.[itemId] !== undefined;
      if (!producer && !hasGatherEstimate) return null;
      const choice = choices.get(itemId);
      if (!choice) {
        frontier.push(itemId);
        return null;
      }
      if (choice !== 'produce' || !producer || activeRecipes.has(producer.id)) return null;
      const nextActive = new Set(activeRecipes).add(producer.id);
      for (const ingredient of producer.ingredients) {
        const next = visit(ingredient.itemId, nextActive);
        if (next !== null) return next;
      }
      return null;
    };
    const activeRecipes = new Set([recipeId]);
    for (const ingredient of root.ingredients) {
      const next = visit(ingredient.itemId, activeRecipes);
      if (next !== null) return next;
    }
    frontier.sort((left, right) => {
      const a = optimizationBranchImpact(left);
      const b = optimizationBranchImpact(right);
      return b.recipes - a.recipes || b.milliseconds - a.milliseconds || left - right;
    });
    return frontier[0] ?? null;
  }

  /** Enumerates only reached decisions; no rate pruning is assumed safe across formulas. */
  function optimizeAlternatives(): ProductionOptimizationResult {
    type State = {
      rootId: string;
      crafts: number;
      sources: Record<number, ProductionChoice>;
      formulas: Record<number, string>;
    };
    const rawLimit = input.maxOptimizationStates ?? 10_000;
    const limit =
      Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(10_000, rawLimit) : 10_000;
    const alternatives = input.recipeAlternativesByItemId!;
    const incompleteAlternatives: ProductionOptimizationResult['incompleteAlternatives'] = [];
    const addIssues = (itemId: number, recipeId: string, issues: ProductionIssue[]) => {
      const previous = incompleteAlternatives.find(
        (row) => row.itemId === itemId && row.recipeId === recipeId,
      );
      if (previous) {
        for (const issue of issues)
          if (
            !previous.issues.some(
              (row) =>
                row.code === issue.code &&
                row.itemId === issue.itemId &&
                row.recipeId === issue.recipeId,
            )
          )
            previous.issues.push(issue);
      } else incompleteAlternatives.push({ itemId, recipeId, issues: [...issues] });
    };
    for (const issue of input.optimizationIssues ?? [])
      addIssues(issue.itemId ?? 0, issue.recipeId ?? '', [issue]);
    if (!input.catalogVersion)
      addIssues(0, '', [
        { code: 'dataset-mismatch', message: 'A versão do catálogo não foi informada.' },
      ]);
    const roots = new Map<string, State>();
    for (const candidate of input.candidates) {
      if (candidate.optimizeCrafts === undefined) continue;
      const rootItemId = recipes.get(candidate.recipeId)?.output.itemId;
      const ids =
        rootItemId === undefined
          ? [candidate.recipeId]
          : (alternatives[rootItemId] ?? [candidate.recipeId]);
      for (const id of ids) {
        if (!roots.has(id))
          roots.set(id, {
            rootId: id,
            crafts: candidate.optimizeCrafts,
            sources: {},
            formulas: { [rootItemId ?? 0]: id },
          });
      }
    }
    let statesVisited = 0;
    let statesPruned = 0;
    let limited = false;
    const rootEvaluated = new Set<string>();
    const recursiveEvaluated = new Set<string>();
    const seen = new Set<string>();
    let bestFound: ProductionPlan | null = null;
    const better = (a: ProductionPlan, b: ProductionPlan) => {
      const rate = compareProductionPlans(a, b);
      if (rate !== 0) return rate < 0;
      const cashA = BigInt(a.cashCost ?? '0'),
        cashB = BigInt(b.cashCost ?? '0');
      if (cashA !== cashB) return cashA < cashB;
      return (
        JSON.stringify([a.recipeChoices, a.sourceChoices]) <
        JSON.stringify([b.recipeChoices, b.sourceChoices])
      );
    };
    const validRecipe = (itemId: number, id: string): boolean => {
      const recipe = recipes.get(id);
      const code =
        !recipe || recipe.output.itemId !== itemId
          ? 'invalid-alternative'
          : recipe.catalogVersion && input.catalogVersion !== recipe.catalogVersion
            ? 'dataset-mismatch'
            : null;
      if (code) {
        addIssues(itemId, id, [
          {
            code,
            itemId,
            recipeId: id,
            message:
              code === 'dataset-mismatch'
                ? 'Fórmula de outra versão do catálogo.'
                : 'Fórmula inválida para este produto.',
          },
        ]);
        statesPruned++;
        return false;
      }
      return true;
    };
    const pending = [...roots.values()].reverse();
    while (pending.length) {
      if (statesVisited >= limit) {
        limited = true;
        break;
      }
      const state = pending.pop()!;
      const itemId = Number(
        Object.keys(state.formulas).find((key) => state.formulas[Number(key)] === state.rootId) ??
          0,
      );
      if (!validRecipe(itemId, state.rootId)) continue;
      const key = JSON.stringify([
        state.rootId,
        state.crafts,
        Object.entries(state.sources).sort(),
        Object.entries(state.formulas).sort(),
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      statesVisited++;
      rootEvaluated.add(state.rootId);
      // Evaluation reveals the actual demand after shared inventory and surplus.
      // Structural edges alone cannot prove a cycle when free stock breaks it.
      const trial = evaluate(
        state.rootId,
        state.crafts,
        'optimized',
        state.sources,
        state.formulas,
      );
      const cycle = trial.issues.find((issue) => issue.code === 'cycle');
      if (cycle) {
        addIssues(itemId, state.rootId, [cycle]);
        statesPruned++;
        continue;
      }
      const nextItem =
        trial.materials.find(
          (part) =>
            part.bought > 0 &&
            !state.sources[part.itemId] &&
            ((alternatives[part.itemId]?.length ?? 0) > 0 ||
              producers.has(part.itemId) ||
              input.gatheringEstimates?.[part.itemId]),
        )?.itemId ?? null;
      for (const step of trial.steps)
        if (step.recipeId !== state.rootId && recipes.has(step.recipeId))
          recursiveEvaluated.add(step.recipeId);
      if (trial.profitPerHour !== null) {
        if (!bestFound || better(trial, bestFound)) bestFound = trial;
        const previous = recursiveBestByRoot.get(state.rootId);
        if (!previous || better(trial, previous)) recursiveBestByRoot.set(state.rootId, trial);
      } else if (nextItem === null) {
        const uncertain = trial.issues.filter(
          (issue) =>
            !['budget', 'time', 'weight', 'market-stock', 'stock-shortage', 'cycle'].includes(
              issue.code,
            ),
        );
        if (uncertain.length) addIssues(itemId, state.rootId, uncertain);
      }
      if (nextItem === null) continue;
      const next = nextItem as number;
      const options: State[] = [{ ...state, sources: { ...state.sources, [next]: 'buy' } }];
      for (const recipeId of [
        ...new Set(alternatives[next] ?? (producers.has(next) ? [producers.get(next)!.id] : [])),
      ].sort()) {
        if (validRecipe(next, recipeId))
          options.push({
            ...state,
            sources: { ...state.sources, [next]: 'produce' },
            formulas: { ...state.formulas, [next]: recipeId },
          });
      }
      if (input.gatheringEstimates?.[next])
        options.push({ ...state, sources: { ...state.sources, [next]: 'gather' } });
      pending.push(...options.reverse());
    }
    const issues = incompleteAlternatives
      .flatMap((row) => row.issues)
      .filter((issue) => issue.code !== 'cycle');
    const complete = !limited && issues.length === 0;
    const reason: ProductionOptimizationResult['reason'] = limited
      ? 'state-limit'
      : issues.some((issue) => issue.code === 'dataset-mismatch')
        ? 'dataset-mismatch'
        : issues.some((issue) => issue.code === 'invalid-alternative')
          ? 'invalid-alternative'
          : issues.length
            ? 'missing-data'
            : 'complete';
    return {
      best: complete ? bestFound : null,
      bestFound,
      incompleteAlternatives,
      complete,
      reason,
      rootRecipesTotal: roots.size,
      rootRecipesEvaluated: rootEvaluated.size,
      recursiveRecipesEvaluated: recursiveEvaluated.size,
      statesVisited,
      statesPruned,
      catalogVersion: input.catalogVersion ?? null,
    };
  }

  const recursiveBestByRoot = new Map<string, ProductionPlan>();
  const ranked: ProductionPlan[] = [];
  const incomplete: ProductionPlan[] = [];
  const boundIssues = new Set<ProductionIssue['code']>([
    'budget',
    'time',
    'weight',
    'market-stock',
    'stock-shortage',
  ]);
  for (const candidate of input.candidates) {
    for (const scenario of ['buy-all', 'produce-all', 'custom'] as const) {
      let result = evaluate(candidate.recipeId, candidate.crafts ?? 1, scenario);
      if (candidate.crafts === undefined && result.issues.length === 0) {
        let low = 1;
        let high = searchLimit;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          const trial = evaluate(candidate.recipeId, middle, scenario);
          if (trial.issues.length === 0) {
            low = middle;
            result = trial;
          } else if (trial.issues.every((part) => boundIssues.has(part.code))) high = middle - 1;
          else {
            high = middle - 1;
          }
        }
        if (result.crafts !== low) result = evaluate(candidate.recipeId, low, scenario);
        // The largest affordable batch can have a worse rate because intermediate
        // yields require whole operations. Search every feasible integer batch;
        // compare exact profit/time ratios before formatting hourly silver.
        for (let crafts = 1; crafts < low; crafts++) {
          const trial = evaluate(candidate.recipeId, crafts, scenario);
          if (trial.profitPerHour === null) continue;
          const comparison = compareRate(trial, result);
          if (comparison > 0 || (comparison === 0 && trial.crafts > result.crafts)) result = trial;
        }
        result.assumptions.push(
          `Busca exata de lucro econômico por hora entre os lotes de 1 a ${low} operações viáveis, com limite de ${searchLimit}, considerando prata, tempo, oferta, estoque e peso informados.`,
        );
      }
      if (result.profitPerHour === null) incomplete.push(result);
      else ranked.push(result);
    }
    if (candidate.optimizeCrafts !== undefined && !input.recipeAlternativesByItemId) {
      const rawLimit = input.maxOptimizationStates ?? 10_000;
      const stateLimit =
        Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 10_000) : 10_000;
      if (
        !Number.isSafeInteger(candidate.optimizeCrafts) ||
        candidate.optimizeCrafts <= 0 ||
        candidate.optimizeCrafts > 1_000_000_000
      ) {
        const result = evaluate(candidate.recipeId, candidate.optimizeCrafts, 'optimized');
        if (result.profitPerHour === null) incomplete.push(result);
        else ranked.push(result);
      } else {
        let best: ProductionPlan | null = null;
        let bestPending: ProductionPlan | null = null;
        let visitedStates = 0;
        let boundPrunedStates = 0;
        let duplicateStates = 0;
        let cyclicChoicesPruned = 0;
        let complete = true;
        const betterThanCurrent = (plan: ProductionPlan, current: ProductionPlan) =>
          compareRate(plan, current) > 0 ||
          (compareRate(plan, current) === 0 &&
            BigInt(plan.cashCost ?? '0') < BigInt(current.cashCost ?? '0'));
        const allProducedChoices = Object.fromEntries(
          [...producers.keys()].map((itemId) => [itemId, 'produce' as const]),
        );
        const hasGatheringAlternatives = Object.keys(input.gatheringEstimates ?? {}).length > 0;
        const hasRareSubstitutions = Object.values(input.useRareProcs ?? {}).some(Boolean);
        // Seed the search with complete plans already represented by the UI.
        // A state limit must never discard a known better rate than the partial search found.
        for (const choices of [{}, allProducedChoices, input.customChoices ?? {}]) {
          const plan = evaluate(candidate.recipeId, candidate.optimizeCrafts, 'optimized', choices);
          if (plan.profitPerHour !== null) {
            if (best === null || betterThanCurrent(plan, best)) best = plan;
          } else if (bestPending === null || plan.issues.length < bestPending.issues.length) {
            bestPending = plan;
          }
        }
        const initialChoices = new Map<number, ProductionChoice>();
        const pending: Map<number, ProductionChoice>[] = [initialChoices];
        const visited = new Set<string>();
        while (pending.length) {
          const choices = pending.pop()!;
          const stateKey = [...choices]
            .sort(([left], [right]) => left - right)
            .map(([itemId, choice]) => `${itemId}:${choice}`)
            .join('|');
          if (visited.has(stateKey)) {
            duplicateStates++;
            continue;
          }

          const choiceRecord = Object.fromEntries(choices) as Record<number, ProductionChoice>;
          if (best && !hasGatheringAlternatives && !hasRareSubstitutions) {
            const optimistic = evaluate(
              candidate.recipeId,
              candidate.optimizeCrafts,
              'optimized',
              choiceRecord,
            );
            const revenueCeiling = optimizationRevenueCeiling(
              candidate.recipeId,
              candidate.optimizeCrafts,
              choiceRecord,
            );
            const costFloor = minimumEconomicCost(
              candidate.recipeId,
              candidate.optimizeCrafts,
              choiceRecord,
            );
            const lowerDuration = optimistic.durationMilliseconds;
            if (
              optimistic.netRevenue !== null &&
              revenueCeiling !== null &&
              lowerDuration !== null &&
              BigInt(lowerDuration) > 0n &&
              best.durationMilliseconds !== null &&
              BigInt(best.durationMilliseconds) > 0n
            ) {
              const optimisticRevenue = BigInt(optimistic.netRevenue);
              const profitRevenue =
                optimisticRevenue > revenueCeiling ? optimisticRevenue : revenueCeiling;
              const profitCeiling = profitRevenue > costFloor ? profitRevenue - costFloor : 0n;
              const upperProfit = profitCeiling > 0n ? profitCeiling : 0n;
              if (
                BigInt(best.profit!) * BigInt(lowerDuration) >
                upperProfit * BigInt(best.durationMilliseconds)
              ) {
                boundPrunedStates++;
                continue;
              }
            }
          }
          if (visitedStates >= stateLimit) {
            complete = false;
            break;
          }
          visited.add(stateKey);
          visitedStates++;
          const nextItemId = nextOptimizationDecision(candidate.recipeId, choices);
          if (nextItemId !== null) {
            // A purchase without a price can never yield a complete economic plan.
            // Exclude that branch before enumerating its downstream combinations.
            const purchaseQuote = input.quotes[nextItemId];
            const options: ProductionChoice[] =
              purchaseQuote && money(purchaseQuote.unitPrice) && purchaseQuote.unitPrice !== '0'
                ? ['buy']
                : [];
            if (producers.has(nextItemId)) {
              const produceChoices = new Map(choices);
              produceChoices.set(nextItemId, 'produce');
              if (hasForcedProductionCycle(candidate.recipeId, produceChoices))
                cyclicChoicesPruned++;
              else options.push('produce');
            }
            if (input.gatheringEstimates?.[nextItemId]) options.push('gather');
            if (!options.length) {
              const blocked = evaluate(candidate.recipeId, candidate.optimizeCrafts, 'optimized', {
                ...choiceRecord,
                [nextItemId]: 'buy',
              });
              if (bestPending === null || blocked.issues.length < bestPending.issues.length)
                bestPending = blocked;
              continue;
            }
            for (const option of options.reverse()) {
              const nextChoices = new Map(choices);
              nextChoices.set(nextItemId, option);
              pending.push(nextChoices);
            }
            continue;
          }
          const result = evaluate(
            candidate.recipeId,
            candidate.optimizeCrafts,
            'optimized',
            choiceRecord,
          );
          if (result.profitPerHour !== null) {
            if (best === null || betterThanCurrent(result, best)) best = result;
          } else if (bestPending === null || result.issues.length < bestPending.issues.length) {
            bestPending = result;
          }
        }
        if (pending.length) complete = false;
        const result =
          best ??
          bestPending ??
          evaluate(candidate.recipeId, candidate.optimizeCrafts, 'optimized');
        result.assumptions.push(
          `Busca exata por estados alcançáveis: ${visitedStates} visitados, ${boundPrunedStates} estados podados pelo limite superior seguro e ${duplicateStates} duplicados eliminados, limite de ${stateLimit}.`,
        );
        if (cyclicChoicesPruned > 0)
          result.assumptions.push(
            `${cyclicChoicesPruned} escolhas de produção que criariam ciclos foram descartadas por não formarem planos viáveis.`,
          );
        if (!complete) {
          result.issues.push({
            code: 'optimization-limit',
            message: `A busca excedeu o limite de ${stateLimit} estados; não há combinação ótima certificada.`,
            recipeId: candidate.recipeId,
          });
          result.assumptions.push(
            'O limite de segurança foi alcançado. As métricas mostram o melhor candidato encontrado; a busca não certifica que seja o ótimo global.',
          );
          incomplete.push(result);
        } else {
          result.assumptions.push(
            'A busca automática avaliou todas as escolhas alcançáveis de compra, produção e coleta para a fórmula selecionada.',
          );
          if (best) ranked.push(best);
          else incomplete.push(result);
        }
      }
    }
  }
  ranked.sort((a, b) => {
    const comparison = compareRate(a, b);
    return comparison === 0 ? a.recipeId.localeCompare(b.recipeId) : -comparison;
  });
  const optimization =
    input.recipeAlternativesByItemId &&
    input.candidates.some((candidate) => candidate.optimizeCrafts !== undefined)
      ? optimizeAlternatives()
      : null;
  if (optimization) {
    const perRoot = recursiveBestByRoot;
    for (const plan of perRoot.values()) {
      if (optimization.complete) ranked.push(plan);
      else incomplete.push(plan);
    }
    ranked.sort(compareProductionPlans);
  }
  return {
    ranked,
    incomplete,
    best: optimization ? optimization.best : (ranked[0] ?? null),
    optimization,
  };
}
