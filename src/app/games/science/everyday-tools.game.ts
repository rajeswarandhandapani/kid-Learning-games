import * as rawToolsBank from '../../../../games/everyday-tools/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { shuffle, unwrapCjs } from '../math/math-helpers';

type ToolQuestion = readonly [string, string, ...string[]];

interface EverydayToolsBank {
  TOOLS: Record<string, string>;
  QUESTIONS: readonly ToolQuestion[];
  QUESTIONS_2: readonly ToolQuestion[];
}

function humanizeKey(key: string): string {
  return key.replaceAll('_', ' ');
}

function helpsText(key: string): string {
  const word = humanizeKey(key);
  if (['scissors', 'glasses', 'gloves', 'headphones', 'socks'].includes(key)) {
    return `${word[0].toUpperCase()}${word.slice(1)} help with that.`;
  }
  return `${/^[aeiou]/.test(word) ? 'An' : 'A'} ${word} helps with that.`;
}

export const everydayToolsGame: QuizGameDefinition = {
  id: 'everyday-tools',
  buildConfig(params) {
    const bank = unwrapCjs<EverydayToolsBank>(rawToolsBank);
    const { TOOLS } = bank;
    const questions = params.get('level') === '2' ? bank.QUESTIONS_2 : bank.QUESTIONS;

    return {
      totalQuestions: 10,
      timePerQuestion: 25,
      infoText: '10 picture questions · practice at your own pace',
      instructions: 'Listen to what someone needs to do, then tap the useful object.',
      finishTitle: 'Great exploring!',
      mascot: '🪥',
      bigChoices: true,
      questionClass: 'quiz-question-sm',
      generateQuestion(askedSet): QuizQuestion {
        const available = questions.filter(([prompt]) => !askedSet.has(prompt));
        const [prompt, correct, ...wrong] = shuffle(available.length ? available : questions)[0];
        const keys = shuffle([correct, ...wrong]);
        return {
          prompt,
          correctAnswer: TOOLS[correct],
          choices: keys.map((key) => TOOLS[key]),
          choiceLabels: Object.fromEntries(keys.map((key) => [TOOLS[key], humanizeKey(key)])),
          explanation: helpsText(correct),
        };
      },
    };
  },
};
