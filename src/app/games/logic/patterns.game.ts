import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, pick, randomInt, shuffle } from '../math/math-helpers';

type PatternMode = 'all' | 'skip' | 'numbers' | 'shapes';

const PATTERN_SETS: ReadonlyArray<readonly [string, string, string]> = [
  ['🔴', '🔵', '🟡'],
  ['🍎', '🍌', '🍇'],
  ['⭐', '🌙', '☀️'],
  ['🐶', '🐱', '🐭'],
  ['🔺', '🟦', '⚪'],
  ['🚗', '🚌', '🚲'],
  ['🌸', '🍀', '🌻'],
  ['😀', '😎', '🤖'],
];

const seqText = (values: readonly number[] | readonly string[]) => `${values.join(', ')}, ?`;

function buildChoices<T extends string | number>(answer: T, candidates: readonly T[]): T[] {
  const wrongs: T[] = [];
  for (const value of candidates) {
    if (value !== answer && !wrongs.includes(value) && (typeof value !== 'number' || value > 0)) {
      wrongs.push(value);
    }
    if (wrongs.length === 3) break;
  }
  return shuffle([answer, ...wrongs]);
}

function makeSkipQuestion(): QuizQuestion {
  const step = pick([2, 2, 3, 5, 5, 10, 10, 25]);
  const backwards = randomInt(1, 4) === 1;
  const length = 4;

  if (backwards) {
    const start = step * randomInt(length + 1, 12);
    const shown: number[] = [];
    for (let i = 0; i < length; i += 1) shown.push(start - i * step);
    const answer = start - length * step;
    return {
      prompt: `Count back in ${step}s. What comes next?\n${seqText(shown)}`,
      dedupeKey: `skipback-${step}-${start}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer - step, answer + step, answer + 1, answer - 1]),
    };
  }

  const k = randomInt(1, 6);
  const start = step * k;
  const shown: number[] = [];
  for (let i = 0; i < length; i += 1) shown.push(start + i * step);
  const answer = start + length * step;
  return {
    visual: () => klgMathVis()?.numberLine({ step, hops: k + length, hideEnd: true }) ?? null,
    explanation: `Each hop adds ${step}: ${shown.join(', ')}, ${answer}.`,
    prompt: `Count in ${step}s. What comes next?\n${seqText(shown)}`,
    dedupeKey: `skip-${step}-${start}`,
    correctAnswer: answer,
    choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 1]),
  };
}

function makeNumberQuestion(): QuizQuestion {
  const kind = randomInt(1, 4);

  if (kind === 1) {
    const step = pick([4, 6, 7, 8, 9, 11, 12]);
    const start = randomInt(1, 15);
    const shown = [start, start + step, start + 2 * step, start + 3 * step];
    const answer = start + 4 * step;
    return {
      prompt: `What comes next?\n${seqText(shown)}`,
      dedupeKey: `add-${step}-${start}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 2]),
    };
  }

  if (kind === 2) {
    const step = pick([3, 4, 6, 7, 8, 9]);
    const answer = randomInt(1, 12);
    const shown = [answer + 4 * step, answer + 3 * step, answer + 2 * step, answer + step];
    return {
      prompt: `What comes next?\n${seqText(shown)}`,
      dedupeKey: `sub-${step}-${answer}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer - step, answer + step, answer - 1, answer + 2]),
    };
  }

  if (kind === 3) {
    const halving = randomInt(0, 1) === 1;
    const seed = pick([1, 2, 3, 5]);
    const doubles = [seed, seed * 2, seed * 4, seed * 8, seed * 16];
    if (halving) {
      const shown = [...doubles].reverse().slice(0, 4);
      const answer = seed;
      return {
        prompt: `Each number is half of the one before. What comes next?\n${seqText(shown)}`,
        dedupeKey: `half-${seed}`,
        correctAnswer: answer,
        choices: buildChoices(answer, [answer * 2, answer + 1, answer * 4, answer + 2]),
      };
    }
    const shown = doubles.slice(0, 4);
    const answer = doubles[4];
    return {
      prompt: `Each number is double the one before. What comes next?\n${seqText(shown)}`,
      dedupeKey: `double-${seed}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer + seed * 8, answer / 2, answer + 2, answer - 2]),
    };
  }

  const step = pick([2, 3, 4, 5, 10]);
  const start = step * randomInt(1, 6);
  const terms = [start, start + step, start + 2 * step, start + 3 * step];
  const hole = randomInt(1, 2);
  const answer = terms[hole];
  const shown = terms.map((t, i) => (i === hole ? '?' : String(t))).join(', ');
  return {
    prompt: `Which number is missing?\n${shown}`,
    dedupeKey: `gap-${step}-${start}-${hole}`,
    correctAnswer: answer,
    choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 1]),
  };
}

function buildTowerRow(counts: readonly number[], emoji: string): HTMLElement | null {
  const v = klgMathVis();
  if (!v) return null;
  const row = document.createElement('div');
  row.className = 'kv-row kv-towers';
  counts.forEach((c, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'kv-tower';
    wrap.appendChild(v.pile(c, emoji, { label: `Tower ${i + 1} has ${c}` }));
    row.appendChild(wrap);
    const arrow = document.createElement('span');
    arrow.className = 'kv-op';
    arrow.textContent = '➜';
    arrow.setAttribute('aria-hidden', 'true');
    row.appendChild(arrow);
  });
  const q = document.createElement('div');
  q.className = 'kv-tower kv-next';
  q.textContent = '?';
  q.setAttribute('aria-hidden', 'true');
  row.appendChild(q);
  return row;
}

function makeGrowingQuestion(): QuizQuestion {
  const step = pick([1, 2, 2, 3]);
  const first = randomInt(1, 3);
  const emoji = pick(['🔵', '🟢', '🟡', '🔴', '⭐']);
  const counts = [first, first + step, first + 2 * step];
  const answer = first + 3 * step;
  return {
    visual: () => buildTowerRow(counts, emoji),
    explanation: `Each tower has ${step} more: ${counts.join(', ')}, ${answer}.`,
    prompt: 'How many will the next tower have?',
    dedupeKey: `grow-${first}-${step}-${emoji}`,
    correctAnswer: answer,
    choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 1, counts[2]]),
  };
}

function makeShapePattern(): QuizQuestion {
  if (randomInt(1, 5) === 1) {
    const step = pick([1, 1, 2]);
    const start = randomInt(0, 25 - 5 * step);
    const letter = (offset: number) => String.fromCharCode(65 + ((start + offset) % 26));
    const letters: string[] = [];
    for (let i = 0; i < 4; i += 1) letters.push(letter(i * step));
    const answer = letter(4 * step);
    const codes = [letter(5 * step), letter(3 * step), letter(4 * step + 1), letter(4 * step + 2)];
    return {
      prompt: `What comes next?\n${seqText(letters)}`,
      dedupeKey: `letters-${start}-${step}`,
      correctAnswer: answer,
      choices: buildChoices(answer, codes),
    };
  }

  const baseSet = pick(PATTERN_SETS);
  const set = shuffle(baseSet);
  const [a, b, c] = set;
  const rule = pick(['AB', 'AAB', 'ABB', 'ABC'] as const);
  const unit = { AB: [a, b], AAB: [a, a, b], ABB: [a, b, b], ABC: [a, b, c] }[rule];
  const shown: string[] = [];
  const length = 7;
  for (let i = 0; i < length; i += 1) shown.push(unit[i % unit.length]);
  const answer = unit[length % unit.length];
  const outsider = pick(pick(PATTERN_SETS.filter((s) => s !== baseSet)));
  return {
    prompt: `What comes next?\n${shown.join(' ')} ❓`,
    dedupeKey: `pat-${rule}-${set.join('')}`,
    correctAnswer: answer,
    choices: shuffle([...new Set([answer, a, b, c, outsider])].slice(0, 4)),
  };
}

export const patternsGame: QuizGameDefinition = {
  id: 'patterns',
  buildConfig(params) {
    const raw = params.get('mode');
    const mode: PatternMode = raw === 'skip' || raw === 'numbers' || raw === 'shapes' ? raw : 'all';

    const labels: Record<PatternMode, string> = {
      all: 'Skip counting, number rules & picture patterns',
      skip: 'Counting on and back in steps',
      numbers: 'Find the number rule',
      shapes: 'Repeating picture patterns',
    };

    return {
      totalQuestions: 12,
      timePerQuestion: 20,
      modeLabel: labels[mode],
      infoText: '12 questions • 20 seconds each • what comes next?',
      instructions: '2, 4, 6, 8… can you spot the rule and say what comes next? 🕵️',
      finishTitle: 'Quiz Complete!',
      mascot: '🔁',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-patterns-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: 'Skip Counting', query: 'mode=skip', active: mode === 'skip' },
            { label: 'Number Patterns', query: 'mode=numbers', active: mode === 'numbers' },
            { label: 'Picture Patterns', query: 'mode=shapes', active: mode === 'shapes' },
          ],
        },
      ],
      generateQuestion: () => {
        const kind = mode === 'all' ? pick(['skip', 'skip', 'numbers', 'numbers', 'shapes'] as const) : mode;
        if (kind === 'skip') return makeSkipQuestion();
        if (kind === 'numbers') return randomInt(1, 4) === 1 ? makeGrowingQuestion() : makeNumberQuestion();
        return makeShapePattern();
      },
    };
  },
};
