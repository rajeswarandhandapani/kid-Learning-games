import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgBlocks, randomInt, shuffle } from './math-helpers';

const THINGS = ['🍎', '⭐', '🎈', '🐞', '🌸', '🐤', '🍪', '⚽', '🦋', '🍓', '🐢', '🚗'];
const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function emojiCluster(emoji: string, n: number): string {
  const groups: string[] = [];
  for (let i = 0; i < n; i += 5) {
    groups.push(emoji.repeat(Math.min(5, n - i)));
  }
  return groups.join('\u2003');
}

function makeDistractors(n: number, max: number): number[] {
  const wrongs = new Set<number>();
  for (const c of shuffle([n - 1, n + 1, n - 2, n + 2])) {
    if (c >= 1 && c <= max + 2) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(1, max + 2);
    if (r !== n) wrongs.add(r);
  }
  return [...wrongs];
}

function dieFace(n: number): HTMLElement {
  const die = document.createElement('span');
  die.className = 'kv-die';
  die.setAttribute('aria-hidden', 'true');
  const active = PIPS[n] || [];
  for (let cell = 1; cell <= 9; cell += 1) {
    const spot = document.createElement('span');
    if (active.includes(cell)) spot.className = 'kv-pip';
    die.appendChild(spot);
  }
  return die;
}

function dicePicture(n: number): HTMLElement {
  const first = n <= 6 ? n : randomInt(n - 6, 6);
  const faces = n <= 6 ? [first] : [first, n - first];
  const f = document.createElement('figure');
  f.className = 'kv-dice';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', faces.length === 1 ? `A die showing ${n} dots` : `Two dice with ${faces[0]} and ${faces[1]} dots`);
  f.dataset['total'] = String(n);
  faces.forEach((x) => f.appendChild(dieFace(x)));
  return f;
}

function buildQuery(maxVal: number, modeVal: string): string {
  const p = new URLSearchParams();
  if (maxVal !== 10) p.set('max', String(maxVal));
  if (modeVal !== 'emoji') p.set('mode', modeVal);
  return p.toString();
}

export const countingGame: QuizGameDefinition = {
  id: 'counting',
  buildConfig(params) {
    const raw = parseInt(params.get('max') || '', 10);
    const max = Number.isInteger(raw) ? Math.min(20, Math.max(5, raw)) : 10;
    const rawStyle = params.get('mode') || 'emoji';
    const style = rawStyle === 'tenframe' || rawStyle === 'dice' ? rawStyle : 'emoji';
    const effectiveMax = style === 'dice' ? Math.min(max, 12) : max;
    const totalQuestions = Math.min(10, effectiveMax);
    const timePerQuestion = max > 10 ? 30 : 20;

    return {
      totalQuestions,
      timePerQuestion,
      modeLabel: `Counting 1 to ${max}`,
      infoText: `${totalQuestions} questions • ${timePerQuestion} seconds each • count and tap the number`,
      instructions:
        'Count the pictures 👆 one by one, then tap how many there are. Big groups are split into rows of five to make counting easier!',
      finishTitle: 'Great Counting!',
      bestTimeKey: `klg-counting-best-ms:${max}${style === 'emoji' ? '' : ':' + style}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: '1 – 5', query: buildQuery(5, style), active: max === 5 },
            { label: '1 – 10', query: buildQuery(10, style), active: max === 10 },
            { label: '1 – 20', query: buildQuery(20, style), active: max === 20 },
          ],
        },
        {
          id: 'style-links',
          links: [
            { label: '🍎 Pictures', query: buildQuery(max, 'emoji'), active: style === 'emoji' },
            { label: '🔟 Ten-frames', query: buildQuery(max, 'tenframe'), active: style === 'tenframe' },
            { label: '🎲 Dice', query: buildQuery(max, 'dice'), active: style === 'dice' },
          ],
        },
      ],
      generateQuestion(askedSet: Set<string | number>): QuizQuestion {
        const cap = effectiveMax;
        const available: number[] = [];
        for (let n = 1; n <= cap; n += 1) {
          if (!askedSet.has(n)) available.push(n);
        }
        const pool = available.length ? available : Array.from({ length: cap }, (_, i) => i + 1);
        const n = pool[randomInt(0, pool.length - 1)];
        const emoji = THINGS[randomInt(0, THINGS.length - 1)];

        if (style !== 'emoji') {
          const bk = klgBlocks();
          return {
            visual: () => (style === 'dice' ? dicePicture(n) : bk ? bk.tenFrame(n, { emoji }) : document.createTextNode(emojiCluster(emoji, n))),
            prompt: style === 'dice' ? 'How many dots?' : 'How many do you see?',
            speechPrompt: style === 'dice' ? 'How many dots are on the dice?' : 'How many do you see?',
            dedupeKey: n,
            explanation: `There ${n === 1 ? 'is' : 'are'} ${n}.`,
            correctAnswer: n,
            choices: shuffle([n, ...makeDistractors(n, cap)]),
          };
        }

        return {
          promptSub: 'How many do you see?',
          prompt: emojiCluster(emoji, n),
          speechPrompt: 'How many do you see?',
          dedupeKey: n,
          correctAnswer: n,
          choices: shuffle([n, ...makeDistractors(n, cap)]),
        };
      },
    };
  },
};
