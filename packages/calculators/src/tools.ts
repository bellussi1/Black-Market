import {
  activitySchema,
  boxSchema,
  craftingSchema,
  enhancementSchema,
  failstackSchema,
  gearSchema,
  investmentSchema,
  marketSchema,
  productionSchema,
  type TaxOptions,
  trainingSchema,
} from './models';
export * from './models';

const SCALE = 1_000_000_000_000n;
const ceil = (n: bigint, d: bigint) => (n + d - 1n) / d;
const bp = (n: number) => BigInt(Math.round(n * 100));
const key = (name: string) => name.trim().toLocaleLowerCase('pt-BR');
export function retention(options: TaxOptions): {
  numerator: bigint;
  denominator: bigint;
} {
  if (options.exempt) return { numerator: 1n, denominator: 1n };
  const numerator =
    (10_000n - bp(options.taxPercent)) *
    (10_000n + (options.valuePack ? 3000n : 0n) + bp(options.collectionBonus));
  if (numerator > 100_000_000n)
    throw new RangeError('Os bônus resultam numa coleta acima de 100%. Confira as premissas.');
  return { numerator, denominator: 100_000_000n };
}
function net(gross: bigint, options: TaxOptions): bigint {
  const r = retention(options);
  return (gross * r.numerator) / r.denominator;
}
export function calculateMarket(raw: unknown) {
  const input = marketSchema.parse(raw);
  const gross = BigInt(input.price) * BigInt(input.quantity);
  const collected = net(gross, input);
  const r = retention(input);
  const compare = (valuePack: boolean) => {
    try {
      return String(net(gross, { ...input, valuePack }));
    } catch {
      return null;
    }
  };
  return {
    gross: String(gross),
    net: String(collected),
    tax: String(gross - collected),
    profit: String(collected - BigInt(input.cost)),
    retentionPercent: (Number(r.numerator) / Number(r.denominator)) * 100,
    withoutValuePack: compare(false),
    withValuePack: compare(true),
    breakEvenPrice:
      r.numerator === 0n
        ? null
        : String(ceil(BigInt(input.cost) * r.denominator, r.numerator * BigInt(input.quantity))),
  };
}
export function calculateCrafting(raw: unknown) {
  const input = craftingSchema.parse(raw);
  const rows = input.ingredients.map((row) => {
    const neededScaled = BigInt(Math.round(row.quantity * 1000)) * BigInt(input.crafts);
    const ownedScaled = BigInt(Math.round(row.owned * 1000));
    const missingScaled = neededScaled > ownedScaled ? neededScaled - ownedScaled : 0n;
    return {
      name: row.name,
      needed: Number(neededScaled) / 1000,
      missing: Number(missingScaled) / 1000,
      economicCost: String(ceil(neededScaled * BigInt(row.price), 1000n)),
      cashCost: String(ceil(missingScaled * BigInt(row.price), 1000n)),
    };
  });
  const cost = rows.reduce((sum, r) => sum + BigInt(r.economicCost), BigInt(input.extraCost));
  const cashCost = rows.reduce((sum, r) => sum + BigInt(r.cashCost), BigInt(input.extraCost));
  const outputScaled = BigInt(Math.round(input.yield * 1000)) * BigInt(input.crafts);
  const gross = (outputScaled * BigInt(input.salePrice)) / 1000n;
  const revenue = net(gross, input);
  const profit = revenue - cost;
  const r = retention(input);
  return {
    rows,
    output: Number(outputScaled) / 1000,
    economicCost: String(cost),
    cashCost: String(cashCost),
    gross: String(gross),
    net: String(revenue),
    profit: String(profit),
    profitPerHour: String((profit * 60_000n) / BigInt(Math.round(input.minutes * 1000))),
    costPerOutput: String(ceil(cost * 1000n, outputScaled)),
    breakEvenPrice:
      r.numerator === 0n
        ? null
        : String(ceil(cost * 1000n * r.denominator, outputScaled * r.numerator)),
    marginPercent: revenue === 0n ? null : Number((profit * 10_000n) / revenue) / 100,
  };
}
export function calculateEnhancement(raw: unknown) {
  const i = enhancementSchema.parse(raw);
  const guaranteedAttempt = i.pity > 0 ? i.pity - i.currentPity + 1 : null;
  const horizon = Math.min(i.limit, guaranteedAttempt ?? i.limit);
  let survival = SCALE;
  let spend = BigInt(i.stackCost) * SCALE;
  let expectedAttempts = 0n;
  let median: number | null = null;
  let p90: number | null = null;
  let p95: number | null = null;
  const distribution: {
    attempt: number;
    chance: number;
    successByNow: number;
    successHere: number;
  }[] = [];
  for (let attempt = 1; attempt <= horizon; attempt++) {
    const guaranteed = attempt === guaranteedAttempt;
    const probability = guaranteed
      ? 10_000n
      : bp(Math.min(i.cap, i.chance + (attempt - 1) * i.increase));
    const mass = (survival * probability) / 10_000n;
    const next = survival - mass;
    expectedAttempts += survival;
    spend +=
      survival * BigInt(guaranteed ? i.guaranteedCost : i.attemptCost) +
      next * BigInt(i.failureCost);
    const cumulative = SCALE - next;
    if (median === null && cumulative * 2n >= SCALE) median = attempt;
    if (p90 === null && cumulative * 10n >= SCALE * 9n) p90 = attempt;
    if (p95 === null && cumulative * 20n >= SCALE * 19n) p95 = attempt;
    distribution.push({
      attempt,
      chance: Number(probability) / 100,
      successByNow: (Number(cumulative) / Number(SCALE)) * 100,
      successHere: (Number(mass) / Number(SCALE)) * 100,
    });
    survival = next;
  }
  const spendValue = ceil(spend, SCALE);
  return {
    horizon,
    guaranteedAttempt,
    expectedAttempts: Number(expectedAttempts) / Number(SCALE),
    expectedSpend: String(spendValue),
    successPercent: (Number(SCALE - survival) / Number(SCALE)) * 100,
    failurePercent: (Number(survival) / Number(SCALE)) * 100,
    median,
    p90,
    p95,
    distribution,
    buyingDifference: String(spendValue - BigInt(i.buyPrice)),
  };
}
export function calculateFailstack(raw: unknown) {
  const i = failstackSchema.parse(raw);
  const denominator = 10_000n ** BigInt(i.steps.length);
  let prefix = 1n;
  let roundCost = BigInt(i.baseCost) * denominator;
  i.steps.forEach((step, index) => {
    const failures = 10_000n - bp(step.chance);
    const remainingPower = 10_000n ** BigInt(i.steps.length - index - 1);
    roundCost +=
      prefix * remainingPower * (10_000n * BigInt(step.cost) + failures * BigInt(step.failureCost));
    prefix *= failures;
  });
  return {
    expectedCost: String(ceil(roundCost, prefix)),
    chanceOfBuildingPercent: (Number(prefix) / Number(denominator)) * 100,
    expectedRounds: Number(denominator) / Number(prefix),
    steps: i.steps.length,
  };
}
export function calculateBox(raw: unknown) {
  const i = boxSchema.parse(raw);
  let weightedValue = 0n;
  let profitableBp = 0n;
  const rows = i.outcomes.map((row) => {
    const value = net(BigInt(row.price) * BigInt(row.quantity), i);
    const probability = bp(row.probability);
    weightedValue += value * probability;
    if (value > BigInt(i.boxPrice)) profitableBp += probability;
    return {
      name: row.name,
      probability: row.probability,
      net: String(value),
      contribution: String((value * probability) / 10_000n),
    };
  });
  const expected = weightedValue / 10_000n;
  return {
    rows,
    expectedNet: String(expected),
    expectedProfit: String(expected - BigInt(i.boxPrice)),
    totalCost: String(BigInt(i.boxPrice) * BigInt(i.boxes)),
    totalExpectedProfit: String(
      (weightedValue * BigInt(i.boxes)) / 10_000n - BigInt(i.boxPrice) * BigInt(i.boxes),
    ),
    profitablePercent: Number(profitableBp) / 100,
    atLeastOneProfitablePercent: (1 - Math.pow(1 - Number(profitableBp) / 10_000, i.boxes)) * 100,
  };
}
export function calculateActivity(raw: unknown) {
  const i = activitySchema.parse(raw);
  const gross = i.items.reduce((sum, r) => sum + BigInt(r.price) * BigInt(r.quantity), 0n);
  const marketNet = net(gross, i);
  const revenue = marketNet + BigInt(i.directIncome);
  const profit = revenue - BigInt(i.cost);
  return {
    gross: String(gross),
    marketNet: String(marketNet),
    revenue: String(revenue),
    profit: String(profit),
    perHour: String((profit * 60_000n) / BigInt(Math.round(i.minutes * 1000))),
    perEnergy: i.energy > 0 ? String(profit / BigInt(i.energy)) : null,
  };
}
export function calculateInvestment(raw: unknown) {
  const i = investmentSchema.parse(raw);
  const increase = BigInt(i.nextHourly) - BigInt(i.currentHourly);
  return {
    hourlyIncrease: String(increase),
    hours: increase > 0n ? Number(ceil(BigInt(i.upgradeCost) * 1000n, increase)) / 1000 : null,
    days:
      increase > 0n
        ? Number(ceil(BigInt(i.upgradeCost) * 1000n, increase)) / 1000 / i.dailyHours
        : null,
  };
}
export function calculateTraining(raw: unknown) {
  const i = trainingSchema.parse(raw);
  const hours = i.remainingXp / i.xpPerHour;
  return { hours, sessions: Math.ceil((hours * 60) / i.sessionMinutes) };
}
export function calculateGear(raw: unknown) {
  const i = gearSchema.parse(raw);
  return {
    mainScore: i.mainAp + i.dp,
    awakeScore: i.awakeAp + i.dp,
    upgrades: i.upgrades
      .map((u) => {
        const gain = u.mainApGain + u.dpGain;
        return {
          ...u,
          gain,
          mainScore: i.mainAp + i.dp + gain,
          awakeScore: i.awakeAp + i.dp + u.awakeApGain + u.dpGain,
          costPerPoint: gain > 0 ? String(ceil(BigInt(u.cost), BigInt(gain))) : null,
          affordable: BigInt(u.cost) <= BigInt(i.budget),
        };
      })
      .sort((a, b) => {
        if (a.costPerPoint === null) return b.costPerPoint === null ? 0 : 1;
        if (b.costPerPoint === null) return -1;
        const difference = BigInt(a.costPerPoint) - BigInt(b.costPerPoint);
        return difference < 0n ? -1 : difference > 0n ? 1 : 0;
      }),
  };
}
export function calculateProduction(raw: unknown) {
  const i = productionSchema.parse(raw);
  const recipes = new Map(i.recipes.map((r) => [r.id, r]));
  if (recipes.size !== i.recipes.length) throw new RangeError('IDs de receitas duplicados.');
  const stockKey = (name: string, itemId?: number) =>
    itemId === undefined ? key(name) : `item:${itemId}`;
  const available = new Map<string, number>();
  i.inventory.forEach((r) =>
    available.set(
      stockKey(r.name, r.itemId),
      (available.get(stockKey(r.name, r.itemId)) ?? 0) + r.quantity,
    ),
  );
  const initialStock = new Map(available);
  const rows = new Map<
    string,
    {
      name: string;
      itemId?: number;
      required: number;
      fromStock: number;
      fromSurplus: number;
      purchased: number;
      produced: number;
      cost: bigint;
    }
  >();
  const tasks = new Map<string, { id: string; name: string; crafts: number; produced: number }>();
  let operations = 0;
  const allocations: {
    path: string;
    itemId?: number;
    required: number;
    fromStock: number;
    fromSurplus: number;
    missing: number;
    crafts: number;
    produced: number;
  }[] = [];
  const rowFor = (name: string, itemId?: number) => {
    const k = stockKey(name, itemId);
    let row = rows.get(k);
    if (!row) {
      row = {
        name,
        itemId,
        required: 0,
        fromStock: 0,
        fromSurplus: 0,
        purchased: 0,
        produced: 0,
        cost: 0n,
      };
      rows.set(k, row);
    }
    return row;
  };
  const take = (
    name: string,
    demand: number,
    recipeId: string | null,
    price: string,
    path: string[],
    itemId?: number,
    branchPath = 'root',
  ) => {
    if (++operations > 20_000)
      throw new RangeError(
        'A cadeia excedeu o limite de 20.000 etapas. Simplifique receitas repetidas.',
      );
    if (!Number.isSafeInteger(demand) || demand > 1e12)
      throw new RangeError('A cadeia excedeu o limite de quantidade.');
    const row = rowFor(name, itemId);
    row.required += demand;
    if (!Number.isSafeInteger(row.required) || row.required > 1e12)
      throw new RangeError('A demanda acumulada excedeu o limite de quantidade.');
    const k = stockKey(name, itemId);
    const held = available.get(k) ?? 0;
    const used = Math.min(held, demand);
    available.set(k, held - used);
    const originalUsed = Math.min(initialStock.get(k) ?? 0, used);
    initialStock.set(k, (initialStock.get(k) ?? 0) - originalUsed);
    row.fromStock += originalUsed;
    row.fromSurplus += used - originalUsed;
    const missing = demand - used;
    const allocation = {
      path: branchPath,
      itemId,
      required: demand,
      fromStock: originalUsed,
      fromSurplus: used - originalUsed,
      missing,
      crafts: 0,
      produced: 0,
    };
    allocations.push(allocation);
    if (!missing) return;
    if (!recipeId) {
      row.purchased += missing;
      row.cost += BigInt(price) * BigInt(missing);
      return;
    }
    if (path.includes(recipeId) || path.length >= 30)
      throw new RangeError('Ciclo ou profundidade excessiva na cadeia de crafting.');
    const recipe = recipes.get(recipeId);
    if (!recipe) throw new RangeError('Uma receita vinculada foi removida.');
    if (stockKey(recipe.name, recipe.itemId) !== k)
      throw new RangeError(
        'O nome do ingrediente precisa coincidir com o produto da receita vinculada.',
      );
    const crafts = Math.ceil(missing / recipe.yield);
    recipe.ingredients.forEach((r, index) =>
      take(
        r.name,
        r.quantity * crafts,
        r.recipeId,
        r.price,
        [...path, recipeId],
        r.itemId,
        `${branchPath}/${index}`,
      ),
    );
    const produced = Math.floor(crafts * recipe.yield);
    allocation.crafts = crafts;
    allocation.produced = produced;
    row.produced += produced;
    available.set(k, (available.get(k) ?? 0) + produced - missing);
    const task = tasks.get(recipeId) ?? {
      id: recipeId,
      name: recipe.name,
      crafts: 0,
      produced: 0,
    };
    task.crafts += crafts;
    task.produced += produced;
    tasks.set(recipeId, task);
  };
  const root = recipes.get(i.recipeId);
  if (!root) throw new RangeError('Escolha uma receita existente.');
  take(root.name, i.quantity, root.id, '0', [], root.itemId);
  return {
    target: root.name,
    quantity: i.quantity,
    cost: String([...rows.values()].reduce((sum, r) => sum + r.cost, 0n)),
    rows: [...rows.values()].map((r) => ({ ...r, cost: String(r.cost) })),
    tasks: [...tasks.values()],
    allocations,
  };
}
export const calculators = {
  market: calculateMarket,
  crafting: calculateCrafting,
  enhancement: calculateEnhancement,
  failstack: calculateFailstack,
  box: calculateBox,
  activity: calculateActivity,
  investment: calculateInvestment,
  training: calculateTraining,
  gear: calculateGear,
  production: calculateProduction,
};
export type CalculatorKey = keyof typeof calculators;
export const MODEL_VERSION = '1.0.0';
