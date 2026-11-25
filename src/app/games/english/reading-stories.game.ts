import * as rawStoriesBank from '../../../../games/reading-stories/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, shuffle, unwrapCjs } from '../math/math-helpers';

type StoryRow = readonly [string, string, string, readonly string[], string, string];

interface StoriesBank {
  STORIES: readonly StoryRow[];
  STORIES_2: readonly StoryRow[];
}

function storyPicture(emoji: string): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-clue';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', 'A picture for the story');
  f.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
  return f;
}

export const readingStoriesGame: QuizGameDefinition = {
  id: 'reading-stories',
  buildConfig(params) {
    const bank = unwrapCjs<StoriesBank>(rawStoriesBank);
    const stories = params.get('level') === '2' ? bank.STORIES_2 : bank.STORIES;
    const indices = stories.map((_, i) => i);

    return {
      totalQuestions: 8,
      timePerQuestion: 45,
      infoText: 'Read the story, then choose the answer. You can look back at the story whenever you like.',
      instructions: 'Listen to or read the short story carefully, then tap the answer that matches the clues.',
      finishTitle: 'Look what you learned!',
      mascot: '📖',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      generateQuestion(askedSet): QuizQuestion {
        const available = indices.filter((i) => !askedSet.has(`story-${i}`));
        const index = pick(available.length ? available : indices);
        const [story, question, correct, others, explanation, picture] = stories[index];
        return {
          visual: () => storyPicture(picture),
          prompt: `${story}\n\n${question}`,
          dedupeKey: `story-${index}`,
          correctAnswer: correct,
          choices: shuffle([correct, ...others]),
          explanation,
        };
      },
    };
  },
};
