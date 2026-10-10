import type { TaxOptions } from './models';
import { retention } from './tools';

export type ProductionQuantity = number | { min: number; max: number } | null;
export interface ProductionRecipe {
  id: string;
  name: string;
  method: string;
  output: { itemId: number; quantity: ProductionQuantity };
  ingredients: { itemId: number; quantity: ProductionQuantity }[];
  byproducts?: { itemId: number; quantity: ProductionQuantity }[];
}
export interface ProductionEstimate {
  expectedYield?: number;
  craftSeconds?: number;
  source: 'informed' | 'calibrated' | 'fixed';
  contextHash?: string;
}
export type ProductionChoice = 'buy' | 'produce' | 'stock';
export type ProductionScenario = 'buy-all' | 'produce-all' | 'custom';
export interface ProductionPlannerInput {
  recipes: ProductionRecipe[];
  quotes: Record<
    number,
    {
      unitPrice: string;
      available: number | null;
      observedAt: string;
      source: 'market' | 'npc' | 'manual';
    }
  >;
  inventory: { itemId: number; quantity: number; reserved?: number }[];
  estimates: Record<string, ProductionEstimate>;
  candidates: { recipeId: string; crafts?: number }[];
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
  itemWeights?: Record<number, number>;
  customChoices?: Record<number, ProductionChoice>;
  customRecipes?: Record<number, string>;
  useOwnedInProduction?: boolean;
  byproductValues?: Record<
    string,
    { itemId: number; expectedQuantity: number; unitPrice: string; sell: boolean }[]
  >;
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
    | 'invalid-input';
  message: string;
  itemId?: number;
  recipeId?: string;
}
export interface ProductionPlan {
  recipeId: string;
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
  }[];
  steps: { recipeId: string; crafts: number; output: number; seconds: number | null }[];
}
export interface ProductionPlannerResult {
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
            row.code === code && row.itemId === details.itemId && row.recipeId === details.recipeId,
        )
      )
        issues.push({ code, message, ...details });
    };
    const assumptions = new Set<string>([
      'Materiais próprios são avaliados pelo preço de reposição informado; não são gratuitos.',
      'Receita de venda usa o imposto e os bônus informados; a cotação não garante venda imediata.',
      'Tempos e rendimentos são premissas explícitas, sem extrapolar fórmulas de maestria.',
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
      { itemId: number; required: bigint; bought: bigint; owned: bigint; produced: bigint }
    >();
    const material = (id: number) => {
      let row = materials.get(id);
      if (!row) {
        row = { itemId: id, required: 0n, bought: 0n, owned: 0n, produced: 0n };
        materials.set(id, row);
      }
      return row;
    };
    const steps: ProductionPlan['steps'] = [];
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

    function satisfy(id: number, quantity: bigint, path: Set<string>) {
      const row = material(id);
      row.required += quantity;
      const choice: ProductionChoice =
        scenario === 'buy-all'
          ? 'buy'
          : scenario === 'produce-all'
            ? 'produce'
            : (input.customChoices?.[id] ?? 'buy');
      if (choice === 'buy') {
        purchase(id, quantity);
        return;
      }
      let missing = quantity;
      const made = surplus.get(id) ?? 0n;
      const reused = made < missing ? made : missing;
      missing -= reused;
      surplus.set(id, made - reused);
      if (choice === 'stock' || (scenario === 'produce-all' && input.useOwnedInProduction))
        missing = useStock(id, missing);
      if (missing === 0n) return;
      if (choice === 'stock') {
        issue('stock-shortage', 'O estoque livre não cobre o cenário personalizado.', {
          itemId: id,
        });
        return;
      }
      const producer = producers.get(id);
      if (!producer) {
        if (scenario === 'custom' && input.customChoices?.[id] === 'produce')
          issue('missing-recipe', 'Nenhuma receita disponível para produzir este ingrediente.', {
            itemId: id,
          });
        else purchase(id, missing);
        return;
      }
      const yieldValue = recipeYield(producer);
      if (yieldValue === null) return;
      const count = ceilDivide(missing, yieldValue);
      if (count > 1_000_000_000n) {
        issue('invalid-input', 'A cadeia excede o limite de operações.', { recipeId: producer.id });
        return;
      }
      const produced = produce(producer, Number(count), path);
      if (produced !== null) {
        row.produced += produced;
        surplus.set(id, (surplus.get(id) ?? 0n) + produced - missing);
      }
    }

    function recipeYield(recipe: ProductionRecipe): bigint | null {
      const estimate = input.estimates[recipe.id];
      if (
        estimate?.source === 'calibrated' &&
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

    function produce(recipe: ProductionRecipe, count: number, path: Set<string>): bigint | null {
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
        satisfy(part.itemId, total, next);
      }
      const seconds = input.estimates[recipe.id]?.craftSeconds;
      if (!positive(seconds) || Math.round(seconds * 1000) === 0) {
        issue('missing-time', 'Informe os segundos por operação.', { recipeId: recipe.id });
        timesKnown = false;
      } else totalMilliseconds += BigInt(Math.round(seconds * 1000)) * BigInt(count);
      const result = yieldValue * BigInt(count);
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
            return {
              itemId: part.itemId,
              quantity: positive(expected) ? scaled(expected) * BigInt(count) : null,
            };
          }),
        ],
      });
      for (const byproduct of input.byproductValues?.[recipe.id] ?? []) {
        if (!byproduct.sell) continue;
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
        const gross =
          (scaled(byproduct.expectedQuantity) * BigInt(count) * BigInt(byproduct.unitPrice)) /
          QUANTITY_SCALE;
        byproductGross += gross;
        byproductNet += net(gross);
        assumptions.add(
          `${recipe.name}: subproduto ${byproduct.itemId} valorizado pelo rendimento e preço explicitamente informados.`,
        );
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
    if (cash !== null && money(input.profile.budget) && cash > BigInt(input.profile.budget))
      issue('budget', 'A prata disponível não cobre as compras do lote.');
    if (timesKnown && unscaled(totalMilliseconds * 1000n) > input.profile.activeMinutes * 60)
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
    const salePrice = root && output !== null ? quote(root.output.itemId) : null;
    const gross =
      output !== null && salePrice !== null ? (output * salePrice) / QUANTITY_SCALE : null;
    const revenue = gross === null ? null : net(gross) + byproductNet;
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
      grossRevenue: gross === null ? null : String(gross + byproductGross),
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
      })),
      steps,
    };
    durations.set(plan, totalMilliseconds);
    return plan;
  }

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
  }
  ranked.sort((a, b) => {
    const comparison = compareRate(a, b);
    return comparison === 0 ? a.recipeId.localeCompare(b.recipeId) : -comparison;
  });
  return { ranked, incomplete, best: ranked[0] ?? null };
}
