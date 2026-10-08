import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { iconPath, readIcon, readIconAliases } from './catalog-assets';
import { colorFingerprint } from './icon-fingerprint';

async function main() {
  const directory = resolve(process.argv[2] ?? '');
  const checksum = process.argv[3];
  if (!checksum || !/^[a-f0-9]{64}$/.test(checksum))
    throw new Error('Informe a pasta publicada e seu checksum.');
  const target = join(directory, 'icon-index-v2.json');
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
  const entries: { rgb: string; ids: number[] }[] = [];
  const rows = [...paths];
  for (let start = 0; start < rows.length; start += 16) {
    const batch = await Promise.all(
      rows.slice(start, start + 16).map(async ([path, ids]) => {
        const bytes = await readIcon(iconPath(directory, path));
        return { rgb: await colorFingerprint(bytes), ids: ids.sort((a, b) => a - b) };
      }),
    );
    // Keep each source icon separate. Equal perceptual hashes do not prove shared identity.
    entries.push(...batch);
    if (start % 1600 === 0) console.log(`${start}/${rows.length} ícones`);
  }
  const payload = JSON.stringify({
    algorithm: 'rgb-top-v2',
    checksum,
    entries,
  });
  await writeFile(target, payload, { flag: 'wx' });
  console.log(
    `Índice publicado: ${entries.length} assinaturas, ${Buffer.byteLength(payload)} bytes.`,
  );
  await readFile(target); // fail if publication became unreadable
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Falha ao criar índice.');
  process.exitCode = 1;
});
