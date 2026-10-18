import { type Workspace, workspaceSchema } from '../../core/workspace-models';

type Snapshot = Pick<
  Workspace,
  'inventory' | 'characters' | 'screenshotImports' | 'region' | 'demonstration'
>;
type Stock = Workspace['inventory'][number];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const stockIdentity = (row: Stock) =>
  JSON.stringify([
    row.region,
    row.kind ?? 'storage',
    row.characterId ?? '',
    row.kind === 'inventory' ? '' : row.location.trim().toLocaleLowerCase('pt-BR'),
    row.itemId === undefined
      ? `name:${row.name.trim().toLocaleLowerCase('pt-BR')}`
      : `id:${row.itemId}`,
  ]);
const byId = <T extends { id: string }>(rows: readonly T[]) =>
  new Map(rows.map((row) => [row.id, row]));
const conflict = () =>
  new Error(
    'Os dados afetados pela importação foram alterados depois. Nada foi desfeito. Confira os valores atuais ou recupere um backup.',
  );

/** Session-only values: no screenshots, URLs or changes to the persisted workspace schema. */
export interface ScanImportUndo {
  readonly region: Workspace['region'];
  readonly before: Snapshot;
  readonly after: Snapshot;
}

export function createScanImportUndo(before: Workspace, after: Workspace): ScanImportUndo {
  const snapshot = (state: Workspace): Snapshot =>
    structuredClone({
      region: state.region,
      demonstration: state.demonstration,
      inventory: state.inventory,
      characters: state.characters,
      screenshotImports: state.screenshotImports,
    });
  return { region: after.region, before: snapshot(before), after: snapshot(after) };
}

/** Compare before changing anything; unrelated rows and character fields always come from current. */
export function undoScanImport(current: Workspace, token: ScanImportUndo): Workspace {
  const { before, after } = token;
  if (current.region !== after.region)
    throw new Error('Volte à região da importação para desfazer o lote.');
  if (!same(current.demonstration, after.demonstration))
    throw new Error('O contexto de demonstração ou dados pessoais mudou. Nada foi desfeito.');
  if (!same(current.screenshotImports, after.screenshotImports))
    throw new Error('O histórico de importações mudou depois deste lote. Nada foi desfeito.');

  const oldStock = byId(before.inventory),
    importedStock = byId(after.inventory),
    currentStock = byId(current.inventory);
  const changedIds = new Set(
    [...new Set([...oldStock.keys(), ...importedStock.keys()])].filter(
      (id) => !same(oldStock.get(id), importedStock.get(id)),
    ),
  );
  for (const id of changedIds)
    if (!same(currentStock.get(id), importedStock.get(id))) throw conflict();

  // Also catch replacement IDs or duplicate rows representing the same physical stock identity.
  const identities = new Set(
    [...before.inventory, ...after.inventory]
      .filter((row) => changedIds.has(row.id))
      .map(stockIdentity),
  );
  const relevant = (rows: Stock[]) =>
    rows
      .filter((row) => identities.has(stockIdentity(row)))
      .sort((a, b) => a.id.localeCompare(b.id));
  if (!same(relevant(current.inventory), relevant(after.inventory))) throw conflict();
  const inventory = current.inventory.filter((row) => !changedIds.has(row.id));
  inventory.push(...before.inventory.filter((row) => changedIds.has(row.id)));

  const oldProfiles = byId(before.characters),
    importedProfiles = byId(after.characters);
  const currentProfiles = byId(current.characters);
  const characters = [...current.characters];
  for (const id of new Set([...oldProfiles.keys(), ...importedProfiles.keys()])) {
    const old = oldProfiles.get(id),
      imported = importedProfiles.get(id),
      profile = currentProfiles.get(id);
    if (same(old, imported)) continue;
    if (!old || !imported) {
      if (!same(profile, imported)) throw conflict();
      const index = characters.findIndex((row) => row.id === id);
      if (index >= 0) characters.splice(index, 1);
      if (old) characters.push(old);
      continue;
    }
    if (!profile) throw conflict();
    const restored = { ...profile };
    for (const key of new Set([...Object.keys(old), ...Object.keys(imported)])) {
      const field = key as keyof typeof old;
      if (same(old[field], imported[field])) continue;
      if (!same(profile[field], imported[field])) throw conflict();
      // Record assignment keeps the field's original runtime type; the full result is schema-validated below.
      if (Object.hasOwn(old, field)) Object.assign(restored, { [field]: old[field] });
      else Reflect.deleteProperty(restored, field);
    }
    characters[characters.findIndex((row) => row.id === id)] = restored;
  }
  const candidate = {
    ...current,
    inventory,
    characters,
    screenshotImports: structuredClone(before.screenshotImports),
  };
  const parsed = workspaceSchema.safeParse(candidate);
  if (!parsed.success)
    throw new Error(
      'Não é possível desfazer com os planos e reservas atuais. Revise os planos ou recupere um backup. Nada foi alterado.',
    );
  return parsed.data;
}
