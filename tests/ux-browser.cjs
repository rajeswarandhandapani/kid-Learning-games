// Can a child get around? Turns the layout review into numbers, on phones and
// tablets. Server must be running: npm start, then
//   npm run test:ux
//   ONLY=next npm run test:ux        sections whose name contains "next"
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;

const SIZES = [[320, 568], [390, 844], [810, 1080], [1080, 810], [1366, 900]];
const gamesUsing = (needle) => fs.readdirSync('games')
 .filter((id) => fs.existsSync(`games/${id}/game.js`) && fs.readFileSync(`games/${id}/game.js`, 'utf8').includes(needle));
const QUIZ = gamesUsing('new QuizEngine');
const ROUND = gamesUsing('KlgRound.run');

const sections = [];
const section = (name, fn) => sections.push([name, fn]);

/** Lets the test reach the round loop of hand-built games, which keep it private. */
const exposeRound = () => {
 let real;
 Object.defineProperty(window, 'KlgRound', {
  configurable: true,
  get: () => real,
  set(value) {
   real = { ...value, run(opts) {
    const render = opts.render;
    opts.render = (q, ctx) => { window.__ctx = ctx; return render(q, ctx); };
    return value.run(opts);
   } };
  },
 });
};

/** True when the element is fully on screen and nothing is drawn over its middle. */
const inView = (selector) => {
 const el = document.querySelector(selector);
 if (!el) return { ok: false, why: 'missing' };
 const r = el.getBoundingClientRect();
 if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) return { ok: false, why: `off screen: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} of ${innerHeight}` };
 const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
 if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) return { ok: false, why: 'covered by ' + (hit ? hit.id || hit.className || hit.tagName : 'nothing') };
 return { ok: true };
};

section('next and feedback stay on screen after an answer', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  for (const id of QUIZ) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.locator('.quiz-choice-btn').first().waitFor();
   await page.locator('.quiz-choice-btn').first().click();
   const next = await page.evaluate(inView, '.quiz-next');
   if (!next.ok) fail(`${id} at ${w}x${h}: Next ${next.why}`);
   const said = await page.evaluate(inView, '#quiz-feedback');
   if (!said.ok) fail(`${id} at ${w}x${h}: feedback ${said.why}`);
   await page.locator('.quiz-next').click();
   await page.locator('.quiz-choice-btn:not([disabled])').first().waitFor();
   if (await page.evaluate(() => scrollY) !== 0) fail(`${id} at ${w}x${h}: the next question starts scrolled down`);
  }
  for (const id of ROUND) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.waitForFunction(() => window.__ctx);
   await page.evaluate(() => window.__ctx.right('Well done, that is the right answer.'));
   const next = await page.evaluate(inView, '#next-btn');
   if (!next.ok) fail(`${id} at ${w}x${h}: Next ${next.why}`);
   const said = await page.evaluate(inView, '#feedback');
   if (!said.ok) fail(`${id} at ${w}x${h}: feedback ${said.why}`);
   await page.locator('#next-btn').click();
   if (await page.evaluate(() => scrollY) !== 0) fail(`${id} at ${w}x${h}: the next question starts scrolled down`);
  }
  await close();
 }
});

/** Every game page with a start screen. */
const STARTS = fs.readdirSync('games').filter((id) => id !== 'tamil-letter-chart' && fs.existsSync(`games/${id}/index.html`));

section('start screens have one clear thing to do', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  for (const id of STARTS) {
   await page.goto(`${base}/games/${id}/index.html`);
   const play = await page.evaluate(inView, '#start-btn');
   if (!play.ok) fail(`${id} at ${w}x${h}: Play ${play.why}`);
   const r = await page.evaluate(() => ({
    words: document.getElementById('start-screen').innerText.trim().split(/\s+/).length,
    label: document.getElementById('start-btn').textContent.trim(),
    scrolls: document.documentElement.scrollWidth > innerWidth + 1,
    home: document.querySelector('.navbar-brand').textContent.trim(),
    sound: !!document.querySelector('.klg-navbar #klg-mute-btn'),
   }));
   if (r.words > 30) fail(`${id}: ${r.words} words on the start screen`);
   if (r.label !== '▶ Play') fail(`${id}: start button says "${r.label}"`);
   if (r.scrolls) fail(`${id} at ${w}x${h}: sideways scroll`);
   if (r.home !== '🏠 Home') fail(`${id}: home button says "${r.home}"`);
   if (!r.sound) fail(`${id}: sound button is not in the top bar`);
  }
  await close();
 }
});

// A ten-by-ten board cannot give every square 44px on a phone, so Array Garden and
// Multiples Hunt are allowed smaller squares there, as big as the screen allows.
// Block Builder's small blocks can be tapped too, but its big − buttons do the same job.
const tooSmall = () => [...document.querySelectorAll('a,button,select,input,summary')]
 .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.kid-select-hidden') && !e.classList.contains('skip-link') && !(innerWidth < 600 && e.matches('.ag-cell, .mh-cell')) && !e.matches('.kv-removable') && (r.width < 44 || r.height < 44); })
 .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);

section('every control is big enough for a small finger', async ({ newPage, fail }) => {
 for (const [w, h] of [[320, 568], [390, 844], [1080, 810]]) {
  const { page, close } = await newPage(w, h);
  for (const id of STARTS) {
   await page.goto(`${base}/games/${id}/index.html`);
   const details = page.locator('.kid-more summary');
   if (await details.count()) await details.click();
   for (const small of await page.evaluate(tooSmall)) fail(`${id} start at ${w}x${h}: ${small}`);
   await page.locator('#start-btn').click();
   await page.waitForTimeout(40);
   for (const small of await page.evaluate(tooSmall)) fail(`${id} play at ${w}x${h}: ${small}`);
  }
  await close();
 }
});

section('the question and every answer fit on the screen', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES.slice(1)) {
  const { page, close } = await newPage(w, h);
  for (const id of QUIZ) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.locator('.quiz-choice-btn').first().waitFor();
   const r = await page.evaluate(() => ({
    bottom: Math.max(...[...document.querySelectorAll('.quiz-choice-btn')].map((b) => b.getBoundingClientRect().bottom)),
    number: document.getElementById('question-number').textContent,
    total: document.getElementById('total-questions').textContent,
    top: document.getElementById('question-text').getBoundingClientRect().top,
   }));
   if (r.bottom > h + 1) fail(`${id} at ${w}x${h}: answers end at ${Math.round(r.bottom)}`);
   if (r.number !== '1' || !Number(r.total)) fail(`${id}: the question counter was lost`);
  }
  for (const id of ROUND) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.waitForFunction(() => window.__ctx);
   const bottom = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().bottom);
   // கதை நேரம் shows a four-picture story to read before its question, so scrolling is expected.
   if (bottom > h + 1 && id !== 'tamil-story-time') fail(`${id} at ${w}x${h}: the game ends at ${Math.round(bottom)}`);
  }
  await close();
 }
});

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 const failures = [];
 const pageErrors = [];
 const newPage = async (width, height, init) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${width}x${height} ${page.url()}: ${e.message}`));
  await page.addInitScript(exposeRound);
  await page.addInitScript(() => { try { localStorage.setItem('klg-stage', '2'); } catch (e) { /* blocked */ } });
  if (init) await page.addInitScript(init);
  return { page, context, close: () => context.close() };
 };
 for (const [name, fn] of sections) {
  if (only && !name.includes(only)) continue;
  const before = failures.length;
  try {
   await fn({ newPage, fail: (message) => failures.push(message), assert, browser });
  } catch (e) {
   failures.push(`${name}: ${String(e.message).split('\n').slice(0, 5).join(' ')}`);
  }
  console.log(`${failures.length === before ? 'PASS' : 'FAIL'} ${name}`);
 }
 await browser.close();
 failures.push(...pageErrors);
 if (failures.length) {
  console.log(`\n${failures.length} problems:\n  ${failures.slice(0, Number(process.env.SHOW || 60)).join('\n  ')}`);
  process.exit(1);
 }
 console.log('PASS the layout checks at every size.');
})().catch((e) => { console.error(e); process.exit(1); });
