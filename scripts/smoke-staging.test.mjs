import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';

async function runSmoke(identityConfig, requireSocialAuth, authOnly = false) {
  const server = createServer((request, response) => {
    response.setHeader('x-robots-tag', 'noindex');

    if (authOnly && request.url !== '/api/v1/identity/config') {
      response.statusCode = 404;
      response.end('not found');
    } else if (request.url === '/ready') {
      response.end('ready');
    } else if (request.url === '/robots.txt') {
      response.end('User-agent: *\nDisallow: /');
    } else if (request.url === '/api/v1/identity/config') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(identityConfig));
    } else if (request.url === '/api/v1/items/1407') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ item: { id: 1407, iconUrl: '/api/v1/items/1407/icon' } }));
    } else if (request.url === '/api/v1/items/1407/icon') {
      response.setHeader('content-type', 'image/webp');
      response.end(Buffer.from([0x52, 0x49, 0x46, 0x46]));
    } else if (request.url === '/api/v1/items/1407/recipes') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ recipes: [{ id: 'recipe-1' }] }));
    } else if (['/', '/recipes', '/market/items/1407'].includes(request.url)) {
      response.setHeader('content-type', 'text/html');
      response.end('<html><body>Black Market</body></html>');
    } else {
      response.statusCode = 404;
      response.end('not found');
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    const args = ['scripts/smoke-staging.mjs'];
    if (requireSocialAuth) args.push('--require-social-auth');
    if (authOnly) args.push('--auth-only');

    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, STAGING_URL: `http://127.0.0.1:${address.port}` },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
      child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, stdout, stderr }));
    });

    return result;
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const allProvidersEnabled = {
  enabled: true,
  googleEnabled: true,
  steamEnabled: true,
};

for (const [provider, config] of [
  ['Google', { ...allProvidersEnabled, googleEnabled: false }],
  ['Steam', { ...allProvidersEnabled, steamEnabled: false }],
]) {
  test(`authenticated smoke fails when ${provider} is disabled`, async () => {
    const result = await runSmoke(config, true);

    assert.notEqual(result.code, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(provider, 'i'));
  });
}

test('authenticated smoke passes only when Google and Steam are enabled', async () => {
  const result = await runSmoke(allProvidersEnabled, true);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Google e Steam/i);
});

test('local auth-only smoke checks the API without requiring SSR routes', async () => {
  const result = await runSmoke(allProvidersEnabled, true, true);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Google e Steam ativos/i);
});

test('the default staging smoke does not require external auth credentials', async () => {
  const result = await runSmoke(
    { enabled: false, googleEnabled: false, steamEnabled: false },
    false,
  );

  assert.equal(result.code, 0, result.stderr);
});
