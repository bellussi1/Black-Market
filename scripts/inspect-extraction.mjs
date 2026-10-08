import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [input, output = 'docs/extracted-data-inventory.md'] = process.argv.slice(2);
if (!input) throw new Error('Informe o diretório da extração.');
const directory = resolve(input);
const manifest = JSON.parse(await readFile(resolve(directory, '.build-outputs.json'), 'utf8'));
const reports = [];
const fieldsOf = (values) =>
  [
    ...new Set(
      values.flatMap((value) =>
        value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [],
      ),
    ),
  ].sort();
for (const filename of manifest.files) {
  if (!/^[a-z_]+\.json$/.test(filename)) throw new Error('Nome inesperado no manifesto.');
  const path = resolve(directory, filename);
  let bytes = await readFile(path);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  let data = JSON.parse(bytes.toString('utf8'));
  const size = (await stat(path)).size;
  const collections = [];
  if (Array.isArray(data)) {
    collections.push({ path: 'raiz', count: data.length, fields: fieldsOf(data) });
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value))
        collections.push({ path: key, count: value.length, fields: fieldsOf(value) });
      else if (value && typeof value === 'object') {
        collections.push({
          path: key,
          count: Object.keys(value).length,
          fields: fieldsOf(Object.values(value)),
        });
      }
    }
  }
  reports.push({
    filename,
    size,
    checksum,
    fields: Array.isArray(data) ? [] : Object.keys(data),
    collections,
  });
  data = null;
  bytes = null;
  globalThis.gc?.();
}
const integrated = new Set(['items.json', 'recipes.json', 'marketcategories.json']);
const references = new Set([
  'adventure_journals.json',
  'caphras.json',
  'character_progression.json',
  'characters.json',
  'class_skills.json',
  'crystal_rules.json',
  'fishingspots.json',
  'item_enhancements.json',
  'item_improvements.json',
  'item_sets.json',
  'knowledge.json',
  'life_skill_progression.json',
  'lightstone_combinations.json',
  'manufacture.json',
  'mastery.json',
  'npcs.json',
  'quests.json',
  'world.json',
  'zones.json',
]);
const selectedSections = {
  'adventure_journals.json': ['journals', 'bonuses'],
  'character_progression.json': ['classes'],
  'class_skills.json': ['groups', 'trees'],
  'crystal_rules.json': ['groups'],
  'item_improvements.json': ['rows'],
  'knowledge.json': ['entries', 'themes'],
  'lightstone_combinations.json': ['combinations'],
  'mastery.json': ['cooking', 'alchemy', 'processing'],
  'world.json': ['nodes', 'regions', 'territories'],
};
const referenceCollections = reports
  .filter((report) => references.has(report.filename))
  .flatMap((report) =>
    report.collections.filter((collection) =>
      (selectedSections[report.filename] ?? ['raiz']).includes(collection.path),
    ),
  );
const referenceCount = referenceCollections.reduce((sum, collection) => sum + collection.count, 0);
const lines = [
  '# Inventário dos dados extraídos',
  '',
  'Relatório gerado pela leitura dos arquivos reais listados em `.build-outputs.json`. Contagens descrevem a extração, não comprovam cobertura integral do jogo. Campos são preservados como encontrados; tabelas, probabilidades e relações ainda precisam de validação antes de virar funcionalidades.',
  '',
  `Itens, receitas e categorias estão integrados. Coleções selecionadas de ${references.size} outros arquivos alimentam ${referenceCollections.length} tipos de referência (${referenceCount.toLocaleString('pt-BR')} registros nesta extração). A integração preserva dados originais; não significa que todos os campos estejam interpretados ou participem de cálculos. Metadados e mapa-base continuam locais. Ícones de itens têm publicação separada. Os arquivos não contêm o armazém, a prata ou os equipamentos pessoais de uma conta.`,
  '',
  '| Arquivo | Tamanho | Coleções / registros | Situação |',
  '| --- | ---: | --- | --- |',
  ...reports.map(
    (report) =>
      `| ${report.filename} | ${(report.size / 1024 / 1024).toFixed(2)} MB | ${report.collections.map((collection) => `${collection.path}: ${collection.count}`).join('; ') || 'metadados'} | ${integrated.has(report.filename) ? 'Integrado' : references.has(report.filename) ? 'Referências selecionadas integradas' : 'Metadados locais'} |`,
  ),
  '',
  '## Campos por conjunto',
  '',
];
for (const report of reports) {
  lines.push(`### ${report.filename}`, '', `SHA-256: \`${report.checksum}\``, '');
  if (report.fields.length)
    lines.push(`Campos na raiz: ${report.fields.map((field) => `\`${field}\``).join(', ')}.`, '');
  for (const collection of report.collections) {
    lines.push(
      `**${collection.path}** — ${collection.count} registros.`,
      '',
      collection.fields.length
        ? collection.fields.map((field) => `\`${field}\``).join(', ') + '.'
        : 'Valores simples ou coleções vazias.',
      '',
    );
  }
}
lines.push(
  '## Como atualizar este relatório',
  '',
  'Executar com Node e `--expose-gc` para liberar memória entre arquivos grandes:',
  '',
  '```powershell',
  'node --expose-gc scripts/inspect-extraction.mjs <diretorio-da-extracao>',
  '```',
  '',
  'O script apenas lê a extração e grava este relatório; não publica dados nem altera a instalação do jogo.',
  '',
);
await writeFile(resolve(output), lines.join('\n'));
process.stdout.write(`Inventário escrito: ${reports.length} conjuntos.\n`);
