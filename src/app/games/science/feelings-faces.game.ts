import * as rawFeelingsBank from '../../../../games/feelings-faces/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { shuffle, unwrapCjs } from '../math/math-helpers';

type FeelingTuple = readonly [string, string];
type MomentTuple = readonly [string, string];

interface FeelingsBank {
  FEELINGS: readonly FeelingTuple[];
  MOMENTS: readonly MomentTuple[];
  FEELINGS_2: readonly FeelingTuple[];
  MOMENTS_2: readonly MomentTuple[];
}

export const feelingsFacesGame: QuizGameDefinition = {
  id: 'feelings-faces',
  buildConfig(params) {
    const bank = unwrapCjs<FeelingsBank>(rawFeelingsBank);
    const harder = params.get('level') === '2';
    const feelings = harder ? bank.FEELINGS_2 : bank.FEELINGS;
    const moments = harder ? bank.MOMENTS_2 : bank.MOMENTS;

    return {
      totalQuestions: 10,
      timePerQuestion: 30,
      infoText: '10 picture questions · practice at your own pace',
      instructions: 'Listen to what happened. Look at the faces and choose the feeling.',
      finishTitle: 'Great exploring!',
      mascot: '😊',
      bigChoices: true,
      questionClass: 'quiz-question-sm',
      generateQuestion(askedSet): QuizQuestion {
        const available = moments.filter(([prompt]) => !askedSet.has(prompt));
        const [prompt, feeling] = shuffle(available.length ? available : moments)[0];
        const answer = feelings.find((item) => item[1] === feeling) || feelings[0];
        const choices = shuffle([answer, ...shuffle(feelings.filter((item) => item !== answer)).slice(0, 3)]);
        return {
          prompt,
          correctAnswer: answer[0],
          choices: choices.map((item) => item[0]),
          choiceLabels: Object.fromEntries(choices.map((item) => [item[0], item[1]])),
          explanation: `That face shows ${feeling}.`,
        };
      },
    };
  },
};
