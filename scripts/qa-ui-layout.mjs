import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = process.env.QA_PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.QA_PLAYWRIGHT_MODULE)).href
  : 'playwright';
const { chromium } = await import(moduleUrl);
const target = new URL(process.env.UI_QA_ORIGIN || 'http://localhost:4202');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
  'UI fixtures only run on localhost',
);
const origin = target.origin;
const phase = process.argv[2] || 'verify';
const out = resolve(process.env.QA_OUTPUT_DIR || 'tmp/ui-layout-qa');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  serviceWorkers: 'block',
});
const requests = [],
  errors = [],
  samples = [];
const states = {};
let saveStatus = 200;
const roadmap = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'context',
    kind: 'flow',
    sortOrder: 0,
    title: 'Seu contexto de produção e progressão',
    summary: 'Armazém, Maestria e cotações verificadas para organizar atividades.',
    description: 'Detalhamento da atividade. '.repeat(10),
    statusLabel: null,
    icon: 'lucideBoxes',
    featured: false,
    links: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'market',
    kind: 'pillar',
    sortOrder: 1,
    title: 'PlanejamentoDeProducaoComUmTituloLongoSemSeparadoresParaVerificarAQuebraDeLinha',
    summary: 'Consulte preços, unidades e recência antes de comparar planos.',
    description: 'Cenário sintético de interface. '.repeat(12),
    statusLabel: 'Em evolução',
    icon: 'lucideStore',
    featured: true,
    links: [{ label: 'Consultar Mercado e preços da região selecionada', path: '/market' }],
  },
];
const guide = {
  id: 'qa-guide',
  screenKey: 'market',
  locale: 'pt-BR',
  enabled: true,
  updatedAt: '2026-10-19T12:00:00.000Z',
  steps: [
    {
      id: 'qa-step',
      sortOrder: 0,
      anchorKey: 'market.search',
      title:
        'Título extenso para avaliar a composição do editor e de seus controles em zoom de navegador',
      body: 'Instrução sintética para a revisão da interface, sem modificar guias publicados. '.repeat(
        4,
      ),
    },
  ],
};
await context.route('**/api/**', async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  requests.push({ path: url.pathname, method: request.method() });
  let status = 200,
    body = {};
  if (request.method() === 'PUT') {
    await new Promise((resolve) => setTimeout(resolve, 200));
    status = saveStatus;
    if (status !== 200) body = { message: 'Synthetic save failure' };
    else if (url.pathname.includes('/roadmap')) {
      roadmap.splice(0, roadmap.length, ...request.postDataJSON().entries);
      body = { entries: roadmap, updatedAt: '2026-10-19T13:00:00.000Z' };
    } else body = { ...guide, ...request.postDataJSON(), updatedAt: '2026-10-19T13:00:00.000Z' };
  } else if (url.pathname.endsWith('/identity/config'))
    body = {
      enabled: false,
      googleEnabled: false,
      steamEnabled: false,
      apiKey: null,
      authDomain: null,
      projectId: null,
      appId: null,
    };
  else if (url.pathname.includes('/roadmap'))
    body = { entries: roadmap, updatedAt: '2026-10-19T12:00:00.000Z' };
  else if (url.pathname.endsWith('/tutorials/manage'))
    body = { guides: [guide], screens: [], locales: ['pt-BR'] };
  else if (url.pathname.includes('/tutorials/')) {
    status = 404;
    body = { message: 'No published fixture' };
  } else if (url.pathname.includes('/workspace')) body = { workspace: null, updatedAt: null };
  else body = { items: [], total: 0, categories: [], dataset: null };
  await route.fulfill({
    status,
    json: body,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS',
    },
  });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(origin + '/lifeskills?tab=sessions');
  await page.waitForFunction(
    () =>
      !!window.ng?.getComponent(document.querySelector('app-workspace-layout'))?.identity.ready(),
  );
  await page.evaluate(() => {
    const shell = ng.getComponent(document.querySelector('app-workspace-layout'));
    shell.identity.authenticated.set(true);
    shell.identity.canManageRoadmap.set(true);
    shell.identity.displayName.set('QA sintética isolada');
    shell.identity.token = async () => 'synthetic-ui-layout-token';
    return shell.router.navigateByUrl('/family?tab=character');
  });
  await page.waitForSelector('app-player-page');
  await page.evaluate(() => {
    const p = ng.getComponent(document.querySelector('app-player-page'));
    p.name = 'Aventureiro'.repeat(8).slice(0, 80);
    p.create();
    const first = p.current().id;
    p.saveCharacter({
      className: 'Shai · Especialista em profissões',
      level: 65,
      weightLimit: 5000,
      mainAp: 330,
      dp: 420,
      silver: '9007199254740993',
      gear: [
        {
          slot: 'tool',
          itemId: 10001,
          name: 'Ferramenta de coleta com nome extenso para revisão visual',
          level: 10,
          caphras: 20,
        },
      ],
    });
    for (const [skill, value] of [
      ['cooking', '2000'],
      ['gathering', '1800'],
      ['processing', '1500'],
    ])
      p.saveMastery(skill, value);
    p.name = 'Segunda aventureira para comparação de perfis e navegação';
    p.create();
    p.select(first);
    p.saveFamily({
      name: 'Família sintética com nome extenso para revisão de layout e formulários',
      contribution: 450,
      energyMax: 600,
      lifeSkills: {
        cooking: { tier: 'Guru', level: 50, xpPercent: 99.9 },
        gathering: { tier: 'Mestre', level: 30, xpPercent: 12.5 },
      },
      pets: [
        {
          id: 'qa-pet',
          name: 'MascoteComNomeLongoSemEspacos'.repeat(3).slice(0, 80),
          tier: 5,
          level: 10,
          skills: 'Talentos conhecidos e detalhes informados. '.repeat(10),
        },
      ],
      mounts: [
        {
          id: 'qa-mount',
          name: 'Montaria de teste com nome extenso',
          kind: 'Cavalo dos Sonhos',
          level: 100,
          notes: 'Notas complementares da montaria. '.repeat(10),
        },
      ],
    });
    document.documentElement.dataset.qaFixture = 'synthetic-isolated';
  });
  async function navigate(path, owner) {
    await page.evaluate(
      (path) =>
        ng.getComponent(document.querySelector('app-workspace-layout')).router.navigateByUrl(path),
      path,
    );
    await page.waitForSelector(owner);
    if (owner === 'app-player-page')
      await page.locator('details.bdo-complement-drawer').evaluateAll((drawers) =>
        drawers.forEach((drawer) => {
          drawer.open = true;
        }),
      );
    if (owner === 'app-roadmap-manage-page')
      await page.waitForSelector(
        'app-roadmap-manage-page [data-action="save"], app-roadmap-manage-page .roadmap-access-denied',
      );
    if (owner === 'app-tutorials-manage-page')
      await page.waitForSelector('app-tutorials-manage-page .tutorial-screen-field select');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => {})),
      ),
    );
  }
  async function measure(label, zoom = 100) {
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const outside = [...document.querySelectorAll('main *, .workspace-topbar *')]
        .filter((el) => {
          const r = el.getBoundingClientRect(),
            s = getComputedStyle(el);
          return (
            r.width &&
            r.height &&
            s.visibility !== 'hidden' &&
            (r.right > width + 1 || r.left < -1) &&
            !el.closest('[data-scrollable],.graph-viewport,.gear-wheel')
          );
        })
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          className: String(el.className),
          text: el.textContent.trim().slice(0, 70),
          width: Math.round(el.getBoundingClientRect().width),
          right: Math.round(el.getBoundingClientRect().right),
        }));
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        documentWidth: document.documentElement.scrollWidth,
        outside,
        h1: document.querySelector('main h1')?.textContent,
        activeNav: document.querySelector('.family-view-link[aria-current]')?.textContent.trim(),
        buttons: [...document.querySelectorAll('app-player-page .bdo-char-pill')].map((e) => ({
          width: e.getBoundingClientRect().width,
          textWidth: e.scrollWidth,
        })),
      };
    });
    samples.push({ label, zoom, ...result });
    if (zoom !== 100) {
      if (
        result.viewport.width !== Math.round(1920 / (zoom / 100)) ||
        result.viewport.dpr !== zoom / 100
      )
        throw new Error('Zoom emulation was reset');
      const screenshot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      await writeFile(
        resolve(out, `${phase}-${label}-${zoom}.png`),
        Buffer.from(screenshot.data, 'base64'),
      );
    } else if (label.includes('1920') || label.includes('390'))
      await page.screenshot({ path: resolve(out, `${phase}-${label}-${zoom}.png`) });
    if (zoom === 100 && label.startsWith('family-family-')) {
      await page.locator('.bdo-family-extras').screenshot({
        path: resolve(out, `${phase}-${label}-complements.png`),
      });
      await page.evaluate(() => scrollTo(0, 0));
    }
  }
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const tab of ['character', 'equipment', 'family']) {
      await navigate('/family?tab=' + tab, 'app-player-page');
      await measure(`family-${tab}-${size.width}`);
    }
    for (const [path, owner, name] of [
      ['/roadmap/manage', 'app-roadmap-manage-page', 'roadmap'],
      ['/tutorials/manage', 'app-tutorials-manage-page', 'tutorials'],
    ]) {
      await navigate(path, owner);
      await measure(`${name}-${size.width}`);
    }
  }
  const cdp = await context.newCDPSession(page);
  for (const zoom of [125, 150]) {
    // Desktop zoom-equivalent layout and DPR for a physical 1920x1080 viewport.
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(1920 / (zoom / 100)),
      height: Math.round(1080 / (zoom / 100)),
      deviceScaleFactor: zoom / 100,
      mobile: false,
    });
    for (const tab of ['character', 'equipment', 'family']) {
      await navigate('/family?tab=' + tab, 'app-player-page');
      await measure(`family-${tab}-1920`, zoom);
    }
    await navigate('/roadmap/manage', 'app-roadmap-manage-page');
    await measure('roadmap-1920', zoom);
    await navigate('/tutorials/manage', 'app-tutorials-manage-page');
    await measure('tutorials-1920', zoom);
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await writeFile(
    resolve(out, `${phase}-metrics.json`),
    JSON.stringify({ samples, errors, states, status: 'matrix-complete' }, null, 2),
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  if (phase !== 'baseline') {
    await navigate('/roadmap/manage', 'app-roadmap-manage-page');
    const title = page.locator('[data-field="title"]').first();
    await title.fill('Título revisado no cenário sintético');
    saveStatus = 500;
    await page.locator('[data-action="save"]').first().click();
    await page.waitForFunction(
      () =>
        document.querySelector('app-roadmap-manage-page section')?.getAttribute('aria-busy') ===
        'true',
    );
    await page.locator('.roadmap-admin-error').waitFor();
    assert.equal(await title.inputValue(), 'Título revisado no cenário sintético');
    saveStatus = 200;
    await page.locator('[data-action="save"]').first().click();
    await page.locator('.roadmap-admin-success').waitFor();
    states.roadmap = { saving: true, errorPreservesDraft: true, saved: true };
    await navigate('/tutorials/manage', 'app-tutorials-manage-page');
    const selector = page.locator('.tutorial-screen-field select');
    const options = await selector.evaluate((el) =>
      [...el.options].map((o) => ({ value: o.value, text: o.textContent })),
    );
    const recipesOption = options.find((o) => o.text.trim().endsWith('· /recipes'));
    assert.ok(recipesOption, 'Recipes remains available in the screen selector');
    await selector.selectOption(recipesOption.value);
    assert.equal(
      await page.evaluate(() =>
        ng.getComponent(document.querySelector('app-tutorials-manage-page')).screenKey(),
      ),
      'recipes',
    );
    const marketOption = options.find((o) => o.text.trim().endsWith('· /market'));
    assert.ok(marketOption, 'Market remains available in the screen selector');
    await selector.selectOption(marketOption.value);
    const add = page.getByRole('button', { name: 'Adicionar etapa', exact: true });
    for (let count = await page.locator('.step').count(); count < 9; count++) {
      await add.click();
      await page.waitForFunction(
        (expected) =>
          document.querySelectorAll('app-tutorials-manage-page .step').length === expected,
        count + 1,
      );
    }
    states.ninthStep = true;
    for (let count = await page.locator('.step').count(); count < 12; count++) {
      await add.click();
      await page.waitForFunction(
        (expected) =>
          document.querySelectorAll('app-tutorials-manage-page .step').length === expected,
        count + 1,
      );
    }
    assert.equal(await add.isDisabled(), true);
    await page
      .getByRole('button', { name: 'Recarregar versão salva e descartar rascunhos' })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll('app-tutorials-manage-page .step').length === 1,
    );
    const tutorialTitle = page.locator('#title-0');
    await tutorialTitle.fill('Título de tutorial revisado em QA isolada');
    saveStatus = 500;
    await page.getByRole('button', { name: 'Salvar tutorial', exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('app-tutorials-manage-page > div')?.getAttribute('aria-busy') ===
        'true',
    );
    await page.getByRole('alert').waitFor();
    assert.equal(await tutorialTitle.inputValue(), 'Título de tutorial revisado em QA isolada');
    saveStatus = 200;
    await page.getByRole('button', { name: 'Salvar tutorial', exact: true }).click();
    await page.getByText('Tutorial salvo.', { exact: true }).waitFor();
    states.tutorials = {
      selector: true,
      limit: 12,
      saving: true,
      errorPreservesDraft: true,
      saved: true,
    };
    await navigate('/family?tab=character', 'app-player-page');
    await page.keyboard.press('Tab');
    await page.getByRole('link', { name: 'Família & Profissões', exact: true }).focus();
    const focus = await page.locator('.family-view-link:focus').evaluate((el) => ({
      width: getComputedStyle(el).outlineWidth,
      style: getComputedStyle(el).outlineStyle,
    }));
    assert.ok(parseFloat(focus.width) >= 2 && focus.style !== 'none');
    states.familyFocus = focus;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(
      () => getComputedStyle(document.querySelector('.family-view-link')).transitionDuration,
    );
    assert.ok(parseFloat(reduced) < 0.01);
    states.reducedMotion = reduced;
  }
  await page.evaluate(() =>
    ng
      .getComponent(document.querySelector('app-workspace-layout'))
      .identity.canManageRoadmap.set(false),
  );
  await navigate('/roadmap/manage', 'app-roadmap-manage-page');
  const denied = await page.locator('.roadmap-access-denied').count();
  const failures = samples.filter(
    (x) => x.documentWidth > x.viewport.width + 1 || x.outside.length,
  );
  const mutations = requests.filter((x) => !['GET', 'OPTIONS'].includes(x.method)).length;
  await writeFile(
    resolve(out, `${phase}-metrics.json`),
    JSON.stringify({ samples, denied, errors, states, interceptedApi: requests }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        samples: samples.length,
        failures: failures.map((x) => ({
          label: x.label,
          zoom: x.zoom,
          width: x.viewport.width,
          documentWidth: x.documentWidth,
          outside: x.outside,
        })),
        denied,
        errors,
        states,
        interceptedMutations: mutations,
      },
      null,
      2,
    ),
  );
  if (phase !== 'baseline') {
    assert.equal(samples.length, 35);
    assert.equal(mutations, 4, 'Only the four intercepted save scenarios are expected');
    assert.equal(denied, 1);
    assert.equal(errors.length, 0, 'No unhandled page errors');
    assert.equal(failures.length, 0, 'UI must fit the tested viewport');
  }
} finally {
  await browser.close();
}
