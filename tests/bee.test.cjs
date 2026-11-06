// Spelling Bee training: the word bank and the rules, with no browser needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { WORDS, BEE_LIST, PATTERNS, ORIGIN_TIPS, POS_TIPS, TIERS } = require('../games/spelling-bee/bee-words.js');
const Core = require('../games/spelling-bee/bee-core.js');

const TODAY = 20000;
const seeded = (seed = 1) => () => {
 seed = (seed * 16807) % 2147483647;
 return (seed - 1) / 2147483646;
};
const store = (extra) => ({ ...Core.emptyStore(), ...extra });

/** A word the voice could read two ways would be unfair, so none may be in the bank. */
const HETERONYMS = ['read', 'lead', 'tear', 'wind', 'bow', 'close', 'live', 'minute', 'object', 'present', 'record', 'desert', 'dove', 'sow', 'refuse', 'content', 'produce', 'row', 'bass', 'permit', 'rebel', 'conduct', 'contract', 'invalid', 'project', 'subject', 'suspect', 'polish', 'wound', 'does', 'separate', 'buffet', 'transport', 'construct', 'address', 'perfect', 'entrance', 'sewer', 'august', 'attribute', 'console', 'convert', 'digest', 'export', 'import', 'increase', 'insult', 'moderate', 'estimate', 'graduate', 'alternate', 'appropriate', 'tomorrow-'];

test('every word is complete and its clues never give the spelling away', () => {
 const seen = new Set();
 for (const w of WORDS) {
  assert.match(w.word, /^[a-z]+$/, `${w.word}: letters only, so it can be typed`);
  assert.ok(!seen.has(w.word), `${w.word} is listed twice`);
  seen.add(w.word);
  assert.ok(Object.keys(POS_TIPS).includes(w.pos), `${w.word}: part of speech ${w.pos}`);
  assert.ok(ORIGIN_TIPS[w.origin], `${w.word}: origin ${w.origin} has no tip`);
  assert.ok(w.patterns.length >= 1, `${w.word} has no pattern`);
  for (const p of w.patterns) assert.ok(PATTERNS[p], `${w.word}: unknown pattern ${p}`);
  assert.ok(w.word.includes(w.tricky), `${w.word}: tricky part "${w.tricky}" is not in the word`);
  assert.ok(TIERS[w.tier], `${w.word}: tier`);
  const def = w.def.toLowerCase();
  assert.ok(!new RegExp(`\\b${w.word}\\b`).test(def), `${w.word}: the meaning gives the word`);
  if (w.word.length >= 6) assert.ok(!def.includes(w.word.slice(0, 5)), `${w.word}: the meaning gives most of the word: ${w.def}`);
  assert.ok(new RegExp(`\\b${w.word}\\b`, 'i').test(w.sentence), `${w.word}: the sentence does not use the word: ${w.sentence}`);
  assert.ok(!new RegExp(`\\b${w.word}\\b`, 'i').test(Core.maskSentence(w.sentence, w.word)), `${w.word}: the hidden sentence still shows it`);
  assert.match(w.sentence, /^[A-Z].*[.?!]$/, `${w.word}: sentence punctuation`);
 }
});

test('the bank is big enough to study from, at every level and for every pattern', () => {
 assert.ok(WORDS.length >= 450, `only ${WORDS.length} words`);
 const tier = (n) => WORDS.filter((w) => w.tier === n).length;
 assert.ok(tier(1) >= 3 * Core.SESSION_SIZE && tier(2) >= 3 * Core.SESSION_SIZE && tier(3) >= 3 * Core.SESSION_SIZE);
 for (const key of Object.keys(PATTERNS)) {
  const n = WORDS.filter((w) => w.patterns.includes(key)).length;
  assert.ok(n >= 3 * Core.PATTERN_SIZE, `${key} has only ${n} words`);
  assert.ok(PATTERNS[key].name && PATTERNS[key].icon && PATTERNS[key].rule.length > 20, key);
 }
});

test('a word the voice could read two ways is left out, or always comes with its meaning', () => {
 const byWord = new Map(WORDS.map((w) => [w.word, w]));
 for (const bad of HETERONYMS) if (byWord.has(bad)) assert.ok(byWord.get(bad).define && byWord.get(bad).def, `${bad} can be said two ways`);
 assert.ok(byWord.get('lead').define, 'lead is on the bee list and needs its meaning');
});

test('the third-grade bee list is all there', () => {
 assert.equal(BEE_LIST.length, 50);
 assert.equal(new Set(BEE_LIST).size, 50);
 const flagged = WORDS.filter((w) => w.list);
 assert.deepEqual(flagged.map((w) => w.word).sort(), [...BEE_LIST].sort());
 assert.ok(flagged.every((w) => w.tier === 1));
});

test('sound-alikes and other spellings are well formed', () => {
 for (const w of WORDS) {
  if (w.homo) {
   assert.match(w.homo, /^[a-z]+$/, w.word);
   assert.notEqual(w.homo, w.word);
   assert.ok(w.def, `${w.word}: a sound-alike must have a meaning, the pronouncer gives it`);
  }
  for (const other of w.also || []) { assert.match(other, /^[a-z]+$/, w.word); assert.notEqual(other, w.word); }
 }
 // The words are shown with a capital where they need one.
 assert.equal(Core.display(WORDS.find((w) => w.word === 'february')), 'February');
});

test('a word comes back on a spaced schedule', () => {
 const s = store();
 Core.recordResult(s, 'because', true, TODAY);
 assert.deepEqual(s.words.because, { b: 2, due: TODAY + 3, tries: 1, miss: 0 }, 'right first time waits three days');
 Core.recordResult(s, 'friend', false, TODAY);
 assert.deepEqual(s.words.friend, { b: 1, due: TODAY + 1, tries: 1, miss: 1 }, 'a miss returns tomorrow');
 Core.recordResult(s, 'because', true, TODAY + 3);
 assert.equal(s.words.because.b, 3);
 assert.equal(s.words.because.due, TODAY + 10);
 assert.equal(Core.stateOf(s, 'because'), 'learning');
 Core.recordResult(s, 'because', true, TODAY + 10);
 assert.equal(Core.stateOf(s, 'because'), 'mastered', 'right on three different days');
 Core.recordResult(s, 'because', false, TODAY + 24);
 assert.equal(s.words.because.b, 1, 'a miss always starts again');
 assert.equal(Core.stateOf(s, 'because'), 'learning');
 assert.equal(Core.stateOf(s, 'never'), 'new');
});

test('cramming earns no credit: a right answer only counts once the word is due', () => {
 const s = store();
 Core.recordResult(s, 'because', true, TODAY);
 for (let i = 0; i < 10; i++) Core.recordResult(s, 'because', true, TODAY);
 assert.equal(s.words.because.b, 2);
 assert.equal(s.words.because.due, TODAY + 3);
});

test('with a bee coming, a word always returns before the bee', () => {
 assert.equal(Core.intervalFor(4, null), 14);
 assert.equal(Core.intervalFor(4, 10), 5);
 assert.equal(Core.intervalFor(5, 2), 1);
 assert.equal(Core.intervalFor(1, 30), 1);
 const s = store({ beeDate: '2026-12-01' });
 const today = Core.dayFromIso('2026-11-27');
 Core.recordResult(s, 'because', true, today);
 assert.ok(s.words.because.due < Core.dayFromIso('2026-12-01'));
});

test('a practice round: due words first, then new words, and never empty', () => {
 const s = store();
 Core.recordResult(s, 'because', false, TODAY - 5);
 Core.recordResult(s, 'friend', false, TODAY - 1);
 Core.recordResult(s, 'people', true, TODAY);
 const plan = Core.planSession(s, WORDS, TODAY, { rng: seeded() });
 assert.equal(plan.length, Core.SESSION_SIZE);
 assert.equal(plan[0].word, 'because', 'most overdue first');
 assert.equal(plan[1].word, 'friend');
 assert.ok(!plan.some((w) => w.word === 'people'), 'not due and new words are left');
 assert.equal(new Set(plan.map((w) => w.word)).size, plan.length, 'no repeats');
 assert.ok(plan.slice(2).every((w) => w.list), 'new words start with the bee list');
 // Everything known and nothing due: still a full round.
 const all = store();
 WORDS.forEach((w) => Core.recordResult(all, w.word, true, TODAY));
 assert.equal(Core.planSession(all, WORDS, TODAY, { rng: seeded() }).length, Core.SESSION_SIZE);
 // An empty record is a full round too.
 assert.equal(Core.planSession(store(), WORDS, TODAY, { rng: seeded() }).length, Core.SESSION_SIZE);
});

test('after the bee list, new words step up a level', () => {
 const s = store();
 BEE_LIST.forEach((word) => Core.recordResult(s, word, true, TODAY));
 const plan = Core.planSession(s, WORDS, TODAY, { rng: seeded() });
 assert.ok(plan.every((w) => w.tier === 2), 'nothing is due, so all are Stretch words');
});

test('choosing what to learn first changes the new words', () => {
 const plan = (focus, custom = []) => Core.planSession(store({ focus, custom }), Core.allWords(WORDS, custom), TODAY, { rng: seeded() });
 assert.ok(plan('stretch').every((w) => w.tier === 2));
 assert.ok(plan('champion').every((w) => w.tier === 3));
 const custom = [{ word: 'zamboni', def: 'an ice machine' }, { word: 'because', def: '' }];
 const school = plan('school', custom).map((w) => w.word);
 assert.deepEqual(school.slice(0, 2).sort(), ['because', 'zamboni']);
 const word = Core.allWords(WORDS, custom).find((w) => w.word === 'because');
 assert.ok(word.sentence, 'a list word we already know keeps its clues');
});

test('pattern practice uses the pattern, least secure words first', () => {
 const s = store();
 const plan = Core.planPattern(s, WORDS, 'silent', TODAY, { rng: seeded() });
 assert.equal(plan.length, Core.PATTERN_SIZE);
 assert.ok(plan.every((w) => w.patterns.includes('silent')));
 Core.recordResult(s, 'knee', false, TODAY - 2);
 assert.equal(Core.planPattern(s, WORDS, 'silent', TODAY, { rng: seeded() })[0].word, 'knee', 'a due word comes first');
});

test('checking a spelling shows exactly which letters went wrong', () => {
 const marks = (t, w) => Core.compare(t, w).typed.map((c) => (c.ok ? c.ch : c.ch.toUpperCase())).join('');
 assert.equal(marks('because', 'because'), 'because');
 assert.equal(marks('freind', 'friend'), 'frEInd', 'swapped letters');
 assert.equal(marks('becuse', 'because'), 'becuse', 'a missing letter does not mark the rest wrong');
 assert.equal(marks('runing', 'running'), 'runing');
 assert.equal(marks('runnning', 'running').length, 8);
 assert.equal(Core.compare('z', 'forest').typed[0].ok, false);
 assert.equal(Core.compare('', 'forest').typed.length, 0);
});

test('judging: exact, accepted other spellings, and sound-alikes', () => {
 const fav = WORDS.find((w) => w.word === 'favorite');
 assert.deepEqual(Core.judge(fav, 'Favorite'), { right: true, kind: 'right' }, 'capitals do not matter');
 assert.deepEqual(Core.judge(fav, 'favourite'), { right: true, kind: 'variant' });
 assert.equal(Core.judge(fav, 'favrite').right, false);
 const knight = WORDS.find((w) => w.word === 'knight');
 assert.deepEqual(Core.judge(knight, 'night'), { right: false, kind: 'homophone' });
});

test('a pasted school list: common shapes work, and anything else is reported', () => {
 const { words, skipped } = Core.parseList(`
  1. Castle
  2) because - for the reason that
  • piñata
  rhythm: a steady beat
  cat, dog, fish
  ice cream
  mother-in-law
  cat
 `);
 assert.deepEqual(words.map((w) => w.word), ['castle', 'because', 'pinata', 'rhythm', 'cat', 'dog', 'fish']);
 assert.equal(words[1].def, 'for the reason that');
 assert.equal(words[3].def, 'a steady beat');
 assert.deepEqual(skipped, ['ice cream', 'mother-in-law']);
 assert.deepEqual(Core.parseList('').words, []);
 assert.equal(Core.parseList(Array(900).fill(0).map((_, i) => 'a'.repeat(1 + (i % 20)) + 'bcdefghijklmnopqrstuvwxyz'[i % 25]).join('\n')).words.length <= 600, true);
 assert.deepEqual(Core.parseList('<img src=x onerror=alert(1)>').words, []);
});

const BEE = Core.BEES.school;
const rivals = (n) => Core.RIVALS.slice(0, n);
const always = () => 0; // every rival spells correctly
const never = () => 0.999; // every rival misses

test('end of a bee follows the 2027 rules', () => {
 // Rule 7: a miss eliminates, when someone else was right.
 let r = Core.settleRound(BEE, 1, rivals(3), false, always);
 assert.equal(r.outcome, 'out');
 assert.equal(r.place, 4);
 assert.deepEqual(r.alive, rivals(3));
 // Rule 8: nobody right, so everyone stays, including the child.
 r = Core.settleRound(BEE, 1, rivals(3), false, never);
 assert.equal(r.outcome, 'allstay');
 assert.deepEqual(r.alive, rivals(3));
 // Rule 8: the only speller right is the champion at once, with no extra word.
 r = Core.settleRound(BEE, 1, rivals(3), true, never);
 assert.equal(r.outcome, 'champion');
 // Rule 8: everyone out in one round ties for the same place.
 let flip = 0;
 r = Core.settleRound(BEE, 1, rivals(4), false, () => (flip++ % 2 ? 0.999 : 0));
 assert.equal(r.outcome, 'out');
 assert.equal(r.place, 3, 'two rivals still in, so the child and those out with them are third');
 assert.equal(r.tiedWith.length, 2);
 // Right, with others right too: the bee goes on, and those who missed are gone.
 flip = 0;
 r = Core.settleRound(BEE, 1, rivals(4), true, () => (flip++ % 2 ? 0.999 : 0));
 assert.equal(r.outcome, 'next');
 assert.equal(r.alive.length, 2);
});

test('rivals get weaker as words get harder, and a bee lasts a sensible time', () => {
 for (const bee of Object.values(Core.BEES)) {
  assert.ok(Core.rivalChance(bee, 1) > Core.rivalChance(bee, 5));
  assert.ok(Core.rivalChance(bee, 50) >= bee.floor);
  const lengths = [];
  const rng = seeded(7);
  for (let run = 0; run < 400; run++) {
   let alive = Core.RIVALS.slice(0, bee.rivals);
   let round = 0;
   for (;;) {
    round += 1;
    const r = Core.settleRound(bee, round, alive, true, rng);
    if (r.outcome === 'champion') break;
    alive = r.alive;
   }
   lengths.push(round);
  }
  lengths.sort((a, b) => a - b);
  const median = lengths[200];
  const [low, high] = bee.key === 'class' ? [4, 8] : [6, 12];
  assert.ok(median >= low && median <= high, `${bee.key}: a perfect speller needs ${median} rounds`);
 }
});

test('mock bee words get harder, and never repeat', () => {
 const used = new Set();
 const s = store();
 const tiers = [];
 for (let round = 1; round <= 12; round++) {
  const w = Core.pickMockWord(BEE, round, WORDS, used, s, seeded(round));
  assert.ok(!used.has(w.word));
  used.add(w.word);
  tiers.push(w.tier);
 }
 assert.deepEqual(tiers.slice(0, 3), [1, 1, 1]);
 // The bee list opens both bees, and the classroom bee stays on it longer.
 for (const [bee, rounds] of [[BEE, 3], [Core.BEES.class, 5]]) {
  for (let round = 1; round <= rounds; round++) assert.ok(Core.pickMockWord(bee, round, WORDS, new Set(), store(), seeded(round)).list, `${bee.key} round ${round}`);
  assert.equal(Core.pickMockWord(bee, rounds + 1, WORDS, new Set(), store(), seeded()).tier, 2);
 }
 assert.deepEqual(tiers.slice(3, 6), [2, 2, 2]);
 assert.ok(tiers.slice(6).every((t) => t === 3));
 // A school's list comes first, and the last rounds go beyond it, as in a real bee.
 const school = store({ focus: 'school', custom: [{ word: 'zamboni', def: '' }] });
 const pool = Core.allWords(WORDS, school.custom);
 assert.equal(Core.pickMockWord(BEE, 1, pool, new Set(), school, seeded()).word, 'zamboni');
 assert.notEqual(Core.pickMockWord(BEE, 1, pool, new Set(['zamboni']), school, seeded()).word, 'zamboni');
 assert.equal(Core.pickMockWord(BEE, BEE.onList + 1, pool, new Set(), school, seeded()).tier, BEE.tierAt(BEE.onList + 1));
});

test('a vocabulary question has one right answer and a fair wrong one', () => {
 assert.ok(Core.isVocabRound(BEE, 3));
 assert.ok(!Core.isVocabRound(BEE, 4));
 assert.ok(!Core.isVocabRound(Core.BEES.class, 3), 'the classroom bee is spelling only');
 for (const w of WORDS) {
  const q = Core.vocabQuestion(w, WORDS, seeded(w.word.length));
  assert.equal(q.options[q.answer], w.def);
  assert.notEqual(q.options[1 - q.answer], w.def, w.word);
 }
});

test('places and bests', () => {
 assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(Core.ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
 const s = store();
 Core.saveBest(s, 'school', 5, 12);
 Core.saveBest(s, 'school', 7, 12);
 assert.equal(s.best.school.place, 5, 'a worse finish does not replace the best');
 Core.saveBest(s, 'school', 1, 12);
 assert.equal(s.best.school.place, 1);
 assert.equal(s.wins, 1);
});

test('a daily goal counts the days to the bee', () => {
 const today = Core.dayFromIso('2026-11-06');
 assert.equal(Core.dailyGoal(store(), WORDS, today), null, 'no date, no goal');
 assert.equal(Core.dailyGoal(store({ beeDate: '2026-11-01' }), WORDS, today), null, 'a past date, no goal');
 const goal = Core.dailyGoal(store({ beeDate: '2026-11-16' }), WORDS, today);
 assert.equal(goal.daysLeft, 10);
 assert.equal(goal.fresh, 50);
 assert.equal(goal.perDay, 5);
 const custom = [{ word: 'cat', def: '' }, { word: 'dog', def: '' }];
 const school = store({ beeDate: '2026-11-08', focus: 'school', custom });
 assert.equal(Core.dailyGoal(school, Core.allWords(WORDS, custom), today).perDay, 1);
});

test('damaged saved data is survived', () => {
 for (const bad of [null, 'oops', 7, [], { words: 'no' }, { words: { a: { b: 99, due: 1 }, c: null }, custom: 'x', focus: 'bad', beeDate: 'soon', best: 3 }]) {
  const s = Core.normalizeStore(bad);
  assert.deepEqual(s, { ...Core.emptyStore() });
 }
 const good = Core.normalizeStore({ words: { because: { b: 3, due: 5, tries: 2, miss: 1 } }, custom: [{ word: 'cat', def: 'pet' }, { word: 'b@d' }], focus: 'stretch', beeDate: '2026-12-01', best: { school: { place: 2, of: 12 } } });
 assert.equal(good.words.because.b, 3);
 assert.deepEqual(good.custom, [{ word: 'cat', def: 'pet' }]);
 assert.equal(good.focus, 'stretch');
 assert.equal(good.best.school.place, 2);
});

test('the tricky part splits where it should', () => {
 const w = WORDS.find((x) => x.word === 'friend');
 assert.deepEqual(Core.splitTricky(w), ['fr', 'ie', 'nd']);
 assert.deepEqual(Core.splitTricky({ word: 'zamboni', tricky: '' }), ['zamboni', '', '']);
 const feb = WORDS.find((x) => x.word === 'february');
 assert.equal(Core.splitTricky(feb).join(''), 'February');
});
