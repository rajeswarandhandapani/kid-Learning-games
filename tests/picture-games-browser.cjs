// Plays the picture-first games in Chromium and checks that each picture
// agrees with its answer. Server must be running: npm start, then
//   npm run test:pictures            all sections
//   ONLY=clock npm run test:pictures sections whose name contains "clock"
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;

const sections = [];
const section = (name, fn) => sections.push([name, fn]);

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
  const noOverflow = async (id) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
  const plays = () => page.evaluate(() => KlgProgress.summary().plays);
  const go = (path) => page.goto(`${base}/games/${path}`);

  /** Quiz-engine game: answer `rounds` questions; check(info) sees the picture before each answer. */
  async function playQuiz(path, check, rounds = 10) {
    await go(path);
    await page.locator('#start-btn').click();
    for (let i = 0; i < rounds; i++) {
      await page.locator('.quiz-choice-btn').first().waitFor();
      const prompt = await page.locator('#question-text').textContent();
      const labels = await page.locator('.quiz-choice-btn').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
      assert.equal(new Set(labels).size, labels.length, `${path}: duplicate choices for: ${prompt}`);
      const info = { prompt, labels, page };
      if (check) await check.before?.(info);
      await page.locator('.quiz-choice-btn').first().click();
      const correct = await page.locator('.quiz-choice-btn.correct').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
      assert.equal(correct.length, 1, `${path}: exactly one correct choice for: ${prompt}`);
      info.answer = correct[0];
      if (check) typeof check === 'function' ? await check(info) : await check.after?.(info);
      await noOverflow(path);
      await page.locator('.quiz-next').click();
    }
    assert.ok(await page.locator('#results-screen').isVisible(), path);
  }

  /** Hand-built game: wait for the play screen. */
  async function startRound(path) {
    await go(path);
    await page.locator('#start-btn').click();
    await page.locator('#play-screen').waitFor({ state: 'visible' });
  }
  async function finishRound() {
    await page.locator('#finish-screen').waitFor({ state: 'visible' });
    assert.match(await page.locator('#finish-summary').textContent(), /\d+ \/ \d+/);
  }
  const ctx = { page, base, assert, go, playQuiz, startRound, finishRound, noOverflow, plays, section, errors };

  // ---- sections are registered below ------------------------------------
  //@@SECTIONS@@
  section('picture-graphs: the graphs show the numbers the answers are checked against', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`picture-graphs/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/tally marks/.test(task)) {
          const n = await page.locator('#stage [data-count]').evaluate((f) => Number(f.dataset.count));
          for (let k = 0; k < n; k++) await page.getByRole('button', { name: 'Add a tally mark' }).click();
          assert.equal(await page.locator('#stage .kv-tally').evaluate((t) => Number(t.dataset.total)), n);
          assert.equal(await page.locator('#stage .kv-tgroup').count(), Math.ceil(n / 5), 'groups of five');
          await page.getByRole('button', { name: 'Check my tally' }).click();
        } else {
          const rows = await page.locator('#stage .kv-grow').evaluateAll((rs) => rs.map((r) => ({ label: r.dataset.label, count: Number(r.dataset.count) })));
          const each = await page.locator('#stage .kv-graph').evaluate((g) => Number(g.dataset.each || 1));
          // the pictures drawn equal the counts
          const icons = await page.locator('#stage .kv-picto .kv-gicons').evaluateAll((rs) => rs.map((r) => r.children.length));
          if (icons.length) rows.forEach((r, idx) => assert.equal(icons[idx] * each, r.count, 'pictures drawn = count'));
          const bars = await page.locator('#stage .kv-bars .kv-gfill').evaluateAll((fs) => fs.map((f) => Number(f.textContent)));
          if (bars.length) rows.forEach((r, idx) => assert.equal(bars[idx], r.count, 'bar label = count'));
          assert.equal(new Set(rows.map((r) => r.count)).size, rows.length, 'counts are all different');
          let answer;
          if (/Which has the (most|fewest)/.test(task)) {
            const most = /most/.test(task);
            const target = rows.reduce((x, y) => (most ? y.count > x.count : y.count < x.count) ? y : x);
            answer = target.label;
          } else if (/How many more/.test(task)) {
            const [, big, small] = task.match(/How many more (.+?) than (.+?)\?/);
            answer = String(rows.find((r) => r.label === big).count - rows.find((r) => r.label === small).count);
          } else {
            const [, name] = task.match(/How many (.+?)\?/);
            answer = String(rows.find((r) => r.label === name).count);
          }
          const all = await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value));
          assert.equal(new Set(all).size, all.length, 'distinct choices');
          if (i === 0) {
            const wrong = all.find((v) => v !== answer);
            await page.locator(`#stage button[data-value="${wrong}"]`).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator(`#stage button[data-value="${answer}"]`).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('picture-graphs');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('measure-lab: the ruler, scale and jug show what the child measured', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`measure-lab/index.html?level=${level}`);
      const kinds = new Set();
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        if (/First guess/.test(task)) {
          kinds.add('ruler');
          const len = await page.locator('#stage figure.kv-ruler').evaluate((f) => Number(f.dataset.value));
          await page.locator('#stage [data-guess]').first().click();
          await page.locator('#stage .kv-slider').waitFor({ state: 'visible' });
          if (i === 0 && len > 1) { // one off is wrong and gets a hint
            await page.locator('#stage .kv-slider').fill(String(len - 1));
            await page.getByRole('button', { name: 'Check my measurement' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator('#stage .kv-slider').fill(String(len));
          assert.equal(await page.locator('#stage figure.kv-ruler').evaluate((f) => Number(f.dataset.marker)), len, 'marker sits at the end of the object');
          await page.getByRole('button', { name: 'Check my measurement' }).click();
        } else if (/balance/.test(task)) {
          kinds.add('balance');
          const w = await page.locator('#stage [data-weight]').evaluate((e) => Number(e.dataset.weight));
          const sizes = (level === 1 ? [5, 1] : level === 2 ? [10, 5, 1] : [50, 10, 5, 1]);
          let rest = w;
          for (const g of sizes) while (rest >= g) { await page.getByRole('button', { name: `Add a ${g} gram weight` }).click(); rest -= g; }
          assert.equal(await page.locator('#stage figure.kv-balance').evaluate((f) => f.dataset.heavier), 'equal', 'scale is level when weights match');
        } else {
          kinds.add('jug');
          const target = Number(task.match(/(\d+) mL/)[1]);
          const step = level === 1 ? 100 : 50;
          if (i === 0) { await page.getByRole('button', { name: 'Check the jug' }).click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          for (let f = 0; f < target; f += step) await page.getByRole('button', { name: `Pour ${step} millilitres more` }).click();
          assert.equal(await page.locator('#stage figure.kv-jug').evaluate((f) => Number(f.dataset.value)), target);
          await page.getByRole('button', { name: 'Check the jug' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('measure-lab');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('shape-detectives: counts, finds and mirrors agree with the pictures', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, octagon: 8 };
    for (const level of [1, 2, 3]) {
      await startRound(`shape-detectives/index.html?level=${level}`);
      const seen = new Set();
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/How many sides/.test(task)) {
          seen.add('count');
          const sides = await page.locator('#stage figure.kv-shape').evaluate((f) => ({ n: Number(f.dataset.sides), shape: f.dataset.shape }));
          assert.equal(SIDES[sides.shape], sides.n);
          assert.equal(await page.locator('#stage svg').first().evaluate((s) => s.querySelectorAll('polygon,rect').length), 1);
          const wrong = (await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value))).find((v) => v !== String(sides.n));
          await page.locator(`#stage button[data-value="${wrong}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          await page.locator(`#stage button[data-value="${sides.n}"]`).click();
        } else if (/Tap every/.test(task)) {
          seen.add('find');
          const name = task.match(/Tap every (\w+)/)[1];
          const targets = await page.locator('#stage .kv-shapegrid').evaluate((g) => Number(g.dataset.targets));
          assert.equal(await page.locator(`#stage .kv-shapecell[data-shape="${name}"]`).count(), targets, 'target count');
          assert.equal(await page.locator('#stage .kv-shapecell').count(), 9);
          if (i < 2) { await page.getByRole('button', { name: 'Done choosing' }).click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          const cells = page.locator(`#stage .kv-shapecell[data-shape="${name}"]`);
          for (let k = 0; k < targets; k++) await cells.nth(k).click();
          await page.getByRole('button', { name: 'Done choosing' }).click();
        } else {
          seen.add('mirror');
          assert.equal(level, 3, 'mirror questions only at level 3');
          await page.locator('#stage [data-option="same"]').click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          await page.locator('#stage [data-option="mirror"]').click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('shape-detectives');
        await page.locator('#next-btn').click();
      }
      assert.ok(seen.has('find'));
      await finishRound();
    }
  });

  section('block-builder: blocks built, traded and read equal the number', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`block-builder/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/What number do the blocks show/.test(task)) {
          const blocks = await page.locator('#stage .kv-blocks').first().evaluate((f) => ({ h: +f.dataset.h, t: +f.dataset.t, o: +f.dataset.o, v: +f.dataset.value }));
          assert.equal(blocks.h * 100 + blocks.t * 10 + blocks.o, blocks.v);
          assert.equal(await page.locator('#stage .kv-blocks .kv-flat').count(), blocks.h);
          assert.equal(await page.locator('#stage .kv-blocks .kv-rod').count(), blocks.t);
          assert.equal(await page.locator('#stage .kv-blocks .kv-cube').count(), blocks.o);
          const choices = await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value));
          assert.equal(new Set(choices).size, choices.length, 'distinct choices');
          assert.ok(choices.includes(String(blocks.v)));
          if (i === 0) { // a wrong choice keeps the question open
            const wrong = choices.find((c) => c !== String(blocks.v));
            await page.locator(`#stage button[data-value="${wrong}"]`).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator(`#stage button[data-value="${blocks.v}"]`).click();
        } else {
          const n = Number(task.match(/(\d+)/)[1]);
          const want = { h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 };
          const state = () => page.locator('#stage .kv-work').evaluate((f) => ({ h: +f.dataset.h, t: +f.dataset.t, o: +f.dataset.o }));
          if (/^Build/.test(task)) {
            for (let k = 0; k < want.h; k++) await page.getByRole('button', { name: 'Add a hundred flat' }).click();
            for (let k = 0; k < want.t; k++) await page.getByRole('button', { name: 'Add a ten rod' }).click();
            for (let k = 0; k < want.o; k++) await page.getByRole('button', { name: 'Add a one cube' }).click();
          } else {
            let guard = 0;
            for (;;) {
              const st = await state();
              if (st.o >= 10) await page.getByRole('button', { name: 'Trade ten ones for one ten' }).click();
              else if (st.t >= 10 && level > 1) await page.getByRole('button', { name: 'Trade ten tens for one hundred' }).click();
              else break;
              assert.ok(++guard < 40);
            }
          }
          assert.deepEqual(await state(), want, `blocks show ${n}`);
          assert.equal(await page.locator('#stage .kv-work').evaluate((f) => +f.dataset.value), n);
          if (i === 0) { // a one-short build is rejected with a hint
            await page.getByRole('button', { name: 'Take away a one cube' }).or(page.getByRole('button', { name: 'Take away a ten rod' })).first().click().catch(() => {});
            await page.getByRole('button', { name: 'Check my blocks' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
            const st = await state();
            if (st.h * 100 + st.t * 10 + st.o !== n) {
              // put the block back
              if (want.o > 0 || st.o < want.o) await page.getByRole('button', { name: 'Add a one cube' }).click().catch(() => {});
            }
            // rebuild exactly
            let s2 = await state();
            while (s2.h < want.h) { await page.getByRole('button', { name: 'Add a hundred flat' }).click(); s2 = await state(); }
            while (s2.t < want.t) { await page.getByRole('button', { name: 'Add a ten rod' }).click(); s2 = await state(); }
            while (s2.o < want.o) { await page.getByRole('button', { name: 'Add a one cube' }).click(); s2 = await state(); }
            while (s2.h > want.h) { await page.getByRole('button', { name: 'Take away a hundred flat' }).first().click(); s2 = await state(); }
            while (s2.t > want.t) { await page.getByRole('button', { name: 'Take away a ten rod' }).first().click(); s2 = await state(); }
            while (s2.o > want.o) { await page.getByRole('button', { name: 'Take away a one cube' }).first().click(); s2 = await state(); }
          }
          await page.getByRole('button', { name: 'Check my blocks' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('block-builder');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('coin-shop: the coins paid add up to the price (and the fewest when asked)', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const DENOMS = { 1: [10, 5, 1], 2: [25, 10, 5, 1], 3: [500, 100, 25, 10, 5, 1] };
    for (const level of [1, 2, 3]) {
      await startRound(`coin-shop/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const price = await page.locator('#stage .kv-tag').evaluate((t) => Number(t.dataset.cents));
        assert.ok(task.includes('exactly'), task);
        let rest = price;
        const pieces = [];
        for (const d of DENOMS[level]) while (rest >= d) { pieces.push(d); rest -= d; }
        assert.equal(rest, 0);
        if (i === 0) { // paying nothing keeps the question open with a hint
          await page.getByRole('button', { name: 'Pay now' }).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /need/);
        }
        for (const d of pieces) await page.locator(`#stage .kv-wallet [data-cents="${d}"]`).click();
        assert.equal(await page.locator('#stage .kv-paytray').evaluate((t) => Number(t.dataset.total)), price, 'tray total equals price');
        // each piece in the tray is drawn as a coin or note of that value
        assert.equal(await page.locator('#stage .kv-paytray [data-cents]').count(), pieces.length);
        await page.getByRole('button', { name: 'Pay now' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('coin-shop');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('fraction-pizza: shaded slices, equal fractions and ordering match the fractions asked for', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`fraction-pizza/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const sliceCount = await page.locator('#stage .kv-live .kv-slice').count();
        if (/Put the pizzas in order/.test(task)) {
          const vals = await page.locator('#stage .pk-card figure').evaluateAll((fs) => fs.map((f) => Number(f.dataset.num) / Number(f.dataset.den)));
          assert.equal(vals.length, 3);
          assert.equal(new Set(vals.map((v) => v.toFixed(4))).size, 3, 'three different amounts');
          const order = vals.map((v, idx) => [v, idx]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
          await page.getByRole('button', { name: 'Check the order' }).click(); // incomplete: gentle hint
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          for (const idx of order) await page.locator('#stage .pk-card').nth(idx).click();
          // clicking hides cards, so indexes stay stable: hidden cards keep their place
        } else {
          let n, d;
          if (/same amount/.test(task)) {
            [n, d] = await page.locator('#stage figure.kv-pie[data-num]:not(.kv-live)').first().evaluate((f) => [Number(f.dataset.num), Number(f.dataset.den)]);
          } else {
            [n, d] = task.match(/(\d+)\/(\d+)/).slice(1).map(Number);
            assert.equal(sliceCount, d, 'pie is cut into the denominator');
          }
          const need = (n * sliceCount) / d;
          assert.ok(Number.isInteger(need), `${n}/${d} can be shown with ${sliceCount} slices`);
          if (i === 0) { // wrong first: nothing shaded
            await page.getByRole('button', { name: 'Check my pizza' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          for (let s = 0; s < need; s++) await page.locator('#stage .kv-live .kv-slice').nth(s).click();
          assert.equal(await page.locator('#stage .kv-live').evaluate((f) => Number(f.dataset.num)), need);
        }
        await page.getByRole('button', { name: /Check (my pizza|the order)/ }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.match(await page.locator('#feedback').textContent(), /Yes|got it/);
        await noOverflow('fraction-pizza');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('clock-setter: drag and buttons set the right time at every level', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`clock-setter/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const [, h, m] = task.match(/(\d+):(\d{2})/).map(Number);
        if (level === 1) assert.ok(m === 0 || m === 30, 'level 1 only asks o\'clock and half past: ' + task);
        if (level === 2) assert.equal(m % 5, 0, task);
        if (i === 0) {
          // Real pointer path: press near the minute mark, then near the hour mark.
          const box = await page.locator('#stage svg').first().boundingBox();
          const cx = box.x + box.width / 2, cy = box.y + box.height / 2, R = box.width / 2;
          const at = (deg, f) => [cx + Math.sin(deg * Math.PI / 180) * R * f, cy - Math.cos(deg * Math.PI / 180) * R * f];
          let [x, y] = at(m * 6, 0.8);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
          [x, y] = at((h % 12) * 30, 0.3);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
        } else {
          await page.evaluate(([hh, mm]) => document.querySelector('#stage .kv-clock').set(hh, mm), [h, m]);
        }
        const shown = await page.locator('#stage .kv-clock').evaluate((f) => [Number(f.dataset.h), Number(f.dataset.m)]);
        assert.deepEqual(shown, [h, m], `clock shows ${shown} but asked for ${h}:${m} (level ${level}, question ${i})`);
        if (i === 1) { // a wrong answer gives a hint and keeps the question open
          await page.evaluate(([hh]) => document.querySelector('#stage .kv-clock').set(hh % 12 + 1, 0), [h]);
          await page.getByRole('button', { name: 'Check the clock' }).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /hand|clock/i);
          await page.evaluate(([hh, mm]) => document.querySelector('#stage .kv-clock').set(hh, mm), [h, m]);
        }
        await page.getByRole('button', { name: 'Check the clock' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('clock-setter');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });


  const before = await plays().catch(() => 0);
  for (const [name, fn] of sections) {
    if (only && !name.includes(only)) continue;
    await fn(ctx);
    console.log('PASS', name);
  }
  assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
  assert.deepEqual(external, [], 'external requests: ' + external.join(', '));
  fs.writeFileSync('artifacts/.pictures-ran', String(Date.now()));
  await browser.close();
  console.log(`PASS picture games (${sections.filter(([n]) => !only || n.includes(only)).length} sections); no errors or external requests.`);
})().catch((e) => { console.error(e); process.exit(1); });
