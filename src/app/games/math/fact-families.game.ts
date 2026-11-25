import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgMathVis, pick, randomInt, shuffle } from './math-helpers';

const facts = (p: number, a: number, b: number) => [
  `${a} × ${b} = ${p}`,
  `${b} × ${a} = ${p}`,
  `${p} ÷ ${a} = ${b}`,
  `${p} ÷ ${b} = ${a}`,
];

function familyList(p: number, a: number, b: number): HTMLElement {
  const ul = document.createElement('ul');
  ul.className = 'mv-facts';
  [...new Set(facts(p, a, b))].forEach((f) => {
    const li = document.createElement('li');
    li.textContent = f;
    ul.appendChild(li);
  });
  return ul;
}

function buildQuery(level: number, tablesRaw: string | null): string {
  const p = new URLSearchParams();
  if (level !== 2) p.set('level', String(level));
  if (tablesRaw) p.set('tables', tablesRaw);
  return p.toString();
}

export const factFamiliesGame: QuizGameDefinition = {
  id: 'fact-families',
  buildConfig(params) {
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;
    const tablesRaw = params.get('tables');
    const asked = (tablesRaw || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 2 && n <= 12);
    const tables = asked.length ? asked : level === 1 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];

    return {
      totalQuestions: 10,
      timePerQuestion: 60,
      bigChoices: false,
      smallQuestion: true,
      subtitle: '3, 4 and 12 belong together.',
      infoText: '10 triangles • 60 seconds each',
      instructions:
        "The top number is the two bottom numbers multiplied. Cover a corner and the other two tell you what's hiding: 3 × 4 = 12, 12 ÷ 3 = 4, 12 ÷ 4 = 3.",
      finishTitle: 'Round Complete!',
      modeGroups: [
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · ×2 ×5 ×10', query: buildQuery(1, tablesRaw), active: level === 1 },
            { label: 'Level 2 · all tables', query: buildQuery(2, tablesRaw), active: level === 2 },
            { label: 'Level 3 · all tables', query: buildQuery(3, tablesRaw), active: level === 3 },
          ],
        },
      ],
      generateQuestion(seen): QuizQuestion {
        const v = klgMathVis()!;
        let a = 2;
        let b = 2;
        let p = 4;
        let key = '2x2';
        for (let i = 0; i < 30; i += 1) {
          a = pick(tables);
          b = randomInt(2, level === 1 ? 5 : 10);
          p = a * b;
          key = [Math.min(a, b), Math.max(a, b)].join('x');
          if (!seen.has(key)) break;
        }
        const solution = () => {
          const box = document.createElement('div');
          box.append(v.triangle(p, a, b, null), familyList(p, a, b));
          return box;
        };

        if (Math.random() < 0.25 && a !== b) {
          const intruders = shuffle([
            `${p} ÷ ${a} = ${a}`,
            `${a} + ${b} = ${p}`,
            `${p} × ${a} = ${b}`,
            `${b} ÷ ${a} = ${p}`,
            `${p} − ${a} = ${b}`,
          ]).filter((f) => !facts(p, a, b).includes(f));
          const odd = intruders[0];
          const options = shuffle([...shuffle(facts(p, a, b)).slice(0, 3), odd]);
          return {
            visual: () => v.triangle(p, a, b, null),
            solution,
            prompt: 'Which fact does NOT belong to this family?',
            dedupeKey: key,
            correctAnswer: odd,
            choices: options,
            explanation: `${odd} is not true for ${a}, ${b} and ${p}. The family is ${facts(p, a, b).join(', ')}.`,
          };
        }

        const hidden = pick(['product', 'a', 'b'] as const);
        const answer = hidden === 'product' ? p : hidden === 'a' ? a : b;
        const known = hidden === 'product' ? `${a} × ${b}` : hidden === 'a' ? `${p} ÷ ${b}` : `${p} ÷ ${a}`;
        return {
          visual: () => v.triangle(p, a, b, hidden),
          solution,
          prompt: 'What number is hiding in the triangle?',
          dedupeKey: key,
          correctAnswer: answer,
          choices: v.numberChoices(answer, hidden === 'product' ? [a + b, p + a, p - b] : [answer + 1, answer - 1, p - answer]),
          explanation: `${known} = ${answer}.`,
        };
      },
    };
  },
};
