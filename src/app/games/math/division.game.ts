import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, numericChoices, pick, randomInt, shuffle } from './math-helpers';

const THINGS = [
  { name: 'cookies', emoji: '🍪', who: 'friends' },
  { name: 'apples', emoji: '🍎', who: 'children' },
  { name: 'stickers', emoji: '⭐', who: 'classmates' },
  { name: 'marbles', emoji: '🔮', who: 'players' },
  { name: 'sweets', emoji: '🍬', who: 'friends' },
  { name: 'pencils', emoji: '✏️', who: 'students' },
  { name: 'balloons', emoji: '🎈', who: 'kids' },
  { name: 'flowers', emoji: '🌸', who: 'vases' },
  { name: 'books', emoji: '📚', who: 'shelves' },
  { name: 'eggs', emoji: '🥚', who: 'boxes' },
];

function makeFactQuestion(divisors: number[], maxQuotient: number): QuizQuestion {
  const divisor = pick(divisors);
  const quotient = randomInt(1, maxQuotient);
  const dividend = divisor * quotient;
  return {
    prompt: `${dividend} ÷ ${divisor} = ?`,
    hintVisual: () => klgMathVis()?.circled(dividend, divisor, '🟣') || null,
    correctAnswer: quotient,
    choices: numericChoices(quotient, [quotient + 1, quotient - 1, dividend - divisor, divisor, quotient + 2]),
  };
}

function makeMissingQuestion(divisors: number[], maxQuotient: number): QuizQuestion {
  const divisor = pick(divisors);
  const quotient = randomInt(2, maxQuotient);
  const dividend = divisor * quotient;
  if (randomInt(0, 1) === 0) {
    return {
      prompt: `? ÷ ${divisor} = ${quotient}`,
      dedupeKey: `miss-a-${dividend}-${divisor}`,
      correctAnswer: dividend,
      choices: numericChoices(dividend, [dividend + divisor, dividend - divisor, divisor + quotient, dividend + 1]),
    };
  }
  return {
    prompt: `${dividend} ÷ ? = ${quotient}`,
    dedupeKey: `miss-b-${dividend}-${quotient}`,
    correctAnswer: divisor,
    choices: numericChoices(divisor, [divisor + 1, divisor - 1, quotient, dividend - quotient]),
  };
}

function makeWordQuestion(divisors: number[], maxQuotient: number): QuizQuestion {
  const divisor = pick(divisors);
  const quotient = randomInt(2, maxQuotient);
  const dividend = divisor * quotient;
  const thing = pick(THINGS);
  if (randomInt(1, 2) === 1) {
    return {
      prompt: `${dividend} ${thing.name} ${thing.emoji} are shared equally between ${divisor} ${thing.who}. How many does each one get?`,
      smallQuestion: true,
      dedupeKey: `word-share-${dividend}-${divisor}`,
      correctAnswer: quotient,
      choices: numericChoices(quotient, [quotient + 1, quotient - 1, dividend - divisor, divisor]),
    };
  }
  return {
    prompt: `You have ${dividend} ${thing.name} ${thing.emoji} and put ${quotient} in each bag. How many bags do you need?`,
    smallQuestion: true,
    dedupeKey: `word-group-${dividend}-${quotient}`,
    correctAnswer: divisor,
    choices: numericChoices(divisor, [divisor + 1, divisor - 1, quotient, dividend - quotient]),
  };
}

function makeRemainderQuestion(divisors: number[]): QuizQuestion {
  const usable = divisors.filter((d) => d >= 3);
  const divisor = pick(usable.length ? usable : [4]);
  const quotient = randomInt(2, 9);
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  const fmt = (q: number, r: number) => `${q} r ${r}`;
  const answer = fmt(quotient, remainder);
  const wrongs = [
    fmt(quotient + 1, remainder),
    fmt(quotient, divisor - remainder),
    fmt(quotient - 1, remainder),
    fmt(remainder, quotient),
    fmt(quotient + 2, remainder),
  ].filter((v) => v !== answer);
  return {
    prompt: `${dividend} ÷ ${divisor} = ?  (with a remainder)`,
    dedupeKey: `rem-${dividend}-${divisor}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...[...new Set(wrongs)].slice(0, 3)]),
  };
}

function makeBigQuestion(divisors: number[]): QuizQuestion {
  const usable = divisors.filter((d) => d <= 9);
  const divisor = pick(usable.length ? usable : [2, 3, 4, 5, 6, 7, 8, 9]);
  const quotient = randomInt(11, Math.floor(99 / divisor));
  const dividend = divisor * quotient;
  const tens = Math.floor(quotient / 10) * 10;
  const ones = quotient - tens;
  const steps = ones
    ? `${divisor} × ${tens} = ${divisor * tens} and ${divisor} × ${ones} = ${divisor * ones}, which make ${dividend}.`
    : `${divisor} × ${tens} = ${dividend}.`;
  return {
    prompt: `${dividend} ÷ ${divisor} = ?`,
    explanation: `${steps} So ${dividend} ÷ ${divisor} = ${quotient}.`,
    correctAnswer: quotient,
    choices: numericChoices(quotient, [quotient + 1, quotient - 1, quotient + 10, quotient - 10, quotient + 2, divisor]),
  };
}

function getDivisors(level: number, tablesRaw: string | null): number[] {
  const requested = (tablesRaw || '')
    .split(',')
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n >= 2 && n <= 12);
  if (requested.length) return [...new Set(requested)];
  const max = level === 1 ? 5 : 10;
  return Array.from({ length: max - 1 }, (_, i) => i + 2);
}

function buildQuery(level: number, tablesRaw: string | null): string {
  const p = new URLSearchParams();
  if (level !== 2) p.set('level', String(level));
  if (tablesRaw) p.set('tables', tablesRaw);
  return p.toString();
}

export const divisionGame: QuizGameDefinition = {
  id: 'division',
  buildConfig(params) {
    const rawLevel = parseInt(params.get('level') || '', 10);
    const level = [1, 2, 3, 4].includes(rawLevel) ? rawLevel : 2;
    const tablesRaw = params.get('tables');
    const divisors = getDivisors(level, tablesRaw);
    const maxQuotient = level === 1 ? 6 : 10;
    const totalQuestions = 20;

    const labels: Record<number, string> = {
      1: 'Sharing fairly — dividing by 2, 3, 4 and 5',
      2: 'Division facts and word problems up to ÷10',
      3: 'Division with remainders — the tricky stuff',
      4: 'Big division — two-digit numbers shared by one-digit numbers',
    };

    return {
      totalQuestions,
      timePerQuestion: 20,
      modeLabel: labels[level] + (divisors.length < 9 ? ` (÷ ${divisors.join(', ')})` : ''),
      infoText: `${totalQuestions} questions • 20 seconds each • multiple choice`,
      instructions:
        'Sharing things out fairly! Division undoes multiplication, so your times tables are your superpower here. 💪',
      finishTitle: 'Great Division!',
      bestTimeKey: `klg-division-best-ms:${level}:${divisors.join('-')}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Easy (÷2–5)', query: buildQuery(1, tablesRaw), active: level === 1 },
            { label: 'Medium (÷2–10)', query: buildQuery(2, tablesRaw), active: level === 2 },
            { label: 'Tricky (remainders)', query: buildQuery(3, tablesRaw), active: level === 3 },
            { label: 'Big (84 ÷ 4)', query: buildQuery(4, tablesRaw), active: level === 4 },
          ],
        },
      ],
      generateQuestion(): QuizQuestion {
        if (level === 4) return makeBigQuestion(divisors);
        const kinds =
          level === 1
            ? (['fact', 'fact', 'fact', 'word'] as const)
            : level === 2
              ? (['fact', 'fact', 'missing', 'word'] as const)
              : (['fact', 'missing', 'word', 'remainder', 'remainder'] as const);
        const kind = pick(kinds);
        if (kind === 'missing') return makeMissingQuestion(divisors, maxQuotient);
        if (kind === 'word') return makeWordQuestion(divisors, maxQuotient);
        if (kind === 'remainder') return makeRemainderQuestion(divisors);
        return makeFactQuestion(divisors, maxQuotient);
      },
    };
  },
};
