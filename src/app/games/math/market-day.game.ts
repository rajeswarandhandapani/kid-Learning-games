import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, numericChoices, pick, randomInt } from './math-helpers';

const NAMES = ['Priya', 'Arun', 'Kavya', 'Ravi', 'Meena', 'Sam', 'Aisha', 'Leo', 'Nila', 'Omar', 'Divya', 'Karthik'];
const rupees = (n: number) => `₹${n}`;

interface StorySpec {
  visual: () => HTMLElement | null;
  prompt: string;
  answer: number;
  money?: boolean;
  mistakes: number[];
  explain: string;
}

function scene(title: string, ...parts: Array<Node | null>): HTMLElement {
  const box = document.createElement('div');
  box.className = 'mv-scene';
  const t = document.createElement('div');
  t.className = 'mv-scene-title';
  t.textContent = title;
  box.appendChild(t);
  parts.forEach((p) => {
    if (p) box.appendChild(p);
  });
  return box;
}

function tag(text: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'mv-tag';
  s.textContent = text;
  return s;
}

function buildOneStep(level: number): Array<() => StorySpec> {
  const small = level === 1 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const factor = (max = level === 1 ? 5 : 9) => randomInt(2, max);
  const name = () => pick(NAMES);

  return [
    function packs() {
      const [emoji, item, pack] = pick([
        ['🧁', 'cupcakes', 'box'],
        ['🥚', 'eggs', 'box'],
        ['🍬', 'sweets', 'bag'],
        ['🖍️', 'crayons', 'box'],
        ['🍌', 'bananas', 'bunch'],
      ] as const);
      const each = pick(small.filter((n) => n <= 8));
      const count = factor(6);
      const who = name();
      const holder = pack === 'bag' ? 'bag' : pack === 'bunch' ? 'none' : 'box';
      return {
        visual: () => scene('🛒 AT THE SHOP', klgMathVis()?.groups(count, each, emoji, { holder }) ?? null),
        prompt: `${item[0].toUpperCase() + item.slice(1)} come in ${
          pack === 'bunch' ? 'bunches' : `${pack}${pack === 'box' ? 'es' : 's'}`
        } of ${each}. ${who} buys ${count}. How many ${item} is that?`,
        answer: count * each,
        mistakes: [count + each, count * each + each, count * (each - 1)],
        explain: `${count} × ${each} = ${count * each} ${item}.`,
      };
    },
    function price() {
      const [emoji, item] = pick([
        ['🥭', 'mango'],
        ['✏️', 'pencil'],
        ['🎈', 'balloon'],
        ['🍦', 'ice cream'],
        ['📒', 'notebook'],
        ['🥥', 'coconut'],
      ] as const);
      const cost = pick(small);
      const count = factor(6);
      return {
        visual: () => scene('🏷️ PRICE LIST', klgMathVis()?.pile(count, emoji) ?? null, tag(`${rupees(cost)} each`)),
        prompt: `One ${item} costs ${rupees(cost)}. How much do ${count} ${item}s cost?`,
        answer: count * cost,
        money: true,
        mistakes: [count + cost, (count + 1) * cost, count * cost - cost],
        explain: `${count} × ${rupees(cost)} = ${rupees(count * cost)}.`,
      };
    },
    function unitPrice() {
      const [emoji, item] = pick([
        ['✏️', 'pencils'],
        ['🍎', 'apples'],
        ['🧃', 'juice boxes'],
        ['🍫', 'chocolates'],
      ] as const);
      const cost = pick(small);
      const count = factor(6);
      const who = name();
      return {
        visual: () => scene('🧾 THE BILL', klgMathVis()?.pile(count, emoji) ?? null, tag(`Total ${rupees(cost * count)}`)),
        prompt: `${who} paid ${rupees(cost * count)} for ${count} ${item}. They all cost the same. How much is one?`,
        answer: cost,
        money: true,
        mistakes: [count, cost * count - count, cost + 1],
        explain: `${rupees(cost * count)} ÷ ${count} = ${rupees(cost)} each.`,
      };
    },
    function share() {
      const [emoji, item] = pick([
        ['🍪', 'biscuits'],
        ['🍬', 'sweets'],
        ['🍇', 'grapes'],
        ['🃏', 'cards'],
      ] as const);
      const people = pick(small.filter((n) => n <= 6));
      const each = factor(7);
      const who = name();
      return {
        visual: () => scene('🤝 SHARING', klgMathVis()?.share(people * each, people, emoji) ?? null),
        prompt: `${who} shares ${people * each} ${item} equally among ${people} friends. How many does each friend get?`,
        answer: each,
        mistakes: [people, people * each - people, each + 1],
        explain: `${people * each} ÷ ${people} = ${each} each.`,
      };
    },
    function seats() {
      const rows = factor(8);
      const per = pick(small.filter((n) => n <= 10));
      return {
        visual: () => scene('🎭 SCHOOL SHOW', klgMathVis()?.array(rows, per, '🪑') ?? null),
        prompt: `Chairs for the school show are set out in ${rows} rows of ${per}. How many chairs are there?`,
        answer: rows * per,
        mistakes: [rows + per, rows * per - per, (rows + 1) * per],
        explain: `${rows} rows × ${per} = ${rows * per} chairs.`,
      };
    },
    function legs() {
      const [emoji, animal, legs] = pick([
        ['🐄', 'cows', 4],
        ['🐔', 'hens', 2],
        ['🐕', 'dogs', 4],
        ['🕷️', 'spiders', 8],
        ['🐞', 'ladybirds', 6],
      ] as const);
      const count = factor(level === 1 ? 5 : 7);
      return {
        visual: () => scene('🌾 ON THE FARM', klgMathVis()?.pile(count, emoji) ?? null, tag(`${legs} legs each`)),
        prompt: `There are ${count} ${animal} in the field. Each has ${legs} legs. How many legs altogether?`,
        answer: count * legs,
        mistakes: [count + legs, count * legs - legs, count * (legs + 1)],
        explain: `${count} × ${legs} = ${count * legs} legs.`,
      };
    },
    function weeks() {
      const weeksCount = factor(level === 1 ? 4 : 8);
      return {
        visual: () =>
          scene(
            '📅 HOLIDAYS',
            klgMathVis()?.groups(weeksCount, 7, '☀️', { holder: 'none', label: `${weeksCount} weeks of 7 days` }) ?? null
          ),
        prompt: `The holiday lasts ${weeksCount} weeks. A week has 7 days. How many days is the holiday?`,
        answer: weeksCount * 7,
        mistakes: [weeksCount + 7, weeksCount * 7 - 7, weeksCount * 5],
        explain: `${weeksCount} × 7 = ${weeksCount * 7} days.`,
      };
    },
    function timesAsMany() {
      const a = name();
      let b = name();
      while (b === a) b = name();
      const base = randomInt(2, 6);
      const times = randomInt(2, level === 1 ? 3 : 5);
      return {
        visual: () =>
          scene(
            '🔮 MARBLES',
            tag(`${a}: ${base}`),
            klgMathVis()?.pile(base, '🔵') ?? null,
            tag(`${b}: ${times} times as many`),
            klgMathVis()?.groups(times, base, '🔵', { holder: 'none' }) ?? null
          ),
        prompt: `${a} has ${base} marbles. ${b} has ${times} times as many. How many marbles does ${b} have?`,
        answer: base * times,
        mistakes: [base + times, base * times + base, base * (times - 1)],
        explain: `${times} × ${base} = ${base * times} marbles.`,
      };
    },
  ];
}

const TWO_STEP: Array<() => StorySpec> = [
  function roundUp() {
    const size = randomInt(4, 8);
    const full = randomInt(3, 6);
    const left = randomInt(1, size - 1);
    const kids = size * full + left;
    const [vehicle, emoji] = pick([
      ['boats', '🚣'],
      ['cars', '🚗'],
      ['tables', '🪑'],
      ['tents', '⛺'],
    ] as const);
    return {
      visual: () => scene('🚌 CLASS TRIP', klgMathVis()?.pile(kids, '🧒') ?? null, tag(`${size} in each ${vehicle.slice(0, -1)} ${emoji}`)),
      prompt: `${kids} children go on a trip. Each of the ${vehicle} holds ${size} children. How many ${vehicle} are needed so nobody is left behind?`,
      answer: full + 1,
      mistakes: [full, size, left],
      explain: `${kids} ÷ ${size} = ${full} remainder ${left}. The ${left} extra children need one more, so ${full + 1} ${vehicle}.`,
    };
  },
  function roundDown() {
    const cost = pick([12, 15, 20, 25]);
    const can = randomInt(2, 5);
    const money = cost * can + randomInt(1, cost - 1);
    const [emoji, item] = pick([
      ['🍦', 'ice creams'],
      ['📚', 'books'],
      ['🪁', 'kites'],
    ] as const);
    const who = pick(NAMES);
    return {
      visual: () => scene('💰 POCKET MONEY', tag(`${who} has ${rupees(money)}`), tag(`${emoji} ${rupees(cost)} each`)),
      prompt: `${who} has ${rupees(money)}. ${item[0].toUpperCase() + item.slice(1)} cost ${rupees(cost)} each. How many can ${who} buy?`,
      answer: can,
      mistakes: [can + 1, Math.floor(money / 10), can - 1],
      explain: `${rupees(money)} ÷ ${rupees(cost)} = ${can} remainder ${rupees(money - cost * can)} — not enough for one more.`,
    };
  },
  function change() {
    const cost = randomInt(6, 15);
    const count = randomInt(2, 4);
    const note = [50, 100].find((n) => n > cost * count) ?? 100;
    const [emoji, item] = pick([
      ['📒', 'notebooks'],
      ['🖊️', 'pens'],
      ['🥤', 'drinks'],
    ] as const);
    const who = pick(NAMES);
    return {
      visual: () => scene('🧾 PAYING', klgMathVis()?.pile(count, emoji) ?? null, tag(`${rupees(cost)} each`), tag(`Pays with ${rupees(note)}`)),
      prompt: `${who} buys ${count} ${item} at ${rupees(cost)} each and pays with a ${rupees(note)} note. How much change?`,
      answer: note - cost * count,
      money: true,
      mistakes: [cost * count, note - cost, note - cost - count],
      explain: `${count} × ${rupees(cost)} = ${rupees(cost * count)}. ${rupees(note)} − ${rupees(cost * count)} = ${rupees(note - cost * count)} change.`,
    };
  },
  function unitThenMany() {
    const unit = randomInt(2, 9);
    const known = randomInt(2, 5);
    let wanted = randomInt(2, 9);
    if (wanted === known) wanted += 1;
    const [emoji, item] = pick([
      ['🍌', 'bananas'],
      ['🥚', 'eggs'],
      ['🍋', 'lemons'],
    ] as const);
    return {
      visual: () => scene('🏷️ SPECIAL OFFER', klgMathVis()?.pile(known, emoji) ?? null, tag(`${known} for ${rupees(unit * known)}`)),
      prompt: `${known} ${item} cost ${rupees(unit * known)}. How much do ${wanted} ${item} cost?`,
      answer: unit * wanted,
      money: true,
      mistakes: [unit * known * wanted, unit * known + wanted, unit * (wanted + 1)],
      explain: `One costs ${rupees(unit * known)} ÷ ${known} = ${rupees(unit)}. Then ${wanted} × ${rupees(unit)} = ${rupees(unit * wanted)}.`,
    };
  },
];

export const marketDayGame: QuizGameDefinition = {
  id: 'market-day',
  buildConfig(params) {
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;
    const oneStep = buildOneStep(level);
    const pool = level === 3 ? [...oneStep, ...TWO_STEP, ...TWO_STEP] : oneStep;

    return {
      totalQuestions: 10,
      timePerQuestion: 120,
      subtitle: 'Story problems from the shop, the farm and the school trip.',
      infoText: '10 stories · no time limit in practice',
      instructions:
        'Read (or listen to) each story. Decide: do I multiply or divide? The answer explains the number sentence that solves it.',
      finishTitle: 'Market Day Complete!',
      mascot: '🛒',
      bigChoices: false,
      questionClass: 'quiz-question-sm mv-story',
      modeGroups: [
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · easy stories', query: '?level=1', active: level === 1 },
            { label: 'Level 2 · shop & money', query: '', active: level === 2 },
            { label: 'Level 3 · two-step & remainders', query: '?level=3', active: level === 3 },
          ],
        },
      ],
      generateQuestion: (askedSet): QuizQuestion => {
        let s = pick(pool)();
        let key = s.prompt;
        for (let i = 0; i < 25; i += 1) {
          s = pick(pool)();
          key = s.prompt;
          if (!askedSet.has(key)) break;
        }
        const fmt = (n: number) => (s.money ? rupees(n) : String(n));
        const choices = klgMathVis()?.numberChoices(s.answer, s.mistakes) ?? numericChoices(s.answer, s.mistakes);
        return {
          visual: s.visual,
          prompt: s.prompt,
          dedupeKey: key,
          correctAnswer: fmt(s.answer),
          choices: choices.map(fmt),
          explanation: s.explain,
        };
      },
    };
  },
};
