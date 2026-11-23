// End-to-end verification of the Phase 2A Angular-hosted Math Quiz pilot suite
// (#play/<id> SPA routing, level persistence, visuals/hints, Practice/Challenge,
// live Hub progress sync, Review My Mistakes, offline ngsw play, and mobile layout).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function launchBrowser() {
  const opts = { headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) };
  return chromium
    .launch(opts)
    .catch(() => chromium.launch({ ...opts, channel: 'chrome' }))
    .catch(() => chromium.launch({ ...opts, channel: 'msedge' }));
}

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const server = process.env.BASE_URL ? null : await require('../scripts/serve-dist.cjs').start(4173);
  const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
  const browser = await launchBrowser();
  const errors = [];
  const external = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'allow' });
    await context.addInitScript(() => {
      window.__spoken = [];
      window.SpeechSynthesisUtterance = class {
        constructor(t) { this.text = t; }
      };
      try {
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          value: {
            getVoices: () => [{ name: 'test' }],
            cancel() {},
            speak(u) { window.__spoken.push(u.text); },
          },
        });
      } catch {
        /* ignore if non-configurable */
      }
    });

    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url());
    });

    // 1. Navigate from Hub Math world to Angular #play/counting with zero full-page reload
    await page.goto(`${base}/#world/math`);
    await page.locator('.game-tile[data-game="counting"] a').waitFor();
    await page.evaluate(() => { window.__ngSpaAlive = true; });
    await page.locator('.game-tile[data-game="counting"] a').click();
    await page.locator('#start-btn').waitFor();
    assert.ok(page.url().includes('#play/counting'), 'clicked math card opens #play/counting');
    assert.equal(await page.evaluate(() => window.__ngSpaAlive), true, 'opened #play/counting in SPA without page reload');

    // 2. Age-level button updates query & persists in klg-game-levels (Band 2 on Counting is max=20)
    await page.locator('.kid-level[data-band="2"]').click();
    await page.waitForFunction(() => location.hash.includes('max=20'));
    const savedLevels = await page.evaluate(() => JSON.parse(localStorage.getItem('klg-game-levels') || '{}'));
    assert.equal(savedLevels.games?.counting, 'max=20');

    // Open More ways to play and pick 1–5 mode, then play a complete 5-question round
    await page.locator('.kid-more > summary').click();
    await page.locator('#mode-links a[href*="max=5"]').click();
    await page.waitForFunction(() => location.hash.includes('max=5'));
    await page.locator('#start-btn').click();
    for (let i = 0; i < 5; i += 1) {
      await page.waitForFunction((n) => document.getElementById('question-number')?.textContent?.trim() === String(n) && !document.querySelector('.quiz-choice-btn')?.disabled, i + 1);
      const emojis = await page.locator('#question-text').textContent();
      const count = [...emojis.replace(/\s+/g, '')].length;
      await page.locator(`.quiz-choice-btn[data-answer="${count}"]`).click();
      await page.locator('.quiz-next').click();
    }
    await page.locator('#results-screen:not(.d-none)').waitFor();
    assert.equal(await page.locator('#results-score').textContent(), '5 / 5');
    assert.ok(await page.locator('.kid-next-game').isVisible(), 'results show Next game button');
    // Go back via Finish Home link without reload and verify #stars-chip & counting stars updated live
    await page.locator('.kid-finish-home').click();
    await page.locator('.game-tile[data-game="counting"] a').waitFor();
    assert.equal(await page.evaluate(() => window.__ngSpaAlive), true, 'returned to Hub without reload');
    assert.match(await page.locator('.game-tile[data-game="counting"] .klg-card-stars').getAttribute('aria-label'), /3 stars/);
    console.log('PASS SPA navigation, level persistence, counting full round & live Hub sync');

    // 4. Challenge mode & best-time key preservation (klg-counting-best-ms:5)
    await page.goto(`${base}/#play/counting?max=5`);
    await page.locator('#start-btn').waitFor();
    await page.locator('.kid-more > summary').click();
    await page.locator('[data-play-mode="challenge"]').click();
    await page.locator('#start-btn').click();
    for (let i = 0; i < 5; i += 1) {
      await page.waitForFunction((n) => document.getElementById('question-number')?.textContent?.trim() === String(n) && !document.querySelector('.quiz-choice-btn')?.disabled, i + 1);
      const emojis = await page.locator('#question-text').textContent();
      const count = [...emojis.replace(/\s+/g, '')].length;
      await page.locator(`.quiz-choice-btn[data-answer="${count}"]`).click();
    }
    await page.locator('#results-screen:not(.d-none)').waitFor();
    const bestMs = await page.evaluate(() => Number(localStorage.getItem('klg-counting-best-ms:5')));
    assert.ok(Number.isFinite(bestMs) && bestMs > 0, 'challenge perfect round persists legacy bestMs key');

    // 5. Counting ten-frame & dice visuals
    await page.goto(`${base}/#play/counting?mode=tenframe`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-visual .kv-tenframes').waitFor();
    await page.goto(`${base}/#play/counting?mode=dice`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-visual .kv-dice').waitFor();

    // 6. Addition & subtraction + visual + screenshot
    await page.goto(`${base}/#play/addition-subtraction?op=add&max=10`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-visual .kv-tenframes').waitFor();
    const addPrompt = await page.locator('#question-text').textContent();
    const [aStr, bStr] = addPrompt.split('+').map((s) => Number(s.trim()));
    await page.screenshot({ path: 'artifacts/ng-game-desktop.png' });
    await page.locator(`.quiz-choice-btn[data-answer="${aStr + bStr}"]`).click();
    await page.waitForFunction(() => /Yes! Well done/.test(document.getElementById('quiz-feedback')?.textContent || ''));
    await page.locator('.quiz-next').click();

    // 7. Number Sounds (speech output & tap to answer)
    await page.goto(`${base}/#play/number-sounds?max=5`);
    await page.evaluate(() => { window.__spoken = []; });
    await page.locator('#start-btn').click();
    await page.waitForFunction(() => (window.__spoken || []).length > 0);
    const spokenNum = await page.evaluate(() => window.__spoken.at(-1));
    await page.locator(`.quiz-choice-btn[data-answer="${spokenNum}"]`).click();
    await page.waitForFunction(() => /Yes! Well done/.test(document.getElementById('quiz-feedback')?.textContent || ''));

    // 8. Multiplication (💡 Show me array hint)
    await page.goto(`${base}/#play/multiplication?tables=2,3`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-hint-btn').click();
    await page.locator('.mv-array').waitFor();
    const multPrompt = await page.locator('#question-text').textContent();
    const [ma, mb] = multPrompt.split('×').map((s) => Number(s.trim()));
    await page.locator(`.quiz-choice-btn[data-answer="${ma * mb}"]`).click();
    await page.waitForFunction(() => /Yes! Well done/.test(document.getElementById('quiz-feedback')?.textContent || ''));

    // 9. Division levels 1 & 3
    await page.goto(`${base}/#play/division?level=1&tables=2,3`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-choice-btn').first().click();
    await page.locator('.quiz-next').click();
    await page.goto(`${base}/#play/division?level=3`);
    await page.locator('#start-btn').click();
    await page.locator('.quiz-choice-btn').first().click();
    await page.locator('.quiz-next').click();
    console.log('PASS all 5 Angular Math Quiz games (visuals, hints, speech, challenge bestMs)');

    // 10. Review My Mistakes inside Angular (#play/counting?max=10&review=1)
    await page.evaluate(() => {
      localStorage.setItem('klg-review-v1', JSON.stringify({
        epoch: 1,
        cleared: 0,
        items: [
          {
            id: 'counting|max=10|x',
            gameId: 'counting',
            query: 'max=10',
            snapshot: { prompt: '🍎🍎🍎', speechPrompt: 'How many do you see?', correctAnswer: 3, choices: [2, 3, 4, 5], dedupeKey: 'x' },
            step: 0,
            due: '2000-01-01',
            misses: 1,
          },
        ],
      }));
    });
    await page.goto(`${base}/#play/counting?max=10&review=1`);
    await page.locator('#klg-review-intro').waitFor();
    await page.locator('#start-btn').click();
    await page.locator('.quiz-choice-btn[data-answer="3"]').click();
    await page.locator('.quiz-next').click();
    await page.locator('#klg-review-home').waitFor();
    const revAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('klg-review-v1')));
    assert.equal(revAfter.items[0]?.step, 1, 'review step advanced after Angular review round');
    console.log('PASS Angular Review My Mistakes round');

    // 11. Offline play of Angular game (#play/multiplication) & mobile viewport overflow check
    const expected = await page.evaluate(async () => Object.keys(JSON.parse(await (await fetch('ngsw.json')).text()).hashTable || {}).length);
    for (let i = 0; i < 120; i += 1) {
      const saved = await page.evaluate(async () => {
        const keys = (await caches.keys()).filter((k) => k.startsWith('ngsw:') && k.includes(':cache'));
        const counts = await Promise.all(keys.map(async (k) => (await (await caches.open(k)).keys()).length));
        return counts.reduce((a, b) => a + b, 0);
      });
      if (saved >= expected) break;
      await page.waitForTimeout(500);
    }
    await context.setOffline(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/#play/multiplication?tables=2`);
    await page.locator('#start-btn').waitFor();
    await page.locator('#start-btn').click();
    await page.locator('.quiz-hint-btn').click();
    await page.locator('.mv-array').waitFor();
    await page.screenshot({ path: 'artifacts/ng-game-mobile.png' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no mobile overflow on Angular game');
    console.log('PASS offline Angular game + mobile viewport screenshot');

    assert.deepEqual(errors, [], 'no runtime page errors');
    assert.deepEqual(external, [], 'no external requests');
  } finally {
    await browser.close();
    if (server) server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
