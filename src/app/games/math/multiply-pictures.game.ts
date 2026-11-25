import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, pick, randomInt, shuffle } from './math-helpers';

const MODES = ['groups', 'arrays', 'hops', 'match', 'sentence'] as const;
type MultPicMode = (typeof MODES)[number] | 'mix';

const THINGS: Array<[string, string, string]> = [
  ['🍪', 'plate', 'cookies'],
  ['🍎', 'basket', 'apples'],
  ['🥚', 'box', 'eggs'],
  ['🍬', 'bag', 'sweets'],
  ['🌸', 'pot', 'flowers'],
  ['🥭', 'basket', 'mangoes'],
  ['🧁', 'plate', 'cupcakes'],
  ['⚽', 'box', 'balls'],
];

const repeated = (a: number, b: number) => (a <= 6 ? Array(a).fill(b).join(' + ') + ' = ' + a * b : `${a} lots of ${b} = ${a * b}`);

function buildQuery(mode: MultPicMode, level: number): string {
  const p = new URLSearchParams();
  if (mode !== 'mix') p.set('mode', mode);
  if (level !== 2) p.set('level', String(level));
  return p.toString();
}

export const multiplyPicturesGame: QuizGameDefinition = {
  id: 'multiply-pictures',
  buildConfig(params) {
    const rawMode = params.get('mode');
    const mode: MultPicMode = rawMode && (MODES as readonly string[]).includes(rawMode) ? (rawMode as MultPicMode) : 'mix';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;
    const tables = level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const maxGroups = level === 1 ? 5 : level === 2 ? 6 : 8;

    const fact = (): [number, number] => [randomInt(2, maxGroups), pick(tables)];

    const builders: Record<(typeof MODES)[number], () => QuizQuestion> = {
      groups() {
        const v = klgMathVis()!;
        const [a, b] = fact();
        const [emoji, holder, name] = pick(THINGS);
        const word = v.HOLDER_WORD[holder];
        return {
          visual: () => v.groups(a, b, emoji, { holder }),
          prompt: `${a} ${word} with ${b} ${name} on each. How many ${name} altogether?`,
          dedupeKey: `g${a}x${b}`,
          correctAnswer: a * b,
          choices: v.numberChoices(a * b, [a + b, a * b + b, a * b - b, a * (b + 1)]),
          explanation: `${a} groups of ${b}: ${repeated(a, b)}. So ${a} × ${b} = ${a * b}.`,
        };
      },
      arrays() {
        const v = klgMathVis()!;
        const [rows, cols] = fact();
        const emoji = pick(['🌷', '🌻', '🪑', '🥕', '🧁', '⭐']);
        return {
          visual: () => v.array(rows, cols, emoji),
          prompt: `${rows} rows with ${cols} in each row. How many ${emoji} are there?`,
          dedupeKey: `a${rows}x${cols}`,
          correctAnswer: rows * cols,
          choices: v.numberChoices(rows * cols, [rows + cols, rows * cols + cols, rows * cols - rows, (rows + 1) * cols]),
          explanation: `${rows} rows × ${cols} in each row = ${rows * cols}.`,
        };
      },
      hops() {
        const v = klgMathVis()!;
        const step = pick(tables);
        const hops = randomInt(2, level === 1 ? 5 : 7);
        return {
          visual: () => v.numberLine({ step, hops, max: step * Math.max(hops + 1, 5), hideEnd: true }),
          prompt: `The frog makes ${hops} hops of ${step}. Where does it land?`,
          dedupeKey: `h${hops}x${step}`,
          correctAnswer: hops * step,
          choices: v.numberChoices(hops * step, [hops + step, (hops + 1) * step, (hops - 1) * step]),
          explanation: `${hops} hops of ${step}: ${repeated(hops, step)}. ${hops} × ${step} = ${hops * step}.`,
        };
      },
      match() {
        const v = klgMathVis()!;
        const a = randomInt(2, 5);
        const b = randomInt(2, 5);
        const [emoji, holder] = pick(THINGS);
        const options: Array<[number, number]> = [[a, b]];
        const seen = new Set([a * b]);
        for (const [x, y] of shuffle([
          [a, b + 1],
          [a + 1, b],
          [a, b - 1],
          [a - 1, b],
          [b, b],
          [a, a],
          [a + 1, b - 1],
        ] as Array<[number, number]>)) {
          if (x >= 1 && y >= 1 && !seen.has(x * y) && options.length < 4) {
            options.push([x, y]);
            seen.add(x * y);
          }
        }
        const label = ([x, y]: [number, number]) => `${x} ${v.HOLDER_WORD[holder]} of ${y}`;
        return {
          prompt: `Which picture shows ${a} × ${b}?`,
          dedupeKey: `m${a}x${b}`,
          correctAnswer: label([a, b]),
          choices: shuffle(options.map(label)),
          choiceVisuals: Object.fromEntries(options.map((o) => [label(o), () => v.groups(o[0], o[1], emoji, { holder })])),
          noChoiceListen: true,
          explanation: `${a} × ${b} means ${a} groups of ${b} = ${a * b}.`,
        };
      },
      sentence() {
        const v = klgMathVis()!;
        const [rows, cols] = fact();
        const emoji = pick(['🌷', '🍓', '🐥', '🎈', '🍩']);
        const right = `${rows} × ${cols}`;
        const wrong = shuffle([`${rows} + ${cols}`, `${rows} × ${cols + 1}`, `${rows + 1} × ${cols}`, `${cols} + ${cols}`, `${rows - 1} × ${cols}`])
          .filter((w, i, all) => w !== right && w !== `${cols} × ${rows}` && all.indexOf(w) === i)
          .slice(0, 3);
        return {
          visual: () => v.array(rows, cols, emoji),
          prompt: 'Which number sentence matches the picture?',
          dedupeKey: `s${rows}x${cols}`,
          correctAnswer: right,
          choices: shuffle([right, ...wrong]),
          explanation: `${rows} rows of ${cols}: ${right} = ${rows * cols}.`,
        };
      },
    };

    return {
      totalQuestions: 10,
      timePerQuestion: 90,
      bigChoices: false,
      smallQuestion: true,
      subtitle: 'See it, count it, multiply it.',
      infoText: '10 picture questions • 90 seconds each',
      instructions:
        "3 × 4 means 3 groups of 4. Look at the picture, count in groups, and pick the answer. After each answer you'll see the adding that matches it.",
      finishTitle: 'Round Complete!',
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('mix', level), active: mode === 'mix' },
            { label: '🍽️ Groups', query: buildQuery('groups', level), active: mode === 'groups' },
            { label: '🌷 Arrays', query: buildQuery('arrays', level), active: mode === 'arrays' },
            { label: '🐸 Hops', query: buildQuery('hops', level), active: mode === 'hops' },
            { label: '🖼️ Match picture', query: buildQuery('match', level), active: mode === 'match' },
            { label: '✏️ Number sentence', query: buildQuery('sentence', level), active: mode === 'sentence' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · ×2 ×5 ×10', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · ×2–×6', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · ×2–×10', query: buildQuery(mode, 3), active: level === 3 },
          ],
        },
      ],
      generateQuestion(askedSet) {
        let q!: QuizQuestion;
        for (let i = 0; i < 20; i += 1) {
          q = builders[mode === 'mix' ? pick(MODES) : mode]();
          if (!askedSet.has(q.dedupeKey!)) break;
        }
        return { ...q, reviewPrompt: q.prompt };
      },
    };
  },
};
