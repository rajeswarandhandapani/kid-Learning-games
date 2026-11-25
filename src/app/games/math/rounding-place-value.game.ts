import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgBlocks, klgMathVis, pick, randomInt, shuffle } from './math-helpers';

type PlaceMode = 'all' | 'rounding' | 'placevalue';

interface PlaceDef {
  name: string;
  value: number;
  key: string;
}

const ALL_PLACES: readonly PlaceDef[] = [
  { name: 'ones', value: 1, key: 'o' },
  { name: 'tens', value: 10, key: 't' },
  { name: 'hundreds', value: 100, key: 'h' },
  { name: 'thousands', value: 1000, key: 'th' },
  { name: 'ten thousands', value: 10000, key: 'tth' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function digitAt(number: number, placeValue: number): number {
  return Math.floor(number / placeValue) % 10;
}

function randomDistinctDigitNumber(len: number): { digits: number[]; number: number } {
  const digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len);
  if (digits[0] === 0) [digits[0], digits[1]] = [digits[1], digits[0]];
  return { digits, number: digits.reduce((n, d) => n * 10 + d, 0) };
}

function roundingLine(n: number, unit: number): HTMLElement | null {
  const v = klgMathVis();
  if (!v) return null;
  const lo = Math.floor(n / unit) * unit;
  const hi = lo + unit;
  const mid = lo + unit / 2;
  const f = v.figure(
    `A number line from ${formatNumber(lo)} to ${formatNumber(hi)} with ${formatNumber(n)} marked on it. Halfway is ${formatNumber(mid)}.`,
    'kv-roundline'
  );
  f.dataset['value'] = String(n);
  f.dataset['lo'] = String(lo);
  f.dataset['hi'] = String(hi);
  const w = 320;
  const pad = 34;
  const x = (val: number) => pad + ((val - lo) / unit) * (w - 2 * pad);
  const svg = v.el('svg', { viewBox: `0 0 ${w} 84`, focusable: 'false', 'aria-hidden': 'true' });
  svg.appendChild(v.el('line', { x1: pad, y1: 44, x2: w - pad, y2: 44, class: 'kv-tl-line' }));
  [lo, hi].forEach((val) => {
    svg.appendChild(v.el('line', { x1: x(val), y1: 34, x2: x(val), y2: 54, class: 'kv-tick-big' }));
    svg.appendChild(v.el('text', { x: x(val), y: 74, class: 'kv-tl-label', 'text-anchor': 'middle' }, formatNumber(val)));
  });
  svg.appendChild(v.el('line', { x1: x(mid), y1: 30, x2: x(mid), y2: 58, class: 'kv-mid' }));
  svg.appendChild(v.el('text', { x: x(mid), y: 22, class: 'kv-mid-label', 'text-anchor': 'middle' }, 'halfway'));
  svg.appendChild(v.el('circle', { cx: x(n), cy: 44, r: 8, class: 'kv-dot' }));
  svg.appendChild(v.el('text', { x: x(n), y: 14, class: 'kv-tl-label', 'text-anchor': 'middle' }, formatNumber(n)));
  f.appendChild(svg);
  return f;
}

function makeRoundingQuestion(level: number, pictures: boolean): QuizQuestion {
  const roundingUnits =
    level === 4
      ? [
          { unit: 100, name: 'hundred', min: 1040, max: 98765 },
          { unit: 1000, name: 'thousand', min: 10420, max: 98765 },
          { unit: 10000, name: 'ten thousand', min: 10420, max: 94999 },
        ]
      : [
          { unit: 10, name: 'ten', min: 13, max: 987 },
          { unit: 100, name: 'hundred', min: 104, max: level === 1 ? 987 : 9876 },
          { unit: 1000, name: 'thousand', min: 1042, max: 9876 },
        ].slice(0, level === 1 ? 2 : 3);

  const { unit, name, min, max } = pick(roundingUnits);
  let n: number;
  do {
    n = randomInt(min, max);
  } while (n % unit === 0);
  const correct = Math.round(n / unit) * unit;

  const wrong = shuffle(
    [
      correct - unit,
      correct + unit,
      Math.round(n / (unit * 10)) * (unit * 10),
      Math.round(n / (unit / 10)) * (unit / 10),
    ].filter((w, i, arr) => w > 0 && w !== correct && arr.indexOf(w) === i)
  );
  const choices = new Set([correct, ...wrong]);
  let step = 2;
  while (choices.size < 4) {
    choices.add(correct + unit * step);
    step += 1;
  }

  return {
    visual: pictures ? () => roundingLine(n, unit) : null,
    explanation: `${formatNumber(n)} is between ${formatNumber(Math.floor(n / unit) * unit)} and ${formatNumber(Math.floor(n / unit) * unit + unit)}. ${
      n % unit >= unit / 2 ? 'It is halfway or past it, so it rounds up' : 'It is before halfway, so it rounds down'
    } to ${formatNumber(correct)}.`,
    dedupeKey: `round:${n}:${unit}`,
    prompt: `Round ${formatNumber(n)} to the nearest ${name}.`,
    correctAnswer: correct,
    choices: shuffle([...choices].slice(0, 4)),
  };
}

function makeDigitAtPlaceQuestion(len: number, places: readonly PlaceDef[], pictures: boolean): QuizQuestion {
  const { digits, number } = randomDistinctDigitNumber(len);
  const place = pick(places);
  return {
    visual: pictures ? () => klgBlocks()?.chart(number) ?? null : null,
    explanation: `In ${formatNumber(number)} the ${place.name} place holds ${digitAt(number, place.value)}.`,
    dedupeKey: `digit:${number}:${place.name}`,
    prompt: `Which digit is in the ${place.name} place of ${formatNumber(number)}?`,
    correctAnswer: digitAt(number, place.value),
    choices: shuffle([...digits]),
  };
}

function makeValueOfDigitQuestion(len: number, places: readonly PlaceDef[], pictures: boolean): QuizQuestion {
  const { number } = randomDistinctDigitNumber(len);
  const nonZeroPlaces = places.filter((p) => digitAt(number, p.value) !== 0);
  const place = pick(nonZeroPlaces);
  const digit = digitAt(number, place.value);
  return {
    visual: pictures ? () => klgBlocks()?.blocks(number, { highlight: place.key }) ?? null : null,
    explanation: `${digit} in the ${place.name} place is worth ${digit} × ${formatNumber(place.value)} = ${formatNumber(digit * place.value)}.`,
    dedupeKey: `value:${number}:${place.name}`,
    prompt: `What is the value of the ${digit} in ${formatNumber(number)}?`,
    correctAnswer: digit * place.value,
    choices: shuffle(places.map((p) => digit * p.value)),
  };
}

function makeExpandedFormQuestion(len: number, pictures: boolean): QuizQuestion {
  let digits: number[];
  let number: number;
  do {
    ({ digits, number } = randomDistinctDigitNumber(len));
  } while (digits.includes(0));

  const parts = digits.map((d, i) => formatNumber(d * 10 ** (len - 1 - i)));
  const wrong = new Set<number>();
  while (wrong.size < 3) {
    const swapped = [...digits];
    const i = randomInt(0, len - 2);
    const j = randomInt(i + 1, len - 1);
    [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
    const candidate = swapped.reduce((n, d) => n * 10 + d, 0);
    if (candidate !== number) wrong.add(candidate);
  }

  return {
    visual: pictures ? () => klgBlocks()?.blocks(number) ?? null : null,
    explanation: `${parts.join(' + ')} = ${formatNumber(number)}.`,
    dedupeKey: `expanded:${number}`,
    prompt: `${parts.join(' + ')} = ?`,
    correctAnswer: number,
    choices: shuffle([number, ...wrong]),
  };
}

function buildQuery(type: PlaceMode, level: number): string {
  const p = new URLSearchParams();
  if (type !== 'all') p.set('type', type);
  if (level !== 2) p.set('level', String(level));
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const roundingPlaceValueGame: QuizGameDefinition = {
  id: 'rounding-place-value',
  buildConfig(params) {
    const rawType = params.get('type');
    const mode: PlaceMode = rawType === 'rounding' || rawType === 'placevalue' ? rawType : 'all';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 || rawLevel === 4 ? rawLevel : 2;
    const pictures = level < 3;
    const len = level === 1 ? 3 : level === 4 ? 5 : 4;
    const places = ALL_PLACES.slice(0, len);

    const labels: Record<PlaceMode, string> = {
      all: 'Rounding + place value',
      rounding: level === 4 ? 'Rounding to the nearest 100, 1,000 and 10,000' : 'Rounding to the nearest 10, 100 and 1,000',
      placevalue: 'Digits, their values and expanded form',
    };

    const roundingFn = () => makeRoundingQuestion(level, pictures);
    const placeValueFns = [
      () => makeDigitAtPlaceQuestion(len, places, pictures),
      () => makeValueOfDigitQuestion(len, places, pictures),
      () => makeExpandedFormQuestion(len, pictures),
    ];
    const kinds =
      mode === 'rounding'
        ? [roundingFn]
        : mode === 'placevalue'
          ? placeValueFns
          : [roundingFn, roundingFn, ...placeValueFns];

    return {
      totalQuestions: 20,
      timePerQuestion: 120,
      modeLabel: labels[mode],
      infoText: '20 questions · 2 minutes each · multiple choice',
      instructions:
        'Remember the rounding rule: look at the digit one place to the right — 5 or more, round up; 4 or less, round down!',
      finishTitle: 'Rounding & Place Value Complete!',
      mascot: '🔢',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-place-best-ms:${mode}${level === 2 ? '' : `:L${level}`}`,
      formatAnswer: (v) => (typeof v === 'number' ? formatNumber(v) : String(v)),
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix of both', query: buildQuery('all', level), active: mode === 'all' },
            { label: 'Rounding 🎯', query: buildQuery('rounding', level), active: mode === 'rounding' },
            { label: 'Place Value 🏷️', query: buildQuery('placevalue', level), active: mode === 'placevalue' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · 3-digit numbers', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · 4-digit numbers', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · no pictures', query: buildQuery(mode, 3), active: level === 3 },
            { label: 'Level 4 · 5-digit numbers', query: buildQuery(mode, 4), active: level === 4 },
          ],
        },
      ],
      generateQuestion: () => pick(kinds)(),
    };
  },
};
