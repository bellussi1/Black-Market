import assert from 'node:assert/strict';

const originArgument = process.argv.find((argument) => argument.startsWith('--url='));
const origin =
  originArgument?.slice('--url='.length) ?? process.env.STAGING_URL ?? 'http://localhost:8081';
const requireSocialAuth = process.argv.includes('--require-social-auth');
const authOnly = process.argv.includes('--auth-only');
const base = new URL(origin);
assert.ok(['http:', 'https:'].includes(base.protocol), 'Informe uma origem HTTP(S).');
assert.ok(!base.username && !base.password, 'Não coloque credenciais no endereço.');

async function request(path, { requireNoindex = true } = {}) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  if (requireNoindex)
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, `${path}: sem noindex`);
  return response;
}

async function assertSocialAuthReady(requireNoindex = true) {
  const identity = await (await request('/api/v1/identity/config', { requireNoindex })).json();
  assert.equal(identity.enabled, true, 'Firebase Authentication está desativado.');
  assert.equal(identity.googleEnabled, true, 'O login Google está desativado.');
  assert.equal(identity.steamEnabled, true, 'O login Steam está desativado.');
}

if (authOnly) {
  assert.ok(requireSocialAuth, 'Use --require-social-auth com --auth-only.');
  await assertSocialAuthReady(false);
  console.log(`Autenticação social verificada: ${base.origin} — Google e Steam ativos.`);
} else {
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
  if (requireSocialAuth) await assertSocialAuthReady();

  const authResult = requireSocialAuth ? ' Google e Steam ativos.' : '';
  console.log(
    `Ambiente verificado: ${base.origin} — HTTP, SSR, catálogo, ícone e bloqueio de indexação.${authResult}`,
  );
}
