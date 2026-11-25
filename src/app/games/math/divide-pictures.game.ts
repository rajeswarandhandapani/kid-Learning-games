import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, pick, randomInt, shuffle } from './math-helpers';

const MODES = ['share', 'group', 'hops', 'rows', 'leftover'] as const;
type DivPicMode = (typeof MODES)[number] | 'mix';

const THINGS: Array<[string, string]> = [
  ['🍪', 'cookies'],
  ['🍎', 'apples'],
  ['🍬', 'sweets'],
  ['🎈', 'balloons'],
  ['🍓', 'strawberries'],
  ['🖍️', 'crayons'],
];

function buildQuery(mode: DivPicMode, level: number): string {
  const p = new URLSearchParams();
  if (mode !== 'mix') p.set('mode', mode);
  if (level !== 2) p.set('level', String(level));
  return p.toString();
}

export const dividePicturesGame: QuizGameDefinition = {
  id: 'divide-pictures',
  buildConfig(params) {
    const rawMode = params.get('mode');
    const mode: DivPicMode = rawMode && (MODES as readonly string[]).includes(rawMode) ? (rawMode as DivPicMode) : 'mix';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;
    const divisors = level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const maxQ = level === 1 ? 5 : level === 2 ? 6 : 8;

    const fact = (): [number, number, number] => {
      const d = pick(divisors.filter((x) => x <= 8 || level === 3));
      const q = randomInt(2, maxQ);
      return [d * q, d, q];
    };

    const builders: Record<(typeof MODES)[number], () => QuizQuestion> = {
      share() {
        const v = klgMathVis()!;
        const [total, people, each] = fact();
        const [emoji, name] = pick(THINGS);
        return {
          visual: () => v.share(total, people, emoji),
          solution: () => v.groups(people, each, emoji, { holder: 'plate', label: `${people} plates with ${each} ${name} each` }),
          prompt: `${total} ${name} are shared equally by ${people} children. How many does each child get?`,
          dedupeKey: `s${total}/${people}`,
          correctAnswer: each,
          choices: v.numberChoices(each, [people, total - people, each + 1, each - 1]),
          explanation: `${total} ÷ ${people} = ${each}, because ${people} × ${each} = ${total}.`,
        };
      },
      group() {
        const v = klgMathVis()!;
        const [total, size, count] = fact();
        const [emoji, holder, name] = pick([
          ['🥚', 'box', 'eggs'],
          ['🍬', 'bag', 'sweets'],
          ['🥭', 'basket', 'mangoes'],
          ['⚽', 'box', 'balls'],
        ] as Array<[string, string, string]>);
        const word = v.HOLDER_WORD[holder];
        return {
          visual: () => v.pile(total, emoji),
          solution: () => v.circled(total, size, emoji),
          prompt: `Put ${total} ${name} into ${word} of ${size}. How many ${word} do you fill?`,
          dedupeKey: `g${total}/${size}`,
          correctAnswer: count,
          choices: v.numberChoices(count, [size, total - size, count + 1, count - 1]),
          explanation: `${total} ÷ ${size} = ${count} — ${count} ${word} of ${size}.`,
        };
      },
      hops() {
        const v = klgMathVis()!;
        const [total, step, hops] = fact();
        return {
          visual: () => v.numberLine({ step, hops, max: total, back: true }),
          prompt: `The frog hops back from ${total} to 0 in jumps of ${step}. How many hops does it make?`,
          dedupeKey: `h${total}/${step}`,
          correctAnswer: hops,
          choices: v.numberChoices(hops, [step, hops + 1, hops - 1, total - step]),
          explanation: `${total} ÷ ${step} = ${hops} hops.`,
        };
      },
      rows() {
        const v = klgMathVis()!;
        const [total, rows, cols] = fact();
        const emoji = pick(['🌷', '🪑', '🥕', '⭐']);
        return {
          visual: () => v.array(rows, cols, emoji),
          prompt: `${total} ${emoji} are planted in ${rows} equal rows. How many are in each row?`,
          dedupeKey: `r${total}/${rows}`,
          correctAnswer: cols,
          choices: v.numberChoices(cols, [rows, total - rows, cols + 1, cols - 1]),
          explanation: `${total} ÷ ${rows} = ${cols} in each row.`,
        };
      },
      leftover() {
        const v = klgMathVis()!;
        const usable = divisors.filter((d) => d >= 3);
        const size = pick(usable.length ? usable : [3]);
        const full = randomInt(2, Math.min(maxQ, 6));
        const left = randomInt(1, size - 1);
        const total = size * full + left;
        const [, name] = pick(THINGS);
        const emoji = THINGS.find(([, n]) => n === name)?.[0] || '🍬';
        const say = (f: number, l: number) => `${f} bags, ${l} left`;
        const wrong = [say(full + 1, left), say(full, size - left), say(full - 1, left + size), say(left, full)]
          .filter((w, i, all) => w !== say(full, left) && all.indexOf(w) === i);
        return {
          visual: () => v.pile(total, emoji),
          solution: () => v.circled(total, size, emoji),
          prompt: `${total} ${name} go into bags of ${size}. How many full bags, and how many are left over?`,
          dedupeKey: `l${total}/${size}`,
          correctAnswer: say(full, left),
          choices: shuffle([say(full, left), ...wrong.slice(0, 3)]),
          explanation: `${total} ÷ ${size} = ${full} remainder ${left}. The ${left} left over is less than ${size}, so it can't fill another bag.`,
        };
      },
    };

    return {
      totalQuestions: 10,
      timePerQuestion: 90,
      bigChoices: false,
      smallQuestion: true,
      subtitle: 'Share it out. Group it up.',
      infoText: '10 picture questions • 90 seconds each',
      instructions:
        'Division is sharing equally or making equal groups. After each answer the picture shows the solution — the treats on each plate, or the items looped into groups.',
      finishTitle: 'Round Complete!',
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('mix', level), active: mode === 'mix' },
            { label: '🤝 Share', query: buildQuery('share', level), active: mode === 'share' },
            { label: '📦 Group', query: buildQuery('group', level), active: mode === 'group' },
            { label: '🐸 Hop back', query: buildQuery('hops', level), active: mode === 'hops' },
            { label: '🌷 Rows', query: buildQuery('rows', level), active: mode === 'rows' },
            { label: '🍬 Leftovers', query: buildQuery('leftover', level), active: mode === 'leftover' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · ÷2 ÷5 ÷10', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · ÷2–÷6', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · ÷2–÷10', query: buildQuery(mode, 3), active: level === 3 },
          ],
        },
      ],
      generateQuestion(askedSet) {
        const pool = mode === 'mix' ? (level === 1 ? MODES.filter((m) => m !== 'leftover') : MODES) : [mode];
        let q!: QuizQuestion;
        for (let i = 0; i < 20; i += 1) {
          q = builders[pick(pool)]();
          if (!askedSet.has(q.dedupeKey!)) break;
        }
        return { ...q, reviewPrompt: q.prompt };
      },
    };
  },
};
