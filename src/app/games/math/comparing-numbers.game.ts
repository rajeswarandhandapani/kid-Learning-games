import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgBlocks, randomInt, shuffle } from './math-helpers';

type CompareType = 'all' | 'biggest' | 'smallest' | 'symbol';

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function quantityPicture(n: number, max: number): HTMLElement | null {
  const bk = klgBlocks();
  if (!bk) return null;
  if (max === 10) return bk.tenFrame(n, { emoji: '🔴' });
  if (max === 100) return bk.blocks(n, { compact: true });
  return null;
}

function pictureChoice(n: number, max: number): HTMLElement | null {
  const pic = quantityPicture(n, max);
  if (!pic) return null;
  pic.removeAttribute('role');
  pic.removeAttribute('aria-label');
  const box = document.createElement('div');
  box.className = 'kv-choice';
  const text = document.createElement('div');
  text.className = 'kv-choice-text';
  text.textContent = formatNumber(n);
  box.append(pic, text);
  return box;
}

function withPictures(q: QuizQuestion, numbers: number[], max: number): QuizQuestion {
  if (max >= 1000) return q;
  q.choiceVisuals = {};
  q.choiceLabels = {};
  numbers.forEach((n) => {
    q.choiceVisuals![String(n)] = () => pictureChoice(n, max);
    q.choiceLabels![String(n)] = formatNumber(n);
  });
  q.noChoiceListen = true;
  return q;
}

function scrambledDigitSet(max: number): number[] | null {
  if (max < 100) return null;
  const numbers = new Set<number>();
  if (max === 100) {
    const a = randomInt(1, 9);
    let b: number;
    do {
      b = randomInt(1, 9);
    } while (b === a);
    [a * 10 + b, b * 10 + a, a * 11, b * 11].forEach((n) => numbers.add(n));
  } else if (max === 10000) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    while (numbers.size < 4) numbers.add(shuffle(digits).reduce((n, d) => n * 10 + d, 0));
  } else {
    const [a, b, c] = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    shuffle([
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ])
      .slice(0, 4)
      .forEach(([x, y, z]) => numbers.add(x * 100 + y * 10 + z));
  }
  return numbers.size === 4 ? [...numbers] : null;
}

function closeNumberSet(max: number): number[] {
  const spread = max === 10 ? 4 : max === 100 ? 12 : max === 1000 ? 60 : 300;
  const base = randomInt(1, (max === 10000 ? max - 1 : max) - spread);
  const numbers = new Set<number>();
  while (numbers.size < 4) numbers.add(base + randomInt(0, spread));
  return [...numbers];
}

function makeFourNumbers(max: number): number[] {
  const scrambled = Math.random() < 0.5 ? scrambledDigitSet(max) : null;
  return scrambled || closeNumberSet(max);
}

function makeBiggestQuestion(max: number): QuizQuestion {
  const numbers = makeFourNumbers(max);
  const ans = Math.max(...numbers);
  return withPictures(
    {
      prompt: 'Tap the BIGGEST number!',
      dedupeKey: 'big:' + [...numbers].sort((a, b) => a - b).join(','),
      explanation: `${formatNumber(ans)} is the biggest. Compare the biggest place first.`,
      correctAnswer: ans,
      choices: shuffle(numbers),
    },
    numbers,
    max
  );
}

function makeSmallestQuestion(max: number): QuizQuestion {
  const numbers = makeFourNumbers(max);
  const ans = Math.min(...numbers);
  return withPictures(
    {
      prompt: 'Tap the SMALLEST number!',
      dedupeKey: 'small:' + [...numbers].sort((a, b) => a - b).join(','),
      explanation: `${formatNumber(ans)} is the smallest. Compare the biggest place first.`,
      correctAnswer: ans,
      choices: shuffle(numbers),
    },
    numbers,
    max
  );
}

function makeSymbolQuestion(max: number): QuizQuestion {
  let a: number;
  let b: number;
  const top = max === 10000 ? max - 1 : max;
  if (Math.random() < 0.2) {
    a = b = randomInt(1, top);
  } else if (max >= 100 && Math.random() < 0.5) {
    const x = randomInt(1, 9);
    let y: number;
    do {
      y = randomInt(1, 9);
    } while (y === x);
    const scale = max === 10000 ? randomInt(0, 2) : max === 1000 ? randomInt(0, 1) : 0;
    a = (x * 10 + y) * 10 ** scale;
    b = (y * 10 + x) * 10 ** scale;
  } else {
    a = randomInt(1, top);
    do {
      b = randomInt(Math.max(1, a - 15), Math.min(top, a + 15));
    } while (b === a);
  }
  const correct = a < b ? '<' : a > b ? '>' : '=';
  return {
    visual: () => {
      const bk = klgBlocks();
      const row = document.createElement('div');
      row.className = 'kv-row';
      [a, b].forEach((n) => {
        const pic = max >= 1000 ? bk?.chart(n) : quantityPicture(n, max);
        const cell = document.createElement('div');
        cell.className = 'kv-choice';
        const text = document.createElement('div');
        text.className = 'kv-choice-text';
        text.textContent = formatNumber(n);
        if (pic) cell.append(pic, text);
        else cell.append(text);
        row.appendChild(cell);
      });
      return row;
    },
    explanation: `${formatNumber(a)} ${correct} ${formatNumber(b)}.`,
    dedupeKey: `sym:${a}:${b}`,
    prompt: `${formatNumber(a)}  __  ${formatNumber(b)}`,
    correctAnswer: correct,
    choices: ['<', '=', '>'],
  };
}

function buildQuery(type: CompareType, max: number): string {
  const p = new URLSearchParams();
  if (type !== 'all') p.set('type', type);
  if (max !== 100) p.set('max', String(max));
  return p.toString();
}

export const comparingNumbersGame: QuizGameDefinition = {
  id: 'comparing-numbers',
  buildConfig(params) {
    const rawMax = parseInt(params.get('max') || '', 10);
    const max = rawMax === 10 || rawMax === 1000 || rawMax === 10000 ? rawMax : 100;
    const rawType = params.get('type');
    const type: CompareType = rawType === 'biggest' || rawType === 'smallest' || rawType === 'symbol' ? rawType : 'all';

    const typeLabels: Record<CompareType, string> = {
      all: 'Biggest, smallest & signs',
      biggest: 'Tap the biggest number',
      smallest: 'Tap the smallest number',
      symbol: 'Pick the right < > = sign',
    };
    const kinds =
      type === 'biggest'
        ? [makeBiggestQuestion]
        : type === 'smallest'
          ? [makeSmallestQuestion]
          : type === 'symbol'
            ? [makeSymbolQuestion]
            : [makeBiggestQuestion, makeSmallestQuestion, makeSymbolQuestion];

    return {
      totalQuestions: 15,
      timePerQuestion: 120,
      bigChoices: false,
      modeLabel: `${typeLabels[type]} • numbers to ${formatNumber(max)}`,
      infoText: '15 questions • 2 minutes each • multiple choice',
      instructions: 'In the signs game, remember: the alligator < always opens its mouth toward the bigger number! 🐊',
      finishTitle: 'Quiz Complete!',
      bestTimeKey: `klg-compare-best-ms:${type}:${max}`,
      formatAnswer: (value) => (typeof value === 'number' ? formatNumber(value) : String(value)),
      modeGroups: [
        {
          id: 'type-links',
          links: [
            { label: 'Mix', query: buildQuery('all', max), active: type === 'all' },
            { label: 'Biggest', query: buildQuery('biggest', max), active: type === 'biggest' },
            { label: 'Smallest', query: buildQuery('smallest', max), active: type === 'smallest' },
            { label: '< > = Signs', query: buildQuery('symbol', max), active: type === 'symbol' },
          ],
        },
        {
          id: 'range-links',
          links: [
            { label: 'To 10', query: buildQuery(type, 10), active: max === 10 },
            { label: 'To 100', query: buildQuery(type, 100), active: max === 100 },
            { label: 'To 1,000', query: buildQuery(type, 1000), active: max === 1000 },
            { label: 'To 10,000', query: buildQuery(type, 10000), active: max === 10000 },
          ],
        },
      ],
      generateQuestion: () => kinds[randomInt(0, kinds.length - 1)](max),
    };
  },
};
