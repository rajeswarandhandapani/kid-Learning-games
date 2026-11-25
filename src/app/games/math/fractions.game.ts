import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgFracVis, pick, randomInt, shuffle } from './math-helpers';

type FractionMode = 'all' | 'identify' | 'picture' | 'equivalent' | 'compare' | 'add';
type FractionTuple = [number, number];

const SET_EMOJI = ['🍓', '🌻', '🐟', '⭐', '🍪', '🎈'];
const EQUIVALENT_BASES: readonly FractionTuple[] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
];
const RELATED_DENOMINATORS: readonly FractionTuple[] = [
  [2, 4],
  [2, 6],
  [2, 8],
  [2, 10],
  [3, 6],
  [3, 9],
  [3, 12],
  [4, 8],
  [4, 12],
  [5, 10],
  [6, 12],
];
const MIXED_FRACTIONS: readonly FractionTuple[] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [2, 5],
  [3, 5],
  [5, 6],
  [3, 8],
  [5, 8],
  [7, 10],
  [3, 10],
];

function frac(n: number, d: number): string {
  return `${n}/${d}`;
}

function fractionPicture(n: number, d: number, style: 'pie' | 'bar' | 'set', setEmoji: string): HTMLElement | null {
  const fv = klgFracVis();
  if (!fv) return null;
  if (style === 'bar') return fv.bar(n, d);
  if (style === 'set') return fv.set(n, d, setEmoji);
  return fv.pie(n, d);
}

function labelledBar(n: number, d: number): HTMLElement | null {
  const fv = klgFracVis();
  if (!fv) return null;
  const box = document.createElement('div');
  box.className = 'kv-choice';
  const bar = fv.bar(n, d);
  bar.removeAttribute('role');
  bar.removeAttribute('aria-label');
  const text = document.createElement('div');
  text.className = 'kv-choice-text';
  text.textContent = frac(n, d);
  box.append(bar, text);
  return box;
}

function valueEquals([n1, d1]: FractionTuple, [n2, d2]: FractionTuple): boolean {
  return n1 * d2 === n2 * d1;
}

function buildChoices(correct: FractionTuple, candidates: readonly FractionTuple[]): string[] {
  const choices = [frac(...correct)];
  for (const cand of candidates) {
    if (choices.length === 4) break;
    const [n, d] = cand;
    if (n < 1 || d < 2 || valueEquals(cand, correct)) continue;
    const text = frac(n, d);
    if (!choices.includes(text)) choices.push(text);
  }
  let bump = 1;
  while (choices.length < 4) {
    const cand: FractionTuple = [correct[0] + bump, correct[1]];
    const text = frac(...cand);
    if (cand[0] >= 1 && !valueEquals(cand, correct) && !choices.includes(text)) {
      choices.push(text);
    }
    bump += 1;
  }
  return shuffle(choices);
}

function identifyDenominators(level: number): readonly number[] {
  if (level === 1) return [2, 4];
  if (level === 2) return [2, 3, 4, 5, 6, 8, 10];
  return [3, 4, 5, 6, 8, 10, 12];
}

function makeIdentifyQuestion(level: number): QuizQuestion {
  const denoms = identifyDenominators(level);
  const d = pick(denoms);
  const n = randomInt(1, d - 1);
  const style = (['pie', 'bar', 'set'] as const)[randomInt(0, level === 1 ? 1 : 2)];
  const setEmoji = pick(SET_EMOJI);
  return {
    visual: () => fractionPicture(n, d, style, setEmoji),
    prompt: 'What fraction is shaded?',
    dedupeKey: `id:${style}:${n}/${d}`,
    reviewPrompt: `What fraction is shaded? (${n} of ${d} parts)`,
    explanation: `${n} of the ${d} equal parts are shaded, so the fraction is ${frac(n, d)}.`,
    correctAnswer: frac(n, d),
    choices: buildChoices(
      [n, d],
      shuffle([
        [d - n, d],
        [n, d - n],
        [d, n],
        [n, d + 1],
        [n + 1, d],
      ])
    ),
  };
}

function makePictureQuestion(level: number): QuizQuestion {
  const denoms = identifyDenominators(level);
  const d = pick(denoms);
  const n = randomInt(1, d - 1);
  const style = (['pie', 'bar'] as const)[randomInt(0, 1)];
  const others = shuffle([...Array(d - 1)].map((_, i) => i + 1).filter((x) => x !== n)).slice(0, 3);
  const all = [n, ...others];
  const labels: Record<string, string> = {};
  const visuals: Record<string, () => HTMLElement | null> = {};
  all.forEach((x) => {
    labels[frac(x, d)] = `a ${style} with ${x} of ${d} parts shaded`;
    visuals[frac(x, d)] = () => fractionPicture(x, d, style, '🍓');
  });
  return {
    prompt: `Which picture shows ${frac(n, d)}?`,
    dedupeKey: `pic:${style}:${n}/${d}`,
    correctAnswer: frac(n, d),
    choices: shuffle(all.map((x) => frac(x, d))),
    choiceVisuals: visuals,
    choiceLabels: labels,
    noChoiceListen: true,
    explanation: `${frac(n, d)} means ${n} out of ${d} equal parts.`,
  };
}

function makeEquivalentQuestion(level: number): QuizQuestion {
  const bases = level === 1 ? ([[1, 2]] as readonly FractionTuple[]) : EQUIVALENT_BASES;
  const [n, d] = pick(bases);
  const k = randomInt(2, Math.min(4, Math.floor(20 / d)));
  const built = buildChoices(
    [n * k, d * k],
    shuffle([
      [n + k, d + k],
      [n * k, d * (k + 1)],
      [n * k + 1, d * k],
      [d, n * d],
    ])
  );
  const q: QuizQuestion = {
    visual: () => klgFracVis()?.bar(n, d, { label: `A bar for ${frac(n, d)}: ${n} of ${d} parts shaded` }) ?? null,
    prompt: `Which fraction is equal to ${frac(n, d)}?`,
    dedupeKey: `eq:${n}/${d}x${k}`,
    explanation: `${frac(n, d)} and ${frac(n * k, d * k)} cover the same amount: cut each part into ${k} smaller parts.`,
    correctAnswer: frac(n * k, d * k),
    choices: built,
  };
  if (level < 3) {
    q.choiceVisuals = {};
    q.choiceLabels = {};
    built.forEach((c) => {
      const [cn, cd] = c.split('/').map(Number);
      q.choiceVisuals![c] = () => labelledBar(cn, cd);
      q.choiceLabels![c] = c;
    });
    q.noChoiceListen = true;
  }
  return q;
}

function makeCompareQuestion(level: number): QuizQuestion {
  let fractions: FractionTuple[];
  if (randomInt(0, 1) === 0) {
    const d = pick([6, 8, 10, 12]);
    const numerators = shuffle([...Array(d - 1)].map((_, i) => i + 1)).slice(0, 4);
    fractions = numerators.map((n) => [n, d]);
  } else {
    const n = randomInt(1, 3);
    const denominators = shuffle([n + 1, n + 2, n + 4, n + 7, n + 9]).slice(0, 4);
    fractions = denominators.map((d) => [n, d]);
  }
  const biggest = randomInt(0, 1) === 1;
  const sorted = [...fractions].sort((a, b) => a[0] * b[1] - b[0] * a[1]);
  const correct = biggest ? sorted[sorted.length - 1] : sorted[0];
  const q: QuizQuestion = {
    prompt: biggest ? 'Which fraction is the BIGGEST?' : 'Which fraction is the SMALLEST?',
    dedupeKey: (biggest ? 'big:' : 'small:') + sorted.map((f) => frac(...f)).join(','),
    correctAnswer: frac(...correct),
    choices: shuffle(fractions.map((f) => frac(...f))),
    explanation: `${frac(...correct)} covers the ${biggest ? 'most' : 'least'} of the bar.`,
  };
  if (level < 3) {
    q.choiceVisuals = {};
    q.choiceLabels = {};
    fractions.forEach(([cn, cd]) => {
      const key = frac(cn, cd);
      q.choiceVisuals![key] = () => labelledBar(cn, cd);
      q.choiceLabels![key] = key;
    });
    q.noChoiceListen = true;
  }
  return q;
}

function makeAddSubtractQuestion(): QuizQuestion {
  const d = pick([4, 5, 6, 8, 10, 12]);
  const adding = randomInt(0, 1) === 1;
  let n1: number;
  let n2: number;
  let result: number;
  if (adding) {
    n1 = randomInt(1, d - 2);
    n2 = randomInt(1, d - 1 - n1);
    result = n1 + n2;
  } else {
    n1 = randomInt(2, d - 1);
    n2 = randomInt(1, n1 - 1);
    result = n1 - n2;
  }
  const symbol = adding ? '+' : '−';
  return {
    visual: () =>
      klgFracVis()?.stacked(
        [
          [n1, d],
          [n2, d],
        ],
        { label: `Two bars cut into ${d} parts: one with ${n1} shaded and one with ${n2} shaded` }
      ) ?? null,
    explanation: `${n1} ${symbol} ${n2} = ${result}, and the parts stay ${d}ths: ${frac(result, d)}.`,
    prompt: `${frac(n1, d)} ${symbol} ${frac(n2, d)} = ?`,
    correctAnswer: frac(result, d),
    choices: buildChoices(
      [result, d],
      shuffle([
        [adding ? n1 + n2 : n1 - n2, d + d],
        [adding ? n1 - n2 : n1 + n2, d],
        [result + 1, d],
        [result - 1, d],
      ])
    ),
  };
}

function makeUnlikeAddQuestion(): QuizQuestion {
  const [d1, d2] = pick(RELATED_DENOMINATORS);
  const k = d2 / d1;
  const adding = randomInt(0, 1) === 1;
  let n1: number;
  let n2: number;
  let result: number;
  do {
    n1 = randomInt(1, d1 - 1);
    n2 = randomInt(1, d2 - 1);
    result = adding ? n1 * k + n2 : n1 * k - n2;
  } while (result < 1 || result >= d2 || n2 % k === 0);
  const symbol = adding ? '+' : '−';
  return {
    visual: () =>
      klgFracVis()?.stacked(
        [
          [n1, d1],
          [n2, d2],
        ],
        { label: `One bar cut into ${d1} parts with ${n1} shaded, and one cut into ${d2} parts with ${n2} shaded` }
      ) ?? null,
    explanation: `${frac(n1, d1)} is the same as ${frac(n1 * k, d2)}. Then ${n1 * k} ${symbol} ${n2} = ${result}, so the answer is ${frac(result, d2)}.`,
    prompt: `${frac(n1, d1)} ${symbol} ${frac(n2, d2)} = ?`,
    correctAnswer: frac(result, d2),
    choices: buildChoices(
      [result, d2],
      shuffle([
        [n1 + n2, d1 + d2],
        [Math.abs(adding ? n1 + n2 : n1 - n2), d2],
        [result + 1, d2],
        [result - 1, d2],
      ])
    ),
  };
}

function makeUnlikeCompareQuestion(): QuizQuestion {
  const fractions = shuffle(MIXED_FRACTIONS).slice(0, 4);
  const biggest = randomInt(0, 1) === 1;
  const sorted = [...fractions].sort((a, b) => a[0] * b[1] - b[0] * a[1]);
  const correct = biggest ? sorted[sorted.length - 1] : sorted[0];
  return {
    prompt: biggest ? 'Which fraction is the BIGGEST?' : 'Which fraction is the SMALLEST?',
    dedupeKey: (biggest ? 'big:' : 'small:') + sorted.map((f) => frac(...f)).join(','),
    hintVisual: () => klgFracVis()?.stacked(fractions, { label: 'One bar for each fraction, all the same length' }) ?? null,
    correctAnswer: frac(...correct),
    choices: shuffle(fractions.map((f) => frac(...f))),
    explanation: `${frac(...correct)} covers the ${biggest ? 'most' : 'least'} of a whole bar.`,
  };
}

function buildQuery(type: FractionMode, level: number): string {
  const p = new URLSearchParams();
  if (type !== 'all') p.set('type', type);
  if (level !== 2) p.set('level', String(level));
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const fractionsGame: QuizGameDefinition = {
  id: 'fractions',
  buildConfig(params) {
    const rawType = params.get('type');
    const mode: FractionMode =
      rawType === 'identify' || rawType === 'picture' || rawType === 'equivalent' || rawType === 'compare' || rawType === 'add'
        ? rawType
        : 'all';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 || rawLevel === 4 ? rawLevel : 2;

    const labels: Record<FractionMode, string> = {
      all: 'Pictures, equivalents, comparing & adding',
      identify: 'Read the fraction picture',
      picture: 'Find the picture for the fraction',
      equivalent: 'Find the equivalent fraction',
      compare: 'Tap the biggest or smallest fraction',
      add: 'Add & subtract with like denominators',
    };

    const kindsByMode: Record<FractionMode, Array<() => QuizQuestion>> = {
      identify: [() => makeIdentifyQuestion(level)],
      picture: [() => makePictureQuestion(level)],
      equivalent: [() => makeEquivalentQuestion(level)],
      compare: [() => (level === 4 ? makeUnlikeCompareQuestion() : makeCompareQuestion(level))],
      add: [() => (level === 4 ? makeUnlikeAddQuestion() : makeAddSubtractQuestion())],
      all: [],
    };
    kindsByMode.all = [
      ...kindsByMode.identify,
      ...kindsByMode.picture,
      ...kindsByMode.equivalent,
      ...kindsByMode.compare,
      ...kindsByMode.add,
    ];
    const kinds = kindsByMode[mode];

    return {
      totalQuestions: 15,
      timePerQuestion: 120,
      modeLabel: labels[mode],
      infoText: '15 questions · 2 minutes each · multiple choice',
      instructions: 'The shaded parts go on top, all the equal parts go on the bottom. Look at the picture, count, then choose.',
      finishTitle: 'Fractions Quiz Complete!',
      mascot: '🥧',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-fractions-best-ms:${mode}${level === 2 ? '' : `:L${level}`}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('all', level), active: mode === 'all' },
            { label: 'Read a picture', query: buildQuery('identify', level), active: mode === 'identify' },
            { label: 'Find the picture', query: buildQuery('picture', level), active: mode === 'picture' },
            { label: 'Equivalent', query: buildQuery('equivalent', level), active: mode === 'equivalent' },
            { label: 'Compare', query: buildQuery('compare', level), active: mode === 'compare' },
            { label: 'Add & Subtract', query: buildQuery('add', level), active: mode === 'add' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · halves & quarters', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · up to tenths', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · bigger fractions', query: buildQuery(mode, 3), active: level === 3 },
            { label: 'Level 4 · different bottoms', query: buildQuery(mode, 4), active: level === 4 },
          ],
        },
      ],
      generateQuestion: () => pick(kinds)(),
    };
  },
};
