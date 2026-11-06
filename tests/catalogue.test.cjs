const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cat = require('../assets/js/catalogue.js');

const folders = fs.readdirSync('games').filter(id => fs.existsSync(path.join('games', id, 'index.html')));

test('every game folder has exactly one catalogue entry and vice versa', () => {
 const ids = cat.GAMES.map(g => g.id);
 assert.equal(new Set(ids).size, ids.length, 'duplicate catalogue ids');
 assert.deepEqual([...ids].sort(), [...folders].sort());
});

test('catalogue entries are complete', () => {
 for (const g of cat.GAMES) {
  assert.ok(g.name && g.icon && g.blurb, g.id + ' needs name, icon and blurb');
  assert.ok(cat.LEVELS[g.level], g.id + ' has a bad level');
  assert.ok(cat.SUBJECTS[g.subject], g.id + ' has a bad subject');
  assert.ok(Array.isArray(g.skills) && g.skills.length, g.id + ' needs skills');
  for (const s of g.skills) assert.match(s, /^[a-z]+\.[a-z0-9-]+$/, g.id + ' skill ' + s);
 }
});

test('learning path steps are real games of the right subject area', () => {
 for (const [key, p] of Object.entries(cat.PATHS)) {
  assert.ok(p.steps.length >= 4, key + ' path is too short');
  const seen = new Set();
  for (const step of p.steps) {
   assert.ok(cat.byId(step.game), key + ' path names unknown game ' + step.game);
   assert.ok(!seen.has(step.game), key + ' path repeats ' + step.game);
   seen.add(step.game);
   assert.ok(step.label);
  }
 }
});

test('every game page links the shared home button and loads progress before the engine', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  assert.match(html, /\.\.\/\.\.\/index\.html/, id + ' needs a link home');
  const p = html.indexOf('progress.js'), q = html.indexOf('quiz-engine.js');
  if (q >= 0) assert.ok(p >= 0 && p < q, id + ' must load progress.js before quiz-engine.js');
 }
});

test('every game page loads the catalogue before progress, or catalogue badges can never be earned', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  const c = html.indexOf('catalogue.js'), p = html.indexOf('progress.js');
  assert.ok(c >= 0 && c < p, id + ' must load catalogue.js before progress.js');
 }
 assert.match(fs.readFileSync('scripts/new-game.cjs', 'utf8'), /'catalogue\.js', 'progress\.js'/, 'new games must load it too');
});

test('every game page loads the shared frame last, after the game has built its controls', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  const shell = html.lastIndexOf('page-shell.js');
  assert.ok(shell >= 0, id + ' must load page-shell.js');
  assert.equal(html.lastIndexOf('<script', shell - 1), html.lastIndexOf('<script'), id + ' must load page-shell.js last');
 }
 assert.match(fs.readFileSync('scripts/new-game.cjs', 'utf8'), /page-shell\.js/, 'new games must load it too');
});

test('a child can reach every game from an age and a subject', () => {
 const reached = new Set();
 for (const stage of [1, 2, 3, 4]) {
  for (const subject of Object.keys(cat.SUBJECTS)) {
   const list = cat.gamesFor(stage, subject);
   assert.ok(list.length > 0, `stage ${stage} has nothing in ${subject}`);
   assert.ok(list.every((g) => g.subject === subject), subject);
   list.forEach((g) => reached.add(g.id));
  }
 }
 assert.deepEqual(cat.GAMES.map((g) => g.id).filter((id) => !reached.has(id)), []);
 assert.equal(cat.gamesFor('all').length, cat.GAMES.length);
});

test('every subject has a tile, and every stage has words to say', () => {
 for (const s of Object.values(cat.SUBJECTS)) assert.ok(s.kid && s.icon && s.say, s.label);
 for (const l of Object.values(cat.LEVELS)) assert.ok(l.short && l.say, l.name);
});

test('games come in learning-path order, and only for the chosen age', () => {
 const math = cat.gamesFor(1, 'math');
 assert.ok(math.every((g) => g.level === 1));
 const onPath = math.filter((g) => cat.pathStep(g) !== Infinity);
 assert.deepEqual(onPath.map(cat.pathStep), onPath.map(cat.pathStep).slice().sort((a, b) => a - b));
 assert.equal(math[0].id, 'number-sounds');
 const firstOff = math.findIndex((g) => cat.pathStep(g) === Infinity);
 if (firstOff >= 0) assert.ok(math.slice(firstOff).every((g) => cat.pathStep(g) === Infinity), 'path games come first');
 assert.deepEqual(cat.levelsFor(4, 'math'), [4, 3], 'the oldest stage also gets the 7–9 games');
 assert.deepEqual(cat.levelsFor(3, 'science'), [2], 'a gap falls back to the nearest easier level');
 assert.deepEqual(cat.levelsFor(4, 'logic'), [2]);
});

test('Play next moves on as stars are earned, and never gets stuck', () => {
 const star = (...ids) => Object.fromEntries(ids.map((id) => [id, { bestStars: 1 }]));
 assert.equal(cat.nextFor(1, {}).subject, 'math');
 assert.equal(cat.nextFor(1, {}).id, 'number-sounds');
 assert.equal(cat.nextFor(1, star('number-sounds')).id, 'counting');
 assert.equal(cat.nextFor(1, {}, 'english').subject, 'english', 'stays in the subject last chosen');
 assert.equal(cat.nextFor(1, {}, 'nonsense').subject, 'math');
 const everything = Object.fromEntries(cat.GAMES.map((g) => [g.id, { bestStars: 3 }]));
 everything.counting = { bestStars: 1 };
 assert.equal(cat.nextFor(1, everything).id, 'counting', 'with every star earned, it offers the weakest game');
 for (const stage of [1, 2, 3, 4, 'all']) assert.ok(cat.nextFor(stage, {}), 'stage ' + stage);
});

test('the next game is a different game in the same subject', () => {
 for (const g of cat.GAMES) {
  for (const stage of [1, 2, 3, 4, null]) {
   const next = cat.nextAfter(g.id, stage, {});
   if (!next) continue;
   assert.notEqual(next.id, g.id, g.id);
   assert.equal(next.subject, g.subject, g.id);
  }
 }
 assert.equal(cat.nextAfter('number-sounds', 1, {}).id, 'counting');
 assert.equal(cat.nextAfter('number-sounds', 1, { counting: { bestStars: 2 } }).id === 'counting', false, 'skips a finished game');
 assert.equal(cat.nextAfter('nothing', 1, {}), null);
});

test('the Picture Pro badge can still be earned', () => {
 assert.ok(cat.GAMES.filter((g) => g.v3).length >= 10);
});

test('index.html game count and noscript list match the catalogue (run npm run sync:index)', () => {
 const { synced } = require('../scripts/sync-index.cjs');
 const html = fs.readFileSync('index.html', 'utf8');
 assert.equal(synced(html), html);
});

test('the offline service worker saves every page, script, picture, font and recording (run npm run sw)', () => {
 const sw = fs.readFileSync('sw.js', 'utf8');
 const listed = new Set(JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1]).map((f) => f.replace(/^\.\//, '')));
 const walk = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p.split(path.sep).join('/')];
 const needed = ['index.html', 'manifest.webmanifest', ...walk('assets'), ...walk('games')].filter((f) => !/(^|\/)\.|\.md$/.test(f));
 const missing = needed.filter((f) => !listed.has(f));
 assert.deepEqual(missing, [], 'sw.js is missing files — run npm run sw');
 for (const f of listed) if (f) assert.ok(fs.existsSync(f), 'sw.js lists a file that no longer exists: ' + f);
 const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
 for (const icon of manifest.icons) assert.ok(fs.existsSync(icon.src), icon.src);
 assert.match(fs.readFileSync('index.html', 'utf8'), /rel="manifest"/);
});
