import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, randomInt, shuffle } from './math-helpers';

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function parseTables(raw: string | null): number[] {
  if (!raw) return ALL_TABLES;
  const parsed = raw
    .split(',')
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  return parsed.length ? parsed : ALL_TABLES;
}

export const multiplicationGame: QuizGameDefinition = {
  id: 'multiplication',
  buildConfig(params) {
    const tablesParam = params.get('tables');
    const tables = parseTables(tablesParam);
    const totalQuestions = Math.min(25, tables.length * 12);
    const allPairs = tables.flatMap((a) => ALL_TABLES.map((b) => [a, b] as const));
    const tableKey = tables.join(',');

    return {
      totalQuestions,
      timePerQuestion: 10,
      modeLabel: tables.length === 12 ? 'Tables 1-12' : `Table${tables.length > 1 ? 's' : ''} ${tables.join(', ')}`,
      infoText: `${totalQuestions} questions • 10 seconds each • multiple choice`,
      instructions: 'Pick the product of the two numbers. Tap Show me anytime to see groups in an array.',
      finishTitle: 'Quiz Complete!',
      bestTimeKey: `klg-mult-best-ms:${tableKey}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'All tables (1–12)', query: '', active: !tablesParam || tables.length === 12 },
            { label: '×2, ×5, ×10', query: 'tables=2,5,10', active: tableKey === '2,5,10' },
            { label: '×3, ×4', query: 'tables=3,4', active: tableKey === '3,4' },
            { label: 'Tricky (6–9)', query: 'tables=6,7,8,9', active: tableKey === '6,7,8,9' },
          ],
        },
      ],
      generateQuestion(askedSet: Set<string | number>): QuizQuestion {
        const available = allPairs.filter(
          ([a, b]) => !askedSet.has(`${a} × ${b}`) && !askedSet.has(`${b} × ${a}`)
        );
        const pool = available.length ? available : allPairs;
        const [a, b] = pool[randomInt(0, pool.length - 1)];
        const correctAnswer = a * b;
        const choices = new Set<number>([correctAnswer]);
        while (choices.size < 4) {
          const offset = randomInt(-10, 10) || 1;
          const distractor = correctAnswer + offset;
          if (distractor > 0) choices.add(distractor);
        }

        return {
          prompt: `${a} × ${b}`,
          hintVisual: () => klgMathVis()?.array(a, b, '🟣') || null,
          correctAnswer,
          choices: shuffle([...choices]),
        };
      },
    };
  },
};
