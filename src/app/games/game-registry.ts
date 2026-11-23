import type { QuizGameDefinition } from '../game/quiz-types';
import { additionSubtractionGame } from './math/addition-subtraction.game';
import { countingGame } from './math/counting.game';
import { divisionGame } from './math/division.game';
import { multiplicationGame } from './math/multiplication.game';
import { numberSoundsGame } from './math/number-sounds.game';

/** Registry of games migrated to native Angular components (Phase 2A: Math Quiz Pilot Suite). */
export const ANGULAR_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
  [numberSoundsGame.id]: numberSoundsGame,
  [countingGame.id]: countingGame,
  [additionSubtractionGame.id]: additionSubtractionGame,
  [multiplicationGame.id]: multiplicationGame,
  [divisionGame.id]: divisionGame,
};

export const ANGULAR_GAME_IDS: ReadonlySet<string> = new Set(Object.keys(ANGULAR_QUIZ_GAMES));

export function isAngularGame(id: string | null | undefined): id is string {
  return !!id && ANGULAR_GAME_IDS.has(id);
}

export function getAngularQuizGame(id: string | null | undefined): QuizGameDefinition | null {
  return id ? ANGULAR_QUIZ_GAMES[id] || null : null;
}
