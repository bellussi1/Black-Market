import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout } from 'node:timers/promises';
import { resolve } from 'node:path';
// Native HTTP regression check. No game provider, cloud credential or DB required.
const port = 4399;
const publicOrigin = 'https://black-market.example';
const apiRequests = [];
const api = createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;
  apiRequests.push(path);
  response.setHeader('Content-Type', 'application/json');
  if (path === '/api/v1/catalog/sitemap.xml') {
    response.setHeader('Content-Type', 'application/xml');
    response.end(
      '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://black-market.example/sitemaps/public/1.xml</loc></sitemap></sitemapindex>',
    );
    return;
  }
  if (path === '/api/v1/catalog/sitemaps/public/1') {
    response.setHeader('Content-Type', 'application/xml');
    response.end(
      '<?xml version="1.0"?><urlset><url><loc>https://black-market.example/</loc></url></urlset>',
    );
    return;
  }
  if (path === '/api/v1/categories') {
    response.end(JSON.stringify({ categories: [], dataset: null }));
    return;
  }
  if (path === '/api/v1/items') {
    response.end(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 48, dataset: null }));
    return;
  }
  if (path === '/api/v1/recipes') {
    response.end(JSON.stringify({ recipes: [], total: 0, page: 1, pageSize: 24, dataset: null }));
    return;
  }
  if (path === '/api/v1/market/board') {
    response.end(
      JSON.stringify({
        source: 'arsha',
        region: 'sa',
        locale: 'pt',
        fetchedAt: '2026-10-09T12:00:00Z',
        cacheStatus: 'cached',
        upstreamCacheMinutes: 30,
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        categories: [],
      }),
    );
    return;
  }
  if (path === '/api/v1/items/5301' || path === '/api/v1/items/5301/recipes') {
    const dataset = {
      version: 'ssr-recipe-fixture',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      itemCount: 1,
      recipeCount: 1,
      importedAt: '2026-10-09T12:00:00Z',
    };
    const item = {
      id: 5301,
      name: 'Reagente Líquido Limpo',
      description: 'Produção por Alquimia.',
      icon: null,
      iconUrl: null,
      categories: [],
      category: 'Material',
      sourceData: {},
    };
    response.end(
      JSON.stringify(
        path.endsWith('/recipes')
          ? {
              recipes: [
                {
                  key: 'a'.repeat(64),
                  type: 'ALCHEMY',
                  station: null,
                  inputs: [{ itemId: 9001, name: 'Sal', quantity: '2' }],
                  outputs: [{ itemId: 5301, name: item.name, quantity: null }],
                },
              ],
              total: 1,
              direction: 'produces',
              dataset,
            }
          : { item, dataset },
      ),
    );
    return;
  }
  if (path === '/api/v1/reference') {
    response.end(
      JSON.stringify({ kinds: [{ kind: 'npcs', label: 'NPCs', total: 0 }], updatedAt: null }),
    );
    return;
  }
  if (path === '/api/v1/reference/npcs') {
    response.end(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 24, updatedAt: null }));
    return;
  }
  if (path === '/api/v1/world/nodes') {
    response.end(JSON.stringify({ nodes: [] }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ message: 'Not Found' }));
});
await new Promise((resolveListen) => api.listen(4398, '127.0.0.1', resolveListen));
const child = spawn(process.execPath, [resolve('apps/web/dist/web/server/server.mjs')], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    API_BASE_URL: 'http://127.0.0.1:4398',
    PUBLIC_SITE_URL: publicOrigin,
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let exited = false;
let serverErrors = '';
child.on('exit', () => {
  exited = true;
});
child.stderr.on('data', (chunk) => {
  serverErrors = (serverErrors + chunk.toString()).slice(-4000);
});
const request = (path, init = {}) =>
  fetch(`http://127.0.0.1:${port}${path}`, {
    ...init,
    headers: {
      host: 'black-market.example',
      'x-forwarded-proto': 'https',
      ...init.headers,
    },
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 50 && !exited; attempt++) {
    try {
      const response = await request('/robots.txt');
      ready = response.ok;
    } catch {
      /* Starting. */
    }
    if (ready) break;
    await setTimeout(100);
  }
  assert.ok(ready, 'SSR process did not start');
  const robots = await request('/robots.txt');
  assert.ok(
    (await robots.text()).includes(`Sitemap: ${publicOrigin}/sitemap.xml`),
    'robots.txt must advertise the configured sitemap',
  );

  for (const [path, title] of [
    ['/', 'BLACK MARKET'],
    ['/market', 'Mercado Central'],
    ['/recipes', 'Explorar receitas e origens'],
    ['/crafting', 'Calcular produção'],
    ['/recipes/items/5301', 'Reagente Líquido Limpo'],
    ['/market/items/5301', 'Reagente Líquido Limpo'],
    ['/contato', 'Contato'],
    ['/termos', 'Termos de Uso'],
    ['/privacidade', 'Política de Privacidade'],
    ['/cookies', 'Cookies e armazenamento'],
    ['/sobre', 'Seus próximos passos'],
  ]) {
    const response = await request(path);
    assert.equal(
      response.status,
      200,
      `SSR ${path}; API calls: ${apiRequests.join(', ')}; stderr: ${serverErrors}`,
    );
    const html = await response.text();
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `Expected one page heading for ${path}`);
    assert.ok(html.includes(title), `Missing expected content for ${path}`);
    assert.ok(/<html[^>]*lang="pt-BR"/.test(html), `Missing Portuguese locale on ${path}`);
    assert.equal((html.match(/<meta name="description"/g) ?? []).length, 1);
    if (path === '/') {
      assert.match(
        html,
        /<meta name="description" content="[^\"]*Black Desert Online[^\"]*sem afiliação com a Pearl Abyss/i,
        'Home search description must disclose non-affiliation beside the game name',
      );
    }
    assert.ok(
      html.includes('<meta name="robots" content="index,follow"'),
      `Missing indexable robots metadata on ${path}: ${html.match(/<head>([\s\S]*?)<\/head>/)?.[1]?.slice(0, 1200) ?? 'head missing'}\n${serverErrors}`,
    );
    assert.equal((html.match(/<link rel="canonical"/g) ?? []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="${publicOrigin}${path}"`));
    assert.ok(html.includes(`property="og:url" content="${publicOrigin}${path}"`));
    assert.ok(html.includes(`property="og:image" content="${publicOrigin}/og-black-market.png"`));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes('application/ld+json'));
    if (path === '/sobre') {
      assert.match(
        html,
        /<meta name="description" content="[^"]*Black Desert[^"]*sem afiliação com a Pearl Abyss/i,
        'About metadata must disclose non-affiliation beside the game name',
      );
      assert.match(
        html,
        /independente[^<]*Black Desert Online[^<]*sem afiliação com a Pearl Abyss/i,
        'About intro must disclose non-affiliation beside the game name',
      );
    }
    assert.match(html, /<main\b/);
    assert.ok(response.headers.has('content-security-policy'));
    if (path !== '/sobre') {
      const footer = html.match(
        /<footer\b[^>]*class="[^"]*\bplatform-footer\b[^"]*"[^>]*>[\s\S]*?<\/footer>/,
      )?.[0];
      assert.ok(footer, `Missing footer for ${path}`);
      for (const target of ['/termos', '/privacidade', '/cookies', '/contato']) {
        assert.ok(footer.includes(`href="${target}"`), `Missing legal footer link for ${path}`);
      }
      assert.ok(
        footer.includes(String(new Date().getUTCFullYear())),
        'Missing current copyright year',
      );
      assert.ok(footer.includes('Preferências de privacidade'), 'Missing privacy action');
    }
    for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (script[2].trim() && !/type=["']application\/(?:json|ld\+json)["']/.test(script[1]))
        assert.fail(`Executable inline script incompatible with CSP on ${path}`);
    }
  }

  const llms = await request('/llms.txt');
  assert.equal(llms.status, 200);
  assert.match(
    await llms.text(),
    /Black Desert Online[^\n]*sem afiliação com a Pearl Abyss/i,
    'Public LLM guidance must disclose non-affiliation beside the game name',
  );

  for (const path of ['/reference/npcs', '/world', '/demo']) {
    const response = await request(path, { redirect: 'manual' });
    assert.ok(
      [301, 302, 303, 307, 308].includes(response.status),
      `Suspended route ${path} must redirect`,
    );
    assert.equal(response.headers.get('location'), '/');
  }
  const inventory = await request('/inventory');
  assert.equal(inventory.headers.get('x-robots-tag'), 'noindex,nofollow');
  const account = await request('/account');
  assert.equal(account.status, 200);
  assert.equal(account.headers.get('x-robots-tag'), 'noindex,nofollow');
  assert.equal(account.headers.get('cache-control'), 'private,no-store');
  const personal = await request('/profile');
  assert.equal(personal.status, 200);
  assert.equal(personal.headers.get('x-robots-tag'), 'noindex,nofollow');
  const family = await request('/family');
  assert.equal(family.status, 200);
  assert.equal(family.headers.get('x-robots-tag'), 'noindex,nofollow');
  assert.equal(family.headers.get('cache-control'), 'private,no-store');
  const settings = await request('/settings');
  assert.equal(settings.headers.get('x-robots-tag'), 'noindex,nofollow');
  const plans = await request('/plans');
  assert.equal(plans.status, 200);
  assert.equal(plans.headers.get('x-robots-tag'), 'noindex,nofollow');
  assert.equal(plans.headers.get('cache-control'), 'private,no-store');
  const lifeskills = await request('/lifeskills');
  assert.equal(lifeskills.status, 200);
  assert.equal(lifeskills.headers.get('x-robots-tag'), null);
  assert.equal(lifeskills.headers.get('cache-control'), 'private, max-age=0, must-revalidate');
  const lifeskillsHtml = await lifeskills.text();
  assert.ok(lifeskillsHtml.includes('Meça seu rendimento.'));
  assert.ok(lifeskillsHtml.includes('Comece sem conta'));

  const unknown = await request('/not-a-real-page');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.headers.get('x-robots-tag'), 'noindex,nofollow');
  const unknownHtml = await unknown.text();
  assert.ok(unknownHtml.includes('Esta página não existe.'));
  assert.ok(unknownHtml.includes('<meta name="robots" content="noindex,nofollow"'));

  const trailing = await request('/market/', { redirect: 'manual' });
  assert.equal(trailing.status, 308);
  assert.equal(trailing.headers.get('location'), '/market');
  const aboutTrailing = await request('/sobre/', { redirect: 'manual' });
  assert.equal(aboutTrailing.status, 308);
  assert.equal(aboutTrailing.headers.get('location'), '/sobre');
  for (const [from, to] of [
    ['/database/items', '/market'],
    ['/database/items/5301?region=sa', '/market/items/5301?region=sa'],
  ]) {
    const alias = await request(from, { redirect: 'manual' });
    assert.equal(alias.status, 308);
    assert.equal(alias.headers.get('location'), to);
  }

  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<sitemapindex/);
  const sitemapPage = await request('/sitemaps/public/1.xml');
  assert.equal(sitemapPage.status, 200);
  assert.match(await sitemapPage.text(), /<urlset/);

  const socialImage = await request('/og-black-market.png');
  assert.equal(socialImage.status, 200);
  assert.equal(socialImage.headers.get('content-type'), 'image/png');
  const imageBytes = Buffer.from(await socialImage.arrayBuffer());
  assert.equal(imageBytes.readUInt32BE(16), 1200);
  assert.equal(imageBytes.readUInt32BE(20), 630);

  const missingItem = await request('/market/items/999999');
  assert.equal(missingItem.status, 404);
  console.log(
    'SSR smoke: public routes, metadata, social card, sitemap, canonical redirects, 404 and private noindex passed.',
  );
} finally {
  child.kill();
  await new Promise((resolveClose) => api.close(resolveClose));
}
