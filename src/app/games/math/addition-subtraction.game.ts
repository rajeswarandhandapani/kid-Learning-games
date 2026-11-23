import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgBlocks, randomInt, shuffle } from './math-helpers';

type OpMode = 'mix' | 'add' | 'sub';

interface ArithmeticPair {
  a: number;
  b: number;
  symbol: '+' | '−';
  correct: number;
}

function columnSubtractionError(a: number, b: number): number {
  let result = 0;
  for (let place = 1; a >= place || b >= place; place *= 10) {
    result += Math.abs((Math.floor(a / place) % 10) - (Math.floor(b / place) % 10)) * place;
  }
  return result;
}

function makeAddition(max: number): ArithmeticPair {
  let a: number;
  let b: number;
  if (max === 1000) {
    a = randomInt(100, 899);
    b = randomInt(100, 999 - a);
  } else if (max === 100) {
    a = randomInt(10, 89);
    b = randomInt(10, 99 - a);
  } else {
    a = randomInt(1, max - 1);
    b = randomInt(1, max - a);
  }
  return { a, b, symbol: '+', correct: a + b };
}

function makeSubtraction(max: number): ArithmeticPair {
  let a: number;
  let b: number;
  if (max === 1000) {
    a = randomInt(201, 999);
    b = randomInt(100, a - 1);
  } else if (max === 100) {
    a = randomInt(21, 99);
    b = randomInt(10, a - 1);
  } else {
    a = randomInt(3, max);
    b = randomInt(1, a - 1);
  }
  return { a, b, symbol: '−', correct: a - b };
}

function makeDistractors({ a, b, symbol, correct }: ArithmeticPair, max: number): number[] {
  const candidates: number[] = [];
  if (max >= 100) {
    if (symbol === '−') {
      const columns = columnSubtractionError(a, b);
      if (columns !== correct) candidates.push(columns);
    }
    candidates.push(
      ...shuffle(max === 1000 ? [correct - 100, correct + 100, correct - 10, correct + 10] : [correct - 10, correct + 10])
    );
  }
  candidates.push(...shuffle([correct - 1, correct + 1, correct - 2, correct + 2]));

  const wrongs = new Set<number>();
  for (const c of candidates) {
    if (c >= 0 && c !== correct) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const c = correct + (randomInt(0, 1) ? 1 : -1) * randomInt(3, 5);
    if (c >= 0) wrongs.add(c);
  }
  return [...wrongs];
}

function symbolNode(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'kv-op';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = text;
  return span;
}

function pictureFor(q: ArithmeticPair, max: number): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-row kv-addsub';
  const bk = klgBlocks();
  if (!bk) return box;
  if (max >= 100) {
    box.append(bk.blocks(q.a, { compact: true }), symbolNode(q.symbol), bk.blocks(q.b, { compact: true }));
    return box;
  }
  if (q.symbol === '+') box.appendChild(bk.tenFrame(q.a + q.b, { split: q.a }));
  else box.appendChild(bk.tenFrame(q.a, { crossed: q.b }));
  return box;
}

function buildQuery(op: OpMode, max: number): string {
  const p = new URLSearchParams();
  if (op !== 'mix') p.set('op', op);
  if (max !== 20) p.set('max', String(max));
  return p.toString();
}

export const additionSubtractionGame: QuizGameDefinition = {
  id: 'addition-subtraction',
  buildConfig(params) {
    const rawMax = parseInt(params.get('max') || '', 10);
    const max = rawMax === 10 || rawMax === 100 || rawMax === 1000 ? rawMax : 20;
    const rawOp = params.get('op');
    const op: OpMode = rawOp === 'add' || rawOp === 'sub' ? rawOp : 'mix';
    const totalQuestions = 20;
    const timePerQuestion = max === 1000 ? 25 : max === 100 ? 15 : 10;

    const opLabels: Record<OpMode, string> = { mix: 'Addition + subtraction', add: 'Addition', sub: 'Subtraction' };
    const rangeLabels: Record<number, string> = {
      10: 'within 10',
      20: 'within 20',
      100: 'two-digit numbers',
      1000: 'three-digit numbers',
    };

    return {
      totalQuestions,
      timePerQuestion,
      modeLabel: `${opLabels[op]} • ${rangeLabels[max]}`,
      infoText: `${totalQuestions} questions • ${timePerQuestion} seconds each • multiple choice`,
      instructions: 'Add or subtract the numbers carefully, then pick the matching answer.',
      finishTitle: 'Great Math Work!',
      bestTimeKey: `klg-addsub-best-ms:${op}:${max}`,
      modeGroups: [
        {
          id: 'op-links',
          links: [
            { label: '➕➖ Mix', query: buildQuery('mix', max), active: op === 'mix' },
            { label: '➕ Addition', query: buildQuery('add', max), active: op === 'add' },
            { label: '➖ Subtraction', query: buildQuery('sub', max), active: op === 'sub' },
          ],
        },
        {
          id: 'range-links',
          links: [
            { label: 'Within 10', query: buildQuery(op, 10), active: max === 10 },
            { label: 'Within 20', query: buildQuery(op, 20), active: max === 20 },
            { label: 'Two-digit', query: buildQuery(op, 100), active: max === 100 },
            { label: 'Three-digit', query: buildQuery(op, 1000), active: max === 1000 },
          ],
        },
      ],
      generateQuestion(): QuizQuestion {
        const useAdd = op === 'add' || (op === 'mix' && randomInt(0, 1) === 0);
        const q = useAdd ? makeAddition(max) : makeSubtraction(max);
        return {
          visual: () => pictureFor(q, max),
          explanation: `${q.a} ${q.symbol} ${q.b} = ${q.correct}.`,
          dedupeKey: `${q.a}${q.symbol}${q.b}`,
          prompt: `${q.a} ${q.symbol} ${q.b}`,
          correctAnswer: q.correct,
          choices: shuffle([q.correct, ...makeDistractors(q, max)]),
        };
      },
    };
  },
};
