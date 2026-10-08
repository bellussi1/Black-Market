import { type CharacterProfile } from './personal';
import { calculateActivity, calculateCrafting } from './tools';
import { type Workspace } from './workspace';
export interface Recommendation {
  id: string;
  name: string;
  kind: 'activity' | 'crafting';
  sourceId: string;
  minutes: number;
  profit: string | null;
  perHour: string | null;
  cashCost: string | null;
  energy: number;
  basis: string;
  warnings: string[];
  materials: { itemId: number; name: string; quantity: number }[];
}
export function recommend(workspace: Workspace, profile: CharacterProfile): Recommendation[] {
  const rows: Recommendation[] = [];
  const quotes = workspace.quotes.filter((row) => row.region === profile.region);
  const price = (id: number | undefined, name: string) =>
    quotes.find((row) => !row.subId && (id && row.itemId ? id === row.itemId : row.name === name));
  for (const session of workspace.sessions.filter((row) => row.region === profile.region)) {
    const input = session.input;
    const minutes = Math.min(
      input.mode === 'afk' ? profile.afkMinutes : profile.activeMinutes,
      input.minutes,
    );
    const factor = minutes / input.minutes;
    const energy = Math.ceil(input.energy * factor);
    const duration = BigInt(Math.round(input.minutes * 1000));
    const span = BigInt(Math.round(minutes * 1000));
    const cost = (BigInt(input.cost) * span + duration - 1n) / duration;
    const warnings = [
      'Estimativa baseada nesta sessão, sem extrapolar bônus de maestria.',
      'O ritmo e a disponibilidade da rota podem mudar.',
    ];
    const matchingMastery =
      !input.skill || input.mastery === undefined || input.mastery === profile.mastery[input.skill];
    if (!matchingMastery)
      warnings.push(
        'Sua maestria atual é diferente da usada nesta sessão. Registre uma sessão com o personagem atual para comparar.',
      );
    let missing = false;
    const items = input.items.map((part) => {
      const quote = price(part.itemId, part.name);
      const value = quote?.price ?? part.price;
      if (value === '0') missing = true;
      if (quote && Date.now() - Date.parse(quote.observedAt) > 30 * 60 * 1000)
        warnings.push('Há cotação antiga em ' + part.name + '.');
      return { ...part, price: value };
    });
    const affordable =
      minutes > 0 && matchingMastery && cost <= BigInt(profile.silver) && energy <= profile.energy;
    if (!affordable)
      warnings.push('Confira tempo, prata, energia e maestria para comparar esta sessão.');
    const result = !missing && affordable ? calculateActivity({ ...input, items }) : null;
    const profit = result ? (BigInt(result.profit) * span) / duration : null;
    rows.push({
      id: 'activity-' + session.id,
      name: input.name,
      kind: 'activity',
      sourceId: session.id,
      minutes,
      profit: profit === null ? null : String(profit),
      perHour: result?.perHour ?? null,
      cashCost: String(cost),
      energy,
      basis: 'Sessão informada pelo jogador',
      warnings: missing ? ['Informe os preços dos itens para comparar.', ...warnings] : warnings,
      materials: [],
    });
  }
  for (const preset of workspace.presets.filter(
    (row) => row.region === profile.region && row.tool === 'crafting',
  )) {
    if (preset.tool !== 'crafting') continue;
    const input = preset.input;
    const warnings = [
      'Rendimento e tempo são os informados no cenário.',
      'Materiais próprios têm custo de oportunidade; o lucro não garante venda imediata.',
    ];
    let missing = false;
    const ingredients = input.ingredients.map((part) => {
      const quote = price(part.itemId, part.name);
      const value = quote?.price ?? part.price;
      if (value === '0') missing = true;
      const total = workspace.inventory
        .filter(
          (row) =>
            row.region === profile.region &&
            (part.itemId && row.itemId ? part.itemId === row.itemId : part.name === row.name),
        )
        .reduce((sum, row) => sum + row.quantity, 0);
      const reserved = workspace.personalPlans
        .filter((plan) => plan.region === profile.region && plan.status === 'reserved')
        .flatMap((plan) => plan.materials)
        .filter((row) => part.itemId === row.itemId)
        .reduce((sum, row) => sum + row.quantity, 0);
      if (quote && Date.now() - Date.parse(quote.observedAt) > 30 * 60 * 1000)
        warnings.push('Há cotação antiga em ' + part.name + '.');
      return { ...part, price: value, owned: Math.max(0, total - reserved) };
    });
    const result =
      !missing && input.salePrice !== '0' ? calculateCrafting({ ...input, ingredients }) : null;
    const eligible =
      result &&
      input.minutes <= profile.activeMinutes &&
      BigInt(result.cashCost) <= BigInt(profile.silver);
    if (result && !eligible)
      warnings.push('Este lote exige mais tempo ou prata do que você informou.');
    rows.push({
      id: 'crafting-' + preset.id,
      name: preset.name,
      kind: 'crafting',
      sourceId: preset.id,
      minutes: input.minutes,
      profit: eligible ? result.profit : null,
      perHour: eligible ? result.profitPerHour : null,
      cashCost: result?.cashCost ?? null,
      energy: 0,
      basis: 'Cenário de produção salvo',
      warnings:
        missing || input.salePrice === '0'
          ? ['Preencha os preços de venda e materiais.', ...warnings]
          : warnings,
      materials: ingredients
        .filter((part) => part.itemId)
        .map((part) => ({
          itemId: part.itemId!,
          name: part.name,
          quantity: Math.ceil(part.quantity * input.crafts),
        })),
    });
  }
  return rows.sort((a, b) =>
    a.perHour === null
      ? b.perHour === null
        ? 0
        : 1
      : b.perHour === null
        ? -1
        : BigInt(a.perHour) > BigInt(b.perHour)
          ? -1
          : BigInt(a.perHour) < BigInt(b.perHour)
            ? 1
            : 0,
  );
}
