import type { QuizGameDefinition } from '../../game/quiz-types';
import { patternsGame } from './patterns.game';

/** Logic QuizEngine games lazily loaded as one subject chunk. */
export const LOGIC_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
  [patternsGame.id]: patternsGame,
};
