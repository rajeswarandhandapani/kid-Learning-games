import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { randomInt, shuffle } from './math-helpers';

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberWord(n: number): string {
  if (n === 100) return 'one hundred';
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 ? `${tens}-${ONES[n % 10]}` : tens;
}

function makeDistractors(n: number, max: number): number[] {
  const wrongs = new Set<number>();
  const candidates: number[] = [];
  if (n >= 13 && n <= 19) candidates.push((n - 10) * 10);
  if (n % 10 === 0 && n >= 30 && n <= 90) candidates.push(n / 10 + 10);
  candidates.push(...shuffle([n - 1, n + 1, n - 2, n + 2, n - 10, n + 10]));
  for (const c of candidates) {
    if (c >= 1 && c <= max && c !== n) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(1, max);
    if (r !== n) wrongs.add(r);
  }
  return [...wrongs];
}

export const numberSoundsGame: QuizGameDefinition = {
  id: 'number-sounds',
  buildConfig(params) {
    const raw = parseInt(params.get('max') || '', 10);
    const max = Number.isInteger(raw) ? Math.min(100, Math.max(4, raw)) : 10;
    const totalQuestions = Math.min(10, max);
    const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

    return {
      totalQuestions,
      timePerQuestion: 15,
      modeLabel: `Numbers 1 to ${max}`,
      infoText: `${totalQuestions} questions • 15 seconds each • tap what you hear`,
      instructions:
        'Listen 👂 — the number is said out loud. Tap the 🔊 any time to hear it again, then tap the matching number. Turn your sound on!',
      speechWarning: "⚠️ This browser can't speak — the number will be shown as a word instead.",
      finishTitle: 'Great Listening!',
      bestTimeKey: `klg-numbers-best-ms:${max}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: '1 – 5', query: 'max=5', active: max === 5 },
            { label: '1 – 10', query: '', active: max === 10 },
            { label: '1 – 20', query: 'max=20', active: max === 20 },
            { label: '1 – 50', query: 'max=50', active: max === 50 },
            { label: '1 – 100', query: 'max=100', active: max === 100 },
          ],
        },
      ],
      generateQuestion(askedSet: Set<string | number>): QuizQuestion {
        const available: number[] = [];
        for (let n = 1; n <= max; n += 1) {
          if (!askedSet.has(n)) available.push(n);
        }
        const pool = available.length ? available : Array.from({ length: max }, (_, i) => i + 1);
        const n = pool[randomInt(0, pool.length - 1)];
        return {
          prompt: hasSpeech ? '🔊' : numberWord(n),
          promptTappable: hasSpeech,
          speechPrompt: hasSpeech ? String(n) : undefined,
          speechRate: 0.8,
          dedupeKey: n,
          correctAnswer: n,
          choices: shuffle([n, ...makeDistractors(n, max)]),
        };
      },
    };
  },
};
