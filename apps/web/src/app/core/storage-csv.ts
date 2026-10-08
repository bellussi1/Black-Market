export interface StorageCsvRow {
  itemId: number;
  quantity: number;
  location: string;
  target?: number;
  price?: string;
}

export class StorageCsvError extends Error {}

/** CSV with quoted cells and escaped quotes; reference data is resolved by the API. */
export function parseStorageCsv(text: string): StorageCsvRow[] {
  if (text.length > 200_000) throw new StorageCsvError($localize`O CSV aceita até 200 KB.`);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === ';') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      if (character === '\r' && input[index + 1] === '\n') index += 1;
    } else {
      cell += character;
    }
    if (rows.length > 501 || row.length > 5)
      throw new StorageCsvError($localize`O CSV aceita até 500 itens e cinco colunas.`);
  }
  if (quoted) throw new StorageCsvError($localize`O CSV contém aspas sem fechamento.`);
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const header = rows.shift()?.map((value) => value.trim());
  if (header?.join(';') !== 'itemId;quantidade;local;meta;preco') {
    throw new StorageCsvError(
      $localize`Use as colunas itemId;quantidade;local;meta;preco. Baixe o modelo para começar.`,
    );
  }
  if (!rows.length || rows.length > 500)
    throw new StorageCsvError($localize`Informe entre 1 e 500 itens.`);
  const seen = new Set<string>();
  return rows.map((values, index) => {
    const [rawId, rawQuantity, rawLocation, rawTarget, rawPrice] = values.map((value) =>
      value.trim(),
    );
    const itemId = Number(rawId);
    const quantity = Number(rawQuantity);
    const location = rawLocation?.normalize('NFC');
    if (
      values.length !== 5 ||
      !/^[1-9]\d*$/.test(rawId || '') ||
      !/^\d+$/.test(rawQuantity || '') ||
      !Number.isSafeInteger(itemId) ||
      itemId > 2147483647 ||
      quantity > 1e9 ||
      !location ||
      location.length > 140
    ) {
      throw new StorageCsvError($localize`Linha ${index + 2}. Confira ID, quantidade e local.`);
    }
    if (rawTarget && (!/^\d+$/.test(rawTarget) || Number(rawTarget) > 1e9)) {
      throw new StorageCsvError(
        $localize`Linha ${index + 2}. A meta deve ser um inteiro de 0 a 1 bilhão.`,
      );
    }
    if (rawPrice && !/^\d{1,24}$/.test(rawPrice)) {
      throw new StorageCsvError($localize`Linha ${index + 2}. Informe prata sem separadores.`);
    }
    const key = `${itemId}:${location.toLocaleLowerCase('pt-BR')}`;
    if (seen.has(key))
      throw new StorageCsvError($localize`Linha ${index + 2}. Item e local repetidos.`);
    seen.add(key);
    return {
      itemId,
      quantity,
      location,
      target: rawTarget ? Number(rawTarget) : undefined,
      price: rawPrice || undefined,
    };
  });
}
