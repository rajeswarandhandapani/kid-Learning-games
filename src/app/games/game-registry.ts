import type { QuizGameDefinition } from '../game/quiz-types';
import { additionSubtractionGame } from './math/addition-subtraction.game';
import { calendarGame } from './math/calendar.game';
import { comparingNumbersGame } from './math/comparing-numbers.game';
import { countingGame } from './math/counting.game';
import { dividePicturesGame } from './math/divide-pictures.game';
import { divisionGame } from './math/division.game';
import { factFamiliesGame } from './math/fact-families.game';
import { fractionsGame } from './math/fractions.game';
import { marketDayGame } from './math/market-day.game';
import { measurementGame } from './math/measurement.game';
import { moneyGame } from './math/money.game';
import { multiplicationGame } from './math/multiplication.game';
import { multiplyPicturesGame } from './math/multiply-pictures.game';
import { numberSoundsGame } from './math/number-sounds.game';
import { roundingPlaceValueGame } from './math/rounding-place-value.game';
import { shapesColorsGame } from './math/shapes-colors.game';
import { timeGame } from './math/time.game';

/** Registry of games migrated to native Angular components (Phase 2A + 2B: all 17 Math QuizEngine games). */
export const ANGULAR_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
  [numberSoundsGame.id]: numberSoundsGame,
  [countingGame.id]: countingGame,
  [shapesColorsGame.id]: shapesColorsGame,
  [comparingNumbersGame.id]: comparingNumbersGame,
  [calendarGame.id]: calendarGame,
  [additionSubtractionGame.id]: additionSubtractionGame,
  [multiplyPicturesGame.id]: multiplyPicturesGame,
  [dividePicturesGame.id]: dividePicturesGame,
  [factFamiliesGame.id]: factFamiliesGame,
  [multiplicationGame.id]: multiplicationGame,
  [divisionGame.id]: divisionGame,
  [fractionsGame.id]: fractionsGame,
  [timeGame.id]: timeGame,
  [moneyGame.id]: moneyGame,
  [measurementGame.id]: measurementGame,
  [marketDayGame.id]: marketDayGame,
  [roundingPlaceValueGame.id]: roundingPlaceValueGame,
};

export const ANGULAR_GAME_IDS: ReadonlySet<string> = new Set(Object.keys(ANGULAR_QUIZ_GAMES));

export function isAngularGame(id: string | null | undefined): id is string {
  return !!id && ANGULAR_GAME_IDS.has(id);
}

export function getAngularQuizGame(id: string | null | undefined): QuizGameDefinition | null {
  return id ? ANGULAR_QUIZ_GAMES[id] || null : null;
}
