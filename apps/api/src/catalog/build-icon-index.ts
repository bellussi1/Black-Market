import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import sharp from 'sharp';

import { iconPath, readIcon, readIconAliases } from './catalog-assets';

async function main() {
  const directory = resolve(process.argv[2] ?? '');
  const checksum = process.argv[3];
  if (!checksum || !/^[a-f0-9]{64}$/.test(checksum))
    throw new Error('Informe a pasta publicada e seu checksum.');
  const target = join(directory, 'icon-index-v1.json');
  try {
    await stat(target);
    console.log('Índice existente, preservado.');
    return;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const aliases = await readIconAliases(directory);
  const paths = new Map<string, number[]>();
  for (const [urn, path] of Object.entries(aliases)) {
    const match = /^urn::item:([1-9]\d*)$/.exec(urn);
    if (match) paths.set(path, [...(paths.get(path) ?? []), Number(match[1])]);
  }
  const hashes = new Map<string, number[]>();
  const rows = [...paths];
  for (let start = 0; start < rows.length; start += 16) {
    const batch = await Promise.all(
      rows.slice(start, start + 16).map(async ([path, ids]) => {
        const bytes = await readIcon(iconPath(directory, path));
        const metadata = await sharp(bytes).metadata();
        if (!metadata.width || !metadata.height) throw new Error('Ícone sem dimensões.');
        const raw = await sharp(bytes)
          .flatten({ background: '#000000' })
          .extract({
            left: 0,
            top: 0,
            width: metadata.width,
            height: Math.max(1, Math.floor(metadata.height * 0.8)),
          })
          .resize(9, 8, { kernel: 'cubic' })
          .grayscale()
          .raw()
          .toBuffer();
        let hash = 0n;
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++)
            hash = (hash << 1n) | (raw[y * 9 + x] > raw[y * 9 + x + 1] ? 1n : 0n);
        return { hash: hash.toString(16).padStart(16, '0'), ids };
      }),
    );
    for (const row of batch) hashes.set(row.hash, [...(hashes.get(row.hash) ?? []), ...row.ids]);
    if (start % 1600 === 0) console.log(`${start}/${rows.length} ícones`);
  }
  const payload = JSON.stringify({
    algorithm: 'dhash-top-v1',
    checksum,
    entries: [...hashes]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hash, ids]) => ({ hash, ids: ids.sort((a, b) => a - b) })),
  });
  await writeFile(target, payload, { flag: 'wx' });
  console.log(`Índice publicado: ${hashes.size} assinaturas, ${Buffer.byteLength(payload)} bytes.`);
  await readFile(target); // fail if publication became unreadable
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Falha ao criar índice.');
  process.exitCode = 1;
});
