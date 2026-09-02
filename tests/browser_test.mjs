import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = fs.mkdtempSync(path.join(os.tmpdir(), 'maybe-browser-qa-'));

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try the next bundled/local path */ }
  }
  throw new Error('Playwright was not found. Install it locally or run this test inside Codex desktop.');
}

function findChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function buildHtml() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css/base.css'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="\.\/css\/base\.css"\s*\/?>/, `<style>${css}</style>`);
  html = html.replace(/<script async src="https:\/\/unpkg\.com\/es-module-shims[^>]*><\/script>/, '');
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
  html = html.replace(/<script type="module" src="\.\/js\/main\.js(?:\?[^\"]*)?"><\/script>/, '');
  html = html.replace(/<script type="module" src="\.\/js\/decision-ui\.js(?:\?[^\"]*)?"><\/script>/, '');
  return html;
}

function stripModule(text) {
  return text
    .replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/gm, '')
    .replace(/\bexport\s+/g, '');
}

function bundle() {
  return ['mapping.js', 'storage.js', 'question-library-translations.js', 'question-library.js', 'i18n.js', 'webmcp.js', 'decision-ui.js']
    .map((name) => stripModule(fs.readFileSync(path.join(ROOT, 'js', name), 'utf8')))
    .join('\n\n');
}

const MOCK_ENV = `
(() => {
  const store = Object.create(null);
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null; },
      setItem(k,v){ store[k] = String(v); },
      removeItem(k){ delete store[k]; },
      clear(){ Object.keys(store).forEach(k => delete store[k]); },
      _dump(){ return {...store}; }
    }
  });

  const jar = Object.create(null);
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get(){ return Object.entries(jar).map(([k,v]) => \`${'${k}'}=${'${v}'}\`).join('; '); },
    set(raw){
      const first=String(raw).split(';')[0];
      const idx=first.indexOf('=');
      const k=first.slice(0,idx), v=first.slice(idx+1);
      if (/Max-Age=0/i.test(raw)) delete jar[k]; else jar[k]=v;
    }
  });
  window.__cookieJar = jar;

  window.__registeredTools = [];
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: { registerTool: async tool => window.__registeredTools.push(tool) }
  });

  let diceCount = 2;
  const mockFaces = [5, 2, 3, 4, 6];
  function setDiceCount(value) {
    const next = Math.max(1, Math.min(5, Number(value) || 2));
    const changed = next !== diceCount;
    diceCount = next;
    document.documentElement.dataset.activeDiceCount = String(next);
    document.querySelectorAll('button[data-dice-count]').forEach(button => {
      const selected = Number(button.dataset.diceCount) === next;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    return {diceCount: next, changed};
  }
  window.MaybeDice = {
    getDiceCount: () => diceCount,
    setDiceCount,
    roll: () => document.querySelector('#roll-btn').click(),
  };
  document.querySelectorAll('button[data-dice-count]').forEach(button => {
    button.addEventListener('click', () => setDiceCount(button.dataset.diceCount));
  });
  setDiceCount(2);

  document.querySelector('#roll-btn').addEventListener('click', () => {
    const score = document.querySelector('#score-result');
    score.textContent = '';
    setTimeout(() => { score.textContent = mockFaces.slice(0, diceCount).join('+'); }, 90);
  });
})();
`;

async function visibleStep(page) {
  return page.evaluate(() => document.querySelector('.game-step:not(.is-hidden)').dataset.step);
}

async function assertBounds(page, label) {
  const dims = await page.evaluate(() => {
    const ui = document.querySelector('.ui-controls').getBoundingClientRect();
    const brand = document.querySelector('.product-brand').getBoundingClientRect();
    return {
      w: innerWidth,
      sw: document.documentElement.scrollWidth,
      ui: {l: ui.left, r: ui.right},
      brand: {l: brand.left, r: brand.right},
    };
  });
  assert.ok(dims.sw <= dims.w + 1, `${label}: horizontal overflow`);
  assert.ok(dims.ui.l >= -1 && dims.ui.r <= dims.w + 1, `${label}: UI out of bounds`);
  assert.ok(dims.brand.l >= -1 && dims.brand.r <= dims.w + 1, `${label}: brand out of bounds`);
}

const {chromium} = loadPlaywright();
const executablePath = findChromium();
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? {executablePath} : {}),
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({viewport: {width: 1194, height: 1187}});
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setContent(buildHtml(), {waitUntil: 'domcontentloaded'});
  await page.evaluate(MOCK_ENV);
  await page.addScriptTag({content: bundle()});
  await page.waitForFunction(() => window.Maybe && window.__registeredTools.length === 9);

  assert.deepEqual(await page.evaluate(() => ({
    status: document.documentElement.dataset.webmcp,
    complete: window.MaybeWebMCPStatus?.complete,
    expected: window.MaybeWebMCPStatus?.expected,
    registered: window.MaybeWebMCPStatus?.registered?.length,
  })), {status: 'ready', complete: true, expected: 9, registered: 9});

  assert.equal(await visibleStep(page), 'home');
  assert.equal(await page.locator('.product-brand h1').innerText(), 'Maybe');
  assert.deepEqual(await page.locator('.home-actions button').allInnerTexts(), ['Throw the dice', 'Ask a question']);
  assert.equal(await page.locator('button[data-dice-count]').count(), 5);
  assert.equal(await page.locator('#open-codex-btn small, #library-btn small').count(), 0);
  const launcherStyles = await page.evaluate(() => {
    const codex = getComputedStyle(document.querySelector('#open-codex-btn'));
    const shelf = getComputedStyle(document.querySelector('#library-btn'));
    return {
      codex: {fontSize: codex.fontSize, width: codex.width, padding: codex.padding},
      shelf: {fontSize: shelf.fontSize, width: shelf.width, padding: shelf.padding},
    };
  });
  assert.deepEqual(launcherStyles.codex, launcherStyles.shelf);
  assert.equal(
    await page.locator('#open-codex-btn').getAttribute('href'),
    'https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fwebmcp.qinqinghua.tech%2Fmaybe%2F',
  );
  assert.equal(await page.locator('#global-home-btn').isVisible(), false);

  await page.click('#library-btn');
  assert.equal(await visibleStep(page), 'library');
  assert.equal(await page.locator('#global-home-btn').isVisible(), true);
  assert.equal(await page.locator('.question-card').count(), 26);
  await page.click('#language-button');
  await page.locator('#language-menu button', {hasText: '中文'}).click();
  assert.equal(await page.locator('.question-card .use-card').first().innerText(), '使用这张卡片');
  assert.equal(await page.locator('#language-button').evaluate((button) => getComputedStyle(button).borderTopWidth), '0px');
  await page.click('#language-button');
  await page.locator('#language-menu button', {hasText: 'English'}).click();
  await page.click('#library-categories button:text-is("Coding")');
  assert.equal(await page.locator('.question-card').count(), 5);

  const savedPack = await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_save_question_cards');
    return tool.execute({
      cards: [{
        question: 'What should I demo first?',
        message: 'Start with the moment that makes the agent-human partnership obvious.',
        category: 'personal',
        options: ['Question shelf', 'Physical dice roll', 'Live Codex personalization'],
      }],
    });
  });
  assert.equal(savedPack.savedCount, 9);
  assert.equal(await visibleStep(page), 'library');
  assert.equal(await page.locator('.question-card').count(), 9);
  await page.locator('.question-card', { hasText: 'What should I demo first?' }).locator('.use-card').evaluate((button) => button.click());
  assert.equal(await visibleStep(page), 'options');
  assert.equal(await page.locator('.option-row').count(), 3);
  await page.click('[data-step="options"] [data-back="question"]');
  await page.click('[data-step="question"] [data-back="home"]');

  for (let count = 1; count <= 5; count += 1) {
    await page.click(`button[data-dice-count="${count}"]`);
    await page.click('#roll-btn');
    await page.waitForFunction(
      (expected) => document.querySelector('#score-result').textContent.split('+').filter(Boolean).length === expected,
      count,
    );
    assert.equal(await page.evaluate(() => window.MaybeDice.getDiceCount()), count);
  }
  await page.click('button[data-dice-count="2"]');
  await assertBounds(page, 'home');
  await page.screenshot({path: path.join(ASSETS, 'qa-home.png'), fullPage: true});

  const directAnswer = await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_respond_in_page');
    return tool.execute({
      question: 'How many minutes are in two hours?',
      kind: 'answer',
      message: 'Two hours contain 120 minutes.',
    });
  });
  assert.equal(directAnswer.step, 'answer');
  assert.equal(await visibleStep(page), 'answer');
  assert.match(await page.locator('#answer-text').innerText(), /120 minutes/);
  assert.equal(await page.locator('.help-list').evaluate((node) => getComputedStyle(node).display), 'block');
  await page.click('#global-home-btn');
  assert.equal(await visibleStep(page), 'home');

  const autoDecision = await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_respond_in_page');
    return tool.execute({
      question: 'Tea or coffee?',
      kind: 'decision',
      options: ['Tea', 'Coffee'],
      autoRoll: true,
    });
  });
  assert.equal(autoDecision.rolled, true);
  assert.equal(autoDecision.step, 'result');
  assert.ok(['Tea', 'Coffee'].includes(autoDecision.winner));
  assert.equal(await visibleStep(page), 'result');
  assert.equal(await page.locator('.help-list').evaluate((node) => getComputedStyle(node).display), 'block');
  await page.click('#global-home-btn');

  await page.click('#ask-btn');
  assert.equal(await visibleStep(page), 'question');
  await page.fill('#question-input', 'What should I eat for lunch today?');
  await page.click('#question-next-btn');
  assert.equal(await visibleStep(page), 'waiting');

  const pending = await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_get_pending_question');
    return tool.execute({});
  });
  assert.equal(pending.question, 'What should I eat for lunch today?');

  const diceState = await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_configure_dice');
    return tool.execute({count: 5});
  });
  assert.equal(diceState.diceCount, 5);
  await page.screenshot({path: path.join(ASSETS, 'qa-waiting.png'), fullPage: true});

  await page.evaluate(async () => {
    const tool = window.__registeredTools.find((item) => item.name === 'maybe_respond_in_page');
    return tool.execute({
      question: 'What should I eat for lunch today?',
      kind: 'decision',
      message: 'You want a quick lunch decision, so I split it into three distinct directions.',
      options: ['Noodles', 'Rice bowl', 'Salad'],
    });
  });
  assert.equal(await visibleStep(page), 'options');
  assert.equal(await page.locator('.option-row').count(), 3);
  assert.equal(await page.locator('#assistant-text').isHidden(), true);
  assert.match((await page.evaluate(() => window.Maybe.getState())).assistantText, /three distinct directions/);
  await page.click('[data-step="options"] [data-save-current]');
  assert.match(await page.locator('[data-step="options"] [data-save-status]').innerText(), /Saved to your Question Shelf/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('maybe_question_cards_v1')).some(
    (card) => card.question === 'What should I eat for lunch today?',
  )), true);
  await page.screenshot({path: path.join(ASSETS, 'qa-options.png'), fullPage: true});

  await page.locator('.option-input').nth(0).fill('Sushi');
  await page.click('#add-option-btn');
  assert.equal(await page.locator('.option-row').count(), 4);
  await page.locator('.option-input').nth(3).fill('Burgers');
  await page.click('#options-next-btn');
  assert.equal(await visibleStep(page), 'ready');
  assert.equal(await page.locator('.mapping-line').count(), 4);
  await page.screenshot({path: path.join(ASSETS, 'qa-ready.png'), fullPage: true});

  await page.click('#customize-odds-btn');
  assert.equal(await visibleStep(page), 'odds');
  assert.equal(await page.locator('.face-row').count(), 6);
  await page.locator('.face-select').nth(0).selectOption('3');
  await page.click('#save-odds-btn');
  assert.equal(await visibleStep(page), 'ready');

  await page.click('#decision-roll-btn');
  await page.waitForFunction(() => document.querySelector('.game-step:not(.is-hidden)').dataset.step === 'result');
  assert.ok(['Sushi', 'Rice bowl', 'Salad', 'Burgers'].includes(await page.locator('#result-title').innerText()));
  const state = await page.evaluate(() => window.Maybe.getState());
  assert.equal(state.diceCount, 5);
  assert.deepEqual(state.currentScore, [5, 2, 3, 4, 6]);
  assert.ok(await page.evaluate(() => Object.keys(localStorage._dump()).includes('rollnext_state_v3')));
  assert.ok(await page.evaluate(() => Object.keys(localStorage._dump()).includes('rollnext_history_v3')));
  assert.ok(await page.evaluate(() => Object.keys(window.__cookieJar).includes('rollnext_state_v3')));
  await page.setViewportSize({width: 385, height: 688});
  await page.waitForTimeout(100);
  const fittedResult = await page.evaluate(() => {
    const ui = document.querySelector('.ui-controls');
    return {
      clientHeight: ui.clientHeight,
      scrollHeight: ui.scrollHeight,
      classes: ui.className,
    };
  });
  assert.ok(fittedResult.scrollHeight <= fittedResult.clientHeight + 1, 'zoomed portrait: result detail still requires scrolling');
  assert.match(fittedResult.classes, /fit-(compact|dense|tight)/, 'zoomed portrait: result detail did not activate adaptive type');
  await page.screenshot({path: path.join(ASSETS, 'qa-result.png'), fullPage: true});

  await page.click('#global-home-btn');
  for (const [label, width, height] of [['mobile', 390, 844], ['landscape', 844, 390], ['desktop', 1440, 900]]) {
    await page.setViewportSize({width, height});
    await page.waitForTimeout(60);
    await assertBounds(page, label);
    const homeLayout = await page.evaluate(() => {
      const ui = document.querySelector('.ui-controls');
      const uiStyle = getComputedStyle(ui);
      return {
        uiBottom: ui.getBoundingClientRect().bottom,
        viewportHeight: innerHeight,
        overflowY: uiStyle.overflowY,
      };
    });
    assert.ok(homeLayout.uiBottom <= homeLayout.viewportHeight * .6 + 1, `${label}: UI crossed the top 60% boundary`);
    assert.equal(homeLayout.overflowY, 'auto');

    await page.click('#library-btn');
    assert.equal(await page.locator('#canvas').evaluate((canvas) => getComputedStyle(canvas).display), 'none');
    await page.evaluate(() => {
      const ui = document.querySelector('.ui-controls');
      ui.scrollTop = ui.scrollHeight;
    });
    const libraryLayout = await page.evaluate(() => {
      const ui = document.querySelector('.ui-controls').getBoundingClientRect();
      const footer = document.querySelector('.library-footer').getBoundingClientRect();
      return {uiBottom: ui.bottom, footerBottom: footer.bottom, viewportHeight: innerHeight};
    });
    assert.ok(libraryLayout.uiBottom <= libraryLayout.viewportHeight + 1, `${label}: shelf viewport crossed page bottom`);
    assert.ok(libraryLayout.footerBottom <= libraryLayout.uiBottom + 1, `${label}: shelf footer is clipped`);
    await page.click('[data-step="library"] [data-back="home"]');
  }

  await page.setViewportSize({width: 385, height: 688});
  await page.waitForTimeout(60);
  const zoomedLayout = await page.evaluate(() => {
    const ui = document.querySelector('.ui-controls');
    const labels = [
      ...document.querySelectorAll('.home-actions .primary-action'),
      document.querySelector('#open-codex-btn strong'),
      document.querySelector('#library-btn strong'),
    ];
    return {
      clientHeight: ui.clientHeight,
      scrollHeight: ui.scrollHeight,
      helpDisplay: getComputedStyle(document.querySelector('.help-list')).display,
      labels: labels.map((label) => ({
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
        whiteSpace: getComputedStyle(label).whiteSpace,
      })),
    };
  });
  assert.equal(zoomedLayout.helpDisplay, 'block');
  assert.ok(zoomedLayout.scrollHeight <= zoomedLayout.clientHeight + 1, 'zoomed portrait: homepage controls are folded into scrolling');
  zoomedLayout.labels.forEach((label) => {
    assert.equal(label.whiteSpace, 'nowrap');
    assert.ok(label.scrollWidth <= label.clientWidth + 1, 'zoomed portrait: button label is clipped');
  });

  assert.deepEqual(errors, []);
  console.log('PASS browser 1-5 dice flow, responsive layout, and live WebMCP callbacks');
} finally {
  await browser.close();
  fs.rmSync(ASSETS, {recursive: true, force: true});
}
