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
  console.log(`\n${failures.length} problems:\n  ${failures.slice(0, 60).join('\n  ')}`);
  process.exit(1);
 }
 console.log('PASS the layout checks at every size.');
})().catch((e) => { console.error(e); process.exit(1); });
