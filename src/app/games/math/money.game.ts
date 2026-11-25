import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMoneyVis, pick, randomInt, shuffle } from './math-helpers';

type MoneyMode = 'all' | 'coins' | 'change';

interface CoinDef {
  name: string;
  plural: string;
  value: number;
  max: number;
}

const ALL_COINS: readonly CoinDef[] = [
  { name: '$5 note', plural: '$5 notes', value: 500, max: 1 },
  { name: '$1 note', plural: '$1 notes', value: 100, max: 3 },
  { name: 'quarter', plural: 'quarters', value: 25, max: 3 },
  { name: 'dime', plural: 'dimes', value: 10, max: 4 },
  { name: 'nickel', plural: 'nickels', value: 5, max: 3 },
  { name: 'penny', plural: 'pennies', value: 1, max: 4 },
];

const CHANGE_ITEMS = ['toy', 'book', 'snack', 'juice box', 'sticker pack', 'ball', 'sandwich'] as const;
const TOTAL_ITEMS = ['pencil', 'notebook', 'candy bar', 'balloon', 'cookie', 'crayon', 'ruler', 'sticker'] as const;
const ITEM_EMOJI: Record<string, string> = {
  toy: '🧸',
  book: '📖',
  snack: '🍪',
  'juice box': '🧃',
  'sticker pack': '⭐',
  ball: '⚽',
  sandwich: '🥪',
  pencil: '✏️',
  notebook: '📓',
  'candy bar': '🍫',
  balloon: '🎈',
  cookie: '🍪',
  crayon: '🖍️',
  ruler: '📏',
  sticker: '⭐',
};
const MONEY_OFFSETS = [-100, -25, -10, -5, 5, 10, 25, 100];

function fmtMoney(cents: number): string {
  return cents < 100 ? `${cents}¢` : `$${(cents / 100).toFixed(2)}`;
}

function offsetWrongs(correct: number, offsets: readonly number[], fmt: (v: number) => string): string[] {
  const wrongs = new Set<string>();
  for (const off of shuffle(offsets)) {
    const v = correct + off;
    if (v > 0 && v !== correct) wrongs.add(fmt(v));
    if (wrongs.size === 3) break;
  }
  return [...wrongs];
}

function coinsForLevel(level: number): CoinDef[] {
  return ALL_COINS.filter((c) => (level === 1 ? c.value <= 10 : level === 2 ? c.value <= 25 : true)).map((c) =>
    level === 1 ? { ...c, max: Math.min(c.max, 3) } : c
  );
}

function fewestCoins(cents: number, denoms: readonly number[]): number[] {
  let rem = cents;
  const out: number[] = [];
  denoms
    .slice()
    .sort((a, b) => b - a)
    .forEach((d) => {
      while (rem >= d) {
        out.push(d);
        rem -= d;
      }
    });
  return out;
}

function priceTag(emoji: string, name: string, cents: number): HTMLElement {
  const tag = document.createElement('figure');
  tag.className = 'kv-tag';
  tag.setAttribute('role', 'img');
  tag.setAttribute('aria-label', `${name}, ${fmtMoney(cents)}`);
  tag.dataset['cents'] = String(cents);
  tag.innerHTML = `<span class="kv-tag-pic" aria-hidden="true">${emoji}</span><span class="kv-tag-price" aria-hidden="true">${fmtMoney(cents)}</span>`;
  return tag;
}

function row(...nodes: Array<Node | null>): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-row';
  nodes.forEach((n) => {
    if (n) box.appendChild(n);
  });
  return box;
}

function makeCoinQuestion(level: number): QuizQuestion {
  const coins = coinsForLevel(level);
  let picked: Array<CoinDef & { count: number }>;
  do {
    picked = coins.map((c) => ({ ...c, count: randomInt(0, c.max) })).filter((c) => c.count > 0);
  } while (picked.length < 2);

  const total = picked.reduce((sum, c) => sum + c.count * c.value, 0);
  const parts = picked.map((c) => `${c.count} ${c.count === 1 ? c.name : c.plural}`);
  const list =
    parts.length === 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const pieces = picked.flatMap((c) => Array<number>(c.count).fill(c.value));
  const offsets = picked.flatMap((c) => [c.value, -c.value]).concat([5, -5, 10, -10]);
  const wrongs = offsetWrongs(total, offsets, fmtMoney);

  return {
    visual: () => klgMoneyVis()?.tray(pieces) ?? null,
    prompt: 'How much money is in the picture?',
    dedupeKey: `coins:${pieces.join(',')}`,
    explanation: `${list} = ${fmtMoney(total)}.`,
    correctAnswer: fmtMoney(total),
    choices: shuffle([fmtMoney(total), ...wrongs]),
  };
}

function makePayQuestion(level: number, attempt = 0): QuizQuestion {
  const mv = klgMoneyVis()!;
  const coins = coinsForLevel(level);
  const denoms = coins.map((c) => c.value);
  const top = level === 1 ? 49 : level === 2 ? 99 : 495;
  let target = 0;
  let correct: number[] = [];
  do {
    target = level === 3 ? 5 * randomInt(8, 99) : randomInt(11, top);
    correct = fewestCoins(target, denoms);
  } while (correct.length < 2 || correct.length > 7);

  const sets: number[][] = [correct];
  const sums = new Set([target]);
  const tweaks: Array<(c: number[]) => number[]> = [
    (c) => {
      const i = randomInt(0, c.length - 1);
      const o = c.slice();
      o.splice(i, 1);
      return o;
    },
    (c) => c.concat(denoms[randomInt(0, denoms.length - 1)]),
    (c) => {
      const o = c.slice();
      const i = randomInt(0, o.length - 1);
      o[i] = denoms[randomInt(0, denoms.length - 1)];
      return o;
    },
    (c) => {
      const o = c.slice();
      const i = randomInt(0, o.length - 1);
      o.splice(i, 1, ...(o[i] === 25 ? [10, 10] : [o[i]]));
      return o;
    },
  ];
  for (let tries = 0; tries < 60 && sets.length < 4; tries += 1) {
    const set = tweaks[randomInt(0, tweaks.length - 1)](correct);
    const sum = mv.sum(set);
    if (!set.length || sums.has(sum) || Math.abs(sum - target) > Math.max(30, target)) continue;
    sums.add(sum);
    sets.push(set);
  }
  if (sets.length < 4 && attempt < 10) return makePayQuestion(level, attempt + 1);

  const choiceVisuals: Record<string, () => HTMLElement | null> = {};
  const choiceLabels: Record<string, string> = {};
  sets.forEach((x) => {
    const name = mv.describe(x);
    choiceVisuals[name] = () => klgMoneyVis()?.tray(x) ?? null;
    choiceLabels[name] = `${name}, ${fmtMoney(mv.sum(x))}`;
  });
  return {
    prompt: `Which coins make exactly ${fmtMoney(target)}?`,
    dedupeKey: `pay:${target}`,
    explanation: `${mv.describe(correct)} make ${fmtMoney(target)}.`,
    correctAnswer: mv.describe(correct),
    choices: shuffle(sets.map((x) => mv.describe(x))),
    choiceVisuals,
    choiceLabels,
    noChoiceListen: true,
  };
}

function makeChangeQuestion(): QuizQuestion {
  const mv = klgMoneyVis()!;
  const item = pick(CHANGE_ITEMS);
  const cost = 5 * randomInt(1, 99);
  const payOptions = [Math.ceil(cost / 100) * 100, 500, 1000].filter((p) => p > cost);
  const pay = pick(payOptions);
  const correct = pay - cost;
  const wrongs = offsetWrongs(correct, MONEY_OFFSETS, fmtMoney);
  return {
    visual: () =>
      row(
        priceTag(ITEM_EMOJI[item], item, cost),
        mv.tray([pay], { label: `You pay with ${fmtMoney(pay)}` })
      ),
    explanation: `Count up from ${fmtMoney(cost)} to ${fmtMoney(pay)}: ${mv.describe(mv.greedy(correct))} = ${fmtMoney(correct)}.`,
    dedupeKey: `change:${cost}:${pay}`,
    prompt: `You buy a ${item} for ${fmtMoney(cost)} and pay with ${fmtMoney(pay)}. How much change should you get?`,
    correctAnswer: fmtMoney(correct),
    choices: shuffle([fmtMoney(correct), ...wrongs]),
  };
}

function makeTotalQuestion(): QuizQuestion {
  const [item1, item2] = shuffle(TOTAL_ITEMS);
  const price1 = 5 * randomInt(4, 50);
  const price2 = 5 * randomInt(4, 50);
  const correct = price1 + price2;
  const wrongs = offsetWrongs(correct, MONEY_OFFSETS, fmtMoney);
  return {
    visual: () => row(priceTag(ITEM_EMOJI[item1], item1, price1), priceTag(ITEM_EMOJI[item2], item2, price2)),
    explanation: `${fmtMoney(price1)} + ${fmtMoney(price2)} = ${fmtMoney(correct)}.`,
    dedupeKey: `total:${price1}:${price2}`,
    prompt: `A ${item1} costs ${fmtMoney(price1)} and a ${item2} costs ${fmtMoney(price2)}. How much do they cost together?`,
    correctAnswer: fmtMoney(correct),
    choices: shuffle([fmtMoney(correct), ...wrongs]),
  };
}

function makeCentsQuestion(): QuizQuestion {
  const mv = klgMoneyVis()!;
  const total = 100 * randomInt(1, 5) + 5 * randomInt(0, 19);
  const fmt = (v: number) => `${v}¢`;
  const candidates = shuffle(
    [Math.round(total / 10), total * 10, total - 100, total + 100, total - 10, total + 10].filter(
      (v, i, arr) => v > 0 && v !== total && arr.indexOf(v) === i
    )
  );
  return {
    visual: () => mv.tray(mv.greedy(total)),
    explanation: `${mv.describe(mv.greedy(total))} is ${fmtMoney(total)}, which is ${total} cents.`,
    dedupeKey: `cents:${total}`,
    prompt: `How many cents is ${fmtMoney(total)}?`,
    correctAnswer: fmt(total),
    choices: shuffle([fmt(total), ...candidates.slice(0, 3).map(fmt)]),
  };
}

function buildQuery(type: MoneyMode, level: number): string {
  const p = new URLSearchParams();
  if (type !== 'all') p.set('type', type);
  if (level !== 2) p.set('level', String(level));
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const moneyGame: QuizGameDefinition = {
  id: 'money',
  buildConfig(params) {
    const rawType = params.get('type');
    const mode: MoneyMode = rawType === 'coins' || rawType === 'change' ? rawType : 'all';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;

    const labels: Record<MoneyMode, string> = {
      all: 'Counting coins + making change',
      coins: 'Counting coins and cents',
      change: 'Making change and adding up prices',
    };

    const coinKinds = [() => makeCoinQuestion(level), () => makePayQuestion(level), makeCentsQuestion];
    const changeKinds = [makeChangeQuestion, makeTotalQuestion];
    const kinds = mode === 'coins' ? coinKinds : mode === 'change' ? changeKinds : [...coinKinds, ...changeKinds];

    return {
      totalQuestions: 15,
      timePerQuestion: 120,
      modeLabel: labels[mode],
      infoText: '15 questions · 2 minutes each · multiple choice',
      instructions:
        'Remember: a quarter is 25¢, a dime is 10¢, a nickel is 5¢ and a penny is 1¢ — and 100 cents make a dollar!',
      finishTitle: 'Money & Change Quiz Complete!',
      mascot: '🪙',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-money-best-ms:${mode}${level === 2 ? '' : `:L${level}`}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix of both', query: buildQuery('all', level), active: mode === 'all' },
            { label: 'Counting Coins 🪙', query: buildQuery('coins', level), active: mode === 'coins' },
            { label: 'Making Change 💵', query: buildQuery('change', level), active: mode === 'change' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · pennies, nickels, dimes', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · + quarters', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · + dollar notes', query: buildQuery(mode, 3), active: level === 3 },
          ],
        },
      ],
      generateQuestion: () => pick(kinds)(),
    };
  },
};
