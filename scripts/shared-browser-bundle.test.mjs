import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webDirectory = fileURLToPath(new URL('../apps/web/', import.meta.url));
const requireBuild = createRequire(
  realpathSync(new URL('../apps/web/node_modules/@angular/build/package.json', import.meta.url)),
);
const { build } = requireBuild('esbuild');

async function bundle(contents, options = {}) {
  const result = await build({
    absWorkingDir: webDirectory,
    stdin: { contents, resolveDir: webDirectory, sourcefile: 'shared-consumer.mjs' },
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
    metafile: true,
    ...options,
  });
  return result;
}

test('a basic shared browser import excludes unused tutorials and synthetic profiles', async () => {
  const result = await bundle("export { DEFAULT_REGION } from '@bdo/shared';");
  const retained = Object.values(result.metafile.outputs).flatMap((output) =>
    Object.entries(output.inputs).filter(([, input]) => input.bytesInOutput > 0),
  );
  assert.equal(
    retained.some(([path]) => /\/(tutorials|staging-test-profile)\.js$/.test(path)),
    false,
    'unrelated shared imports must not retain tutorial initialization or demo data',
  );
  const exports = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  assert.equal(exports.DEFAULT_REGION, 'sa');
});

test('shell entry points keep tutorial and demo exports behind the dynamic import', async () => {
  const result = await bundle(
    `export { DEFAULT_REGION } from '@bdo/shared/markets';
     export { isMvpPathEnabled } from '@bdo/shared/mvp-scope';
     export const loadTools = () => import('@bdo/shared');`,
    { splitting: true, outdir: 'bundle-output' },
  );
  const outputs = new Map(
    Object.entries(result.metafile.outputs).map(([path, output]) => [
      resolve(webDirectory, path),
      output,
    ]),
  );
  const entry = [...outputs].find(([, output]) => output.entryPoint === 'shared-consumer.mjs');
  assert.ok(entry, 'the consumer entry must be present');
  const visited = new Set();
  const pending = [entry[0]];
  const retained = [];
  while (pending.length) {
    const path = pending.pop();
    if (visited.has(path)) continue;
    visited.add(path);
    const output = outputs.get(path);
    assert.ok(output, `static import must have an emitted chunk: ${path}`);
    retained.push(...Object.keys(output.inputs));
    for (const dependency of output.imports) {
      if (!dependency.external && dependency.kind !== 'dynamic-import') {
        pending.push(resolve(webDirectory, dependency.path));
      }
    }
  }
  assert.equal(
    retained.some((path) => /\/(tutorials|staging-test-profile)\.js$/.test(path)),
    false,
  );
  assert.ok(
    [...outputs.values()].some((output) =>
      Object.keys(output.inputs).some((path) => /\/tutorials\.js$/.test(path)),
    ),
  );
});

test('focused shared exports also resolve for Node consumers', () => {
  const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const markets = requireWeb('@bdo/shared/markets');
  const scope = requireWeb('@bdo/shared/mvp-scope');
  assert.equal(markets.DEFAULT_REGION, 'sa');
  assert.equal(markets.dataLocaleForUi('pt-BR'), 'pt');
  assert.equal(scope.isMvpPathEnabled('/recipes/items/9601'), true);
  assert.equal(scope.isMvpPathEnabled('/world'), false);
});

test('explicit tutorial consumers retain every screen and validate its anchors', async () => {
  const result = await bundle(`export {
    TUTORIAL_SCREEN_REGISTRY, getTutorialScreenDefinition,
    isTutorialAnchorForScreen, isTutorialScreenKey
  } from '@bdo/shared';`);
  const exports = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  assert.equal(exports.TUTORIAL_SCREEN_REGISTRY.length, 27);
  for (const screen of exports.TUTORIAL_SCREEN_REGISTRY) {
    assert.equal(exports.isTutorialScreenKey(screen.screenKey), true);
    assert.equal(exports.getTutorialScreenDefinition(screen.screenKey), screen);
    for (const anchor of screen.anchors) {
      assert.equal(exports.isTutorialAnchorForScreen(screen.screenKey, anchor.key), true);
      assert.equal(exports.isTutorialAnchorForScreen('unknown-screen', anchor.key), false);
    }
    assert.equal(exports.isTutorialAnchorForScreen(screen.screenKey, 'unknown.anchor'), false);
  }
  assert.equal(exports.isTutorialScreenKey('unknown-screen'), false);
});
