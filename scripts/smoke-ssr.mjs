import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { resolve } from 'node:path';
// Native HTTP regression check. No browser, game provider, cloud credential or DB required.
const port = 4399;
const child = spawn(process.execPath, [resolve('apps/web/dist/web/server/server.mjs')], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    API_BASE_URL: 'http://127.0.0.1:4398',
    PUBLIC_SITE_URL: `http://localhost:${port}`,
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let exited = false;
child.on('exit', () => {
  exited = true;
});
child.stderr.on('data', () => {
  /* Details stay out of test output. Assertions expose only status. */
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 50 && !exited; attempt++) {
    try {
      const response = await fetch(`http://localhost:${port}/robots.txt`);
      ready = response.ok;
    } catch {
      /* Starting. */
    }
    if (ready) break;
    await setTimeout(100);
  }
  assert.ok(ready, 'SSR process did not start');
  for (const [path, title] of [
    ['/', 'BLACK MARKET'],
    ['/contato', 'enzobellussi3@gmail.com'],
    ['/termos', 'Termos de Uso'],
  ]) {
    const response = await fetch(`http://localhost:${port}${path}`);
    assert.equal(response.status, 200, `SSR ${path}`);
    const html = await response.text();
    assert.ok(html.includes('<h1'), `Missing public HTML for ${path}`);
    assert.ok(html.includes(title), `Missing expected content for ${path}`);
    assert.ok(response.headers.has('content-security-policy'));
    for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (script[2].trim() && !/type=["']application\/(?:json|ld\+json)["']/.test(script[1]))
        assert.fail(`Executable inline script incompatible with CSP on ${path}`);
    }
  }
  const personal = await fetch(`http://localhost:${port}/profile`);
  assert.equal(personal.status, 200);
  assert.equal(personal.headers.get('x-robots-tag'), 'noindex,nofollow');
  console.log('SSR smoke: Home, contact, terms, headers and personal noindex passed.');
} finally {
  child.kill();
}
