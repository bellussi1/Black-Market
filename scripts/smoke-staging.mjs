import assert from 'node:assert/strict';

const origin = process.env.STAGING_URL ?? 'http://localhost:8081';
const base = new URL(origin);
assert.ok(['http:', 'https:'].includes(base.protocol), 'Informe uma origem HTTP(S).');
assert.ok(!base.username && !base.password, 'Não coloque credenciais no endereço.');

async function request(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, `${path}: sem noindex`);
  return response;
}

await request('/ready');
const robots = await (await request('/robots.txt')).text();
assert.match(robots, /Disallow: \/(?:\r?\n|$)/);
for (const path of ['/', '/recipes', '/market/items/1407']) {
  const html = await (await request(path)).text();
  assert.match(html, /<html/i, `${path}: resposta não é HTML`);
}
const detail = await (await request('/api/v1/items/1407')).json();
assert.equal(detail.item.id, 1407);
assert.ok(
  detail.item.iconUrl,
  'Ícone do catálogo ausente. Verifique a cópia e as permissões dos assets.',
);
assert.ok(detail.item.iconUrl.startsWith('/api/v1/items/'), 'Esperado ícone local de staging.');
const icon = await request(detail.item.iconUrl);
assert.match(icon.headers.get('content-type') ?? '', /image\/webp/);
assert.ok((await icon.arrayBuffer()).byteLength > 0, 'Ícone vazio.');
const recipes = await (await request('/api/v1/items/1407/recipes')).json();
assert.ok(
  Array.isArray(recipes.recipes) && recipes.recipes.length > 0,
  'Receitas do item de referência ausentes.',
);
console.log(
  `Staging verificado: ${base.origin} — HTTP, SSR, catálogo, ícone e bloqueio de indexação.`,
);
