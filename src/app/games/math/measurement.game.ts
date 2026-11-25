import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMeasureVis, pick, randomInt, shuffle } from './math-helpers';

type MeasureMode = 'all' | 'read' | 'unit' | 'convert' | 'compare';
type UnitKind = 'length' | 'weight' | 'volume';

interface UnitDef {
  unit: string;
  short: string;
  base: number;
}

interface MeasureSystem {
  name: 'metric' | 'us';
  units: Record<UnitKind, UnitDef[]>;
  conversions: Array<{ from: string; to: string; factor: number }>;
  objects: Array<{ thing: string; kind: UnitKind; short: string; size: number }>;
}

const METRIC: MeasureSystem = {
  name: 'metric',
  units: {
    length: [
      { unit: 'millimeters (mm)', short: 'mm', base: 1 },
      { unit: 'centimeters (cm)', short: 'cm', base: 10 },
      { unit: 'meters (m)', short: 'm', base: 1000 },
      { unit: 'kilometers (km)', short: 'km', base: 1000000 },
    ],
    weight: [
      { unit: 'grams (g)', short: 'g', base: 1 },
      { unit: 'kilograms (kg)', short: 'kg', base: 1000 },
    ],
    volume: [
      { unit: 'milliliters (ml)', short: 'ml', base: 1 },
      { unit: 'liters (L)', short: 'L', base: 1000 },
    ],
  },
  conversions: [
    { from: 'cm', to: 'mm', factor: 10 },
    { from: 'm', to: 'cm', factor: 100 },
    { from: 'km', to: 'm', factor: 1000 },
    { from: 'kg', to: 'g', factor: 1000 },
    { from: 'L', to: 'ml', factor: 1000 },
  ],
  objects: [
    { thing: 'a pencil ✏️', kind: 'length', short: 'cm', size: 18 },
    { thing: 'your thumb 👍', kind: 'length', short: 'cm', size: 5 },
    { thing: 'a door 🚪', kind: 'length', short: 'm', size: 2 },
    { thing: 'a swimming pool 🏊', kind: 'length', short: 'm', size: 25 },
    { thing: 'the drive to another city 🚗', kind: 'length', short: 'km', size: 200 },
    { thing: 'a football field 🏟️', kind: 'length', short: 'm', size: 100 },
    { thing: 'an ant 🐜', kind: 'length', short: 'mm', size: 5 },
    { thing: 'an apple 🍎', kind: 'weight', short: 'g', size: 150 },
    { thing: 'a bag of rice 🍚', kind: 'weight', short: 'kg', size: 5 },
    { thing: 'a feather 🪶', kind: 'weight', short: 'g', size: 1 },
    { thing: 'a car 🚙', kind: 'weight', short: 'kg', size: 1200 },
    { thing: 'a spoonful of medicine 🥄', kind: 'volume', short: 'ml', size: 5 },
    { thing: 'a bottle of water 💧', kind: 'volume', short: 'L', size: 1 },
    { thing: 'a bathtub full of water 🛁', kind: 'volume', short: 'L', size: 200 },
  ],
};

const US: MeasureSystem = {
  name: 'us',
  units: {
    length: [
      { unit: 'inches (in)', short: 'in', base: 1 },
      { unit: 'feet (ft)', short: 'ft', base: 12 },
      { unit: 'yards (yd)', short: 'yd', base: 36 },
      { unit: 'miles (mi)', short: 'mi', base: 63360 },
    ],
    weight: [
      { unit: 'ounces (oz)', short: 'oz', base: 1 },
      { unit: 'pounds (lb)', short: 'lb', base: 16 },
    ],
    volume: [
      { unit: 'cups', short: 'cups', base: 8 },
      { unit: 'pints', short: 'pints', base: 16 },
      { unit: 'quarts', short: 'quarts', base: 32 },
      { unit: 'gallons', short: 'gallons', base: 128 },
    ],
  },
  conversions: [
    { from: 'ft', to: 'in', factor: 12 },
    { from: 'yd', to: 'ft', factor: 3 },
    { from: 'lb', to: 'oz', factor: 16 },
    { from: 'pints', to: 'cups', factor: 2 },
    { from: 'quarts', to: 'pints', factor: 2 },
    { from: 'gallons', to: 'quarts', factor: 4 },
  ],
  objects: [
    { thing: 'a pencil ✏️', kind: 'length', short: 'in', size: 7 },
    { thing: 'a door 🚪', kind: 'length', short: 'ft', size: 7 },
    { thing: 'a football field 🏟️', kind: 'length', short: 'yd', size: 100 },
    { thing: 'the drive to another city 🚗', kind: 'length', short: 'mi', size: 120 },
    { thing: 'an apple 🍎', kind: 'weight', short: 'oz', size: 5 },
    { thing: 'a bag of flour 🍞', kind: 'weight', short: 'lb', size: 5 },
    { thing: 'a car 🚙', kind: 'weight', short: 'lb', size: 3000 },
    { thing: 'milk for a bowl of cereal 🥣', kind: 'volume', short: 'cups', size: 1 },
    { thing: 'a jug of milk 🥛', kind: 'volume', short: 'gallons', size: 1 },
  ],
};

const KIND_QUESTION: Record<UnitKind, string> = {
  length: 'How long',
  weight: 'How heavy',
  volume: 'How much liquid',
};

const COMPARE_WORDS: Record<UnitKind, [string, string]> = {
  length: ['longest', 'shortest'],
  weight: ['heaviest', 'lightest'],
  volume: ['most', 'least'],
};

const RULER_THINGS = ['✏️', '🖍️', '🥕', '🪥', '🔑', '🍴', '🪁', '🐛'];
const WEIGHTS: ReadonlyArray<[string, string, number]> = [
  ['🐘', 'the elephant', 5000000],
  ['🍉', 'the watermelon', 4000],
  ['🍎', 'the apple', 150],
  ['🪶', 'the feather', 1],
  ['🐈', 'the cat', 4000],
  ['🎾', 'the tennis ball', 60],
  ['🚗', 'the car', 1200000],
  ['🐜', 'the ant', 1],
  ['📖', 'the book', 500],
  ['🥚', 'the egg', 60],
];

function fmtQty(count: number, short: string): string {
  if (count === 1 && short.endsWith('s') && short.length > 2) {
    return `${count} ${short.slice(0, -1)}`;
  }
  return `${count} ${short}`;
}

function unitByShort(system: MeasureSystem, short: string): (UnitDef & { kind: UnitKind }) | null {
  for (const kind of Object.keys(system.units) as UnitKind[]) {
    const found = system.units[kind].find((u) => u.short === short);
    if (found) return { ...found, kind };
  }
  return null;
}

function makeUnitQuestion(system: MeasureSystem): QuizQuestion {
  const item = pick(system.objects);
  const answer = unitByShort(system, item.short)!;
  const sameKind = system.units[item.kind].filter((u) => u.short !== item.short);
  const otherKinds = (Object.keys(system.units) as UnitKind[])
    .filter((k) => k !== item.kind)
    .flatMap((k) => system.units[k]);
  const wrongs = shuffle(sameKind).slice(0, 2);
  shuffle(otherKinds).forEach((u) => {
    if (wrongs.length < 3) wrongs.push(u);
  });
  return {
    prompt: `${KIND_QUESTION[item.kind]} is ${item.thing}? Which unit would you use?`,
    dedupeKey: `unit-${item.thing}`,
    correctAnswer: answer.unit,
    choices: shuffle([answer.unit, ...wrongs.map((u) => u.unit)]).slice(0, 4),
  };
}

function makeEstimateQuestion(system: MeasureSystem): QuizQuestion {
  const item = pick(system.objects);
  const others = system.units[item.kind].filter((u) => u.short !== item.short);
  const answer = fmtQty(item.size, item.short);
  const wrongs = shuffle([
    ...others.map((u) => fmtQty(item.size, u.short)),
    fmtQty(item.size * 10, item.short),
    fmtQty(item.size * 100, item.short),
  ]).slice(0, 3);
  return {
    prompt: `About how much is ${item.thing}?`,
    dedupeKey: `estimate-${item.thing}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...wrongs]),
  };
}

function makeConvertQuestion(system: MeasureSystem): QuizQuestion {
  const conv = pick(system.conversions);
  const count = pick([1, 2, 2, 3, 4, 5, 10]);
  const answer = count * conv.factor;
  const wrongs = [
    count * conv.factor * 10,
    Math.round((count * conv.factor) / 10),
    count + conv.factor,
    count * conv.factor + count,
  ];
  const choices = [answer];
  for (const w of wrongs) {
    if (Number.isInteger(w) && w > 0 && !choices.includes(w)) choices.push(w);
    if (choices.length === 4) break;
  }
  return {
    prompt: `${fmtQty(count, conv.from)} = ? ${conv.to}`,
    dedupeKey: `conv-${count}-${conv.from}`,
    correctAnswer: answer,
    choices: shuffle(choices),
  };
}

function makeCompareQuestion(system: MeasureSystem): QuizQuestion {
  const kind = pick((Object.keys(system.units) as UnitKind[]).filter((k) => system.units[k].length >= 2));
  const units = system.units[kind];
  const index = randomInt(0, units.length - 2);
  const small = units[index];
  const big = units[index + 1];
  const ratio = big.base / small.base;

  const items: Array<{ label: string; total: number }> = [];
  let guard = 0;
  while (items.length < 3 && guard < 60) {
    guard += 1;
    const unit = items.length === 0 ? big : items.length === 1 ? small : pick([big, small]);
    const count =
      unit === big
        ? randomInt(1, 4)
        : Math.max(1, Math.round(ratio * pick([0.25, 0.5, 0.75, 1.5, 2, 2.5, 3])));
    const total = count * unit.base;
    if (!items.some((it) => it.total === total)) {
      items.push({ label: fmtQty(count, unit.short), total });
    }
  }

  const [bigWord, smallWord] = COMPARE_WORDS[kind];
  const askBiggest = randomInt(0, 1) === 0;
  const sorted = [...items].sort((x, y) => y.total - x.total);
  const answer = (askBiggest ? sorted[0] : sorted[sorted.length - 1]).label;
  return {
    prompt: `Which is the ${askBiggest ? bigWord : smallWord}?`,
    dedupeKey: `cmp-${items.map((i) => i.label).join('|')}-${askBiggest}`,
    correctAnswer: answer,
    choices: shuffle(items.map((i) => i.label)),
  };
}

function makeRulerQuestion(system: MeasureSystem): QuizQuestion {
  const us = system.name === 'us';
  const unit = us ? 'in' : 'cm';
  const len = us ? randomInt(2, 8) : randomInt(3, 15);
  const emoji = pick(RULER_THINGS);
  const wrongs = shuffle([len + 1, len - 1, len + 2, len - 2, len * 2])
    .filter((v) => v > 0 && v !== len)
    .slice(0, 3);
  return {
    visual: () => klgMeasureVis()?.ruler(len, { unit, emoji, max: us ? 9 : 16 }) ?? null,
    prompt: `How long is the ${emoji}?`,
    dedupeKey: `ruler-${len}-${emoji}`,
    explanation: `It starts at 0 and ends at ${len}, so it is ${len} ${unit} long.`,
    correctAnswer: `${len} ${unit}`,
    choices: shuffle([len, ...wrongs].map((v) => `${v} ${unit}`)),
  };
}

function makeJugQuestion(system: MeasureSystem): QuizQuestion {
  const us = system.name === 'us';
  const max = us ? 4 : pick([200, 400, 1000]);
  const unit = us ? 'cups' : 'ml';
  const step = max / 4;
  const q = randomInt(1, 3);
  const fill = q * step;
  const wrongs = shuffle([fill + step, fill - step, fill + 2 * step, max]).filter((v) => v > 0 && v !== fill);
  const answer = us ? fmtQty(fill, 'cups') : `${fill} ml`;
  const choices = [fill, ...[...new Set(wrongs)].slice(0, 3)];
  return {
    visual: () => klgMeasureVis()?.jug(fill, max, { unit }) ?? null,
    prompt: 'How much liquid is in the jug?',
    dedupeKey: `jug-${max}-${fill}`,
    explanation: `The water reaches the ${fill} mark (each mark is ${step} ${unit}).`,
    correctAnswer: answer,
    choices: shuffle(choices.map((v) => (us ? fmtQty(v, 'cups') : `${v} ml`))),
  };
}

function makeThermoQuestion(system: MeasureSystem): QuizQuestion {
  const us = system.name === 'us';
  const [min, max] = us ? [0, 100] : [0, 40];
  const temp = 5 * randomInt(min / 5 + 1, max / 5 - 1);
  const wrongs = shuffle([temp + 5, temp - 5, temp + 10, temp - 10])
    .filter((v) => v > min && v < max && v !== temp)
    .slice(0, 3);
  const fmt = (v: number) => `${v}°${us ? 'F' : 'C'}`;
  return {
    visual: () => klgMeasureVis()?.thermometer(temp, { min, max }) ?? null,
    prompt: 'What temperature does the thermometer show?',
    dedupeKey: `thermo-${temp}`,
    explanation: `The red line stops at ${fmt(temp)}.`,
    correctAnswer: fmt(temp),
    choices: shuffle([temp, ...wrongs].map(fmt)),
  };
}

function makeBalanceQuestion(): QuizQuestion {
  let a: readonly [string, string, number];
  let b: readonly [string, string, number];
  do {
    [a, b] = shuffle(WEIGHTS).slice(0, 2);
  } while (a[2] === b[2]);
  const heavier = a[2] > b[2] ? a : b;
  const lighter = a[2] > b[2] ? b : a;
  const askHeavy = randomInt(0, 1) === 0;
  const target = askHeavy ? heavier : lighter;
  const name = (x: readonly [string, string, number]) => `${x[0]} ${x[1]}`;
  return {
    visual: () => klgMeasureVis()?.balance(a[2], b[2], { leftEmoji: a[0], rightEmoji: b[0] }) ?? null,
    prompt: `The scale is tipped. Which is ${askHeavy ? 'heavier' : 'lighter'}?`,
    dedupeKey: `balance-${a[0]}-${b[0]}-${askHeavy}`,
    explanation: `The ${heavier[0]} pulls its side of the scale down, so it is heavier and the ${lighter[0]} is lighter.`,
    correctAnswer: name(target),
    choices: shuffle([name(a), name(b)]),
    noChoiceListen: true,
  };
}

function buildQuery(mode: MeasureMode, units: 'metric' | 'us'): string {
  const p = new URLSearchParams();
  if (mode !== 'all') p.set('mode', mode);
  if (units === 'us') p.set('units', 'us');
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const measurementGame: QuizGameDefinition = {
  id: 'measurement',
  buildConfig(params) {
    const rawMode = params.get('mode');
    const mode: MeasureMode =
      rawMode === 'unit' || rawMode === 'convert' || rawMode === 'compare' || rawMode === 'read' ? rawMode : 'all';
    const units: 'metric' | 'us' = params.get('units') === 'us' ? 'us' : 'metric';
    const system = units === 'us' ? US : METRIC;

    const labels: Record<MeasureMode, string> = {
      all: 'Reading tools, units, converting and comparing',
      read: 'Read the ruler, jug, thermometer and scale',
      unit: 'Which unit fits?',
      convert: 'Convert between units',
      compare: 'Which is bigger?',
    };

    return {
      totalQuestions: 15,
      timePerQuestion: 25,
      modeLabel: labels[mode] + (system.name === 'us' ? ' (inches, pounds, cups)' : ' (cm, kg, liters)'),
      infoText: '15 questions · 25 seconds each · multiple choice',
      instructions: 'How long, how heavy, how much? Choose the right unit and measure like a scientist. 🔬',
      finishTitle: 'Measurement Quiz Complete!',
      mascot: '📏',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-measurement-best-ms:${system.name}:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('all', units), active: mode === 'all' },
            { label: '📏 Read the tool', query: buildQuery('read', units), active: mode === 'read' },
            { label: 'Pick the Unit', query: buildQuery('unit', units), active: mode === 'unit' },
            { label: 'Convert', query: buildQuery('convert', units), active: mode === 'convert' },
            { label: 'Compare', query: buildQuery('compare', units), active: mode === 'compare' },
          ],
        },
        {
          id: 'unit-links',
          links: [
            { label: 'Metric (cm, kg, L)', query: buildQuery(mode, 'metric'), active: units === 'metric' },
            { label: 'US Units (in, lb, cups)', query: buildQuery(mode, 'us'), active: units === 'us' },
          ],
        },
      ],
      generateQuestion: () => {
        const kind =
          mode === 'all'
            ? pick(['unit', 'estimate', 'convert', 'compare', 'read', 'read'] as const)
            : mode === 'read'
              ? 'read'
              : mode === 'unit'
                ? pick(['unit', 'estimate'] as const)
                : mode;
        if (kind === 'unit') return makeUnitQuestion(system);
        if (kind === 'estimate') return makeEstimateQuestion(system);
        if (kind === 'convert') return makeConvertQuestion(system);
        if (kind === 'read') {
          return pick([makeRulerQuestion, makeRulerQuestion, makeJugQuestion, makeThermoQuestion, () => makeBalanceQuestion()])(
            system
          );
        }
        return makeCompareQuestion(system);
      },
    };
  },
};
