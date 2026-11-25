import type { QuizGameDefinition } from '../../game/quiz-types';
import { englishAlphabetsGame } from './english-alphabets.game';
import { oppositesGame } from './opposites.game';
import { pictureWordsGame } from './picture-words.game';
import { readingStoriesGame } from './reading-stories.game';
import { rhymingWordsGame } from './rhyming-words.game';

/** All 5 English QuizEngine games lazily loaded as one subject chunk. */
export const ENGLISH_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
  [pictureWordsGame.id]: pictureWordsGame,
  [englishAlphabetsGame.id]: englishAlphabetsGame,
  [rhymingWordsGame.id]: rhymingWordsGame,
  [readingStoriesGame.id]: readingStoriesGame,
  [oppositesGame.id]: oppositesGame,
};
