import type { QuizGameDefinition } from '../../game/quiz-types';
import { additionSubtractionGame } from './addition-subtraction.game';
import { calendarGame } from './calendar.game';
import { comparingNumbersGame } from './comparing-numbers.game';
import { countingGame } from './counting.game';
import { dividePicturesGame } from './divide-pictures.game';
import { divisionGame } from './division.game';
import { factFamiliesGame } from './fact-families.game';
import { fractionsGame } from './fractions.game';
import { marketDayGame } from './market-day.game';
import { measurementGame } from './measurement.game';
import { moneyGame } from './money.game';
import { multiplicationGame } from './multiplication.game';
import { multiplyPicturesGame } from './multiply-pictures.game';
import { numberSoundsGame } from './number-sounds.game';
import { roundingPlaceValueGame } from './rounding-place-value.game';
import { shapesColorsGame } from './shapes-colors.game';
import { timeGame } from './time.game';

/** All 17 Math QuizEngine games lazily loaded as one subject chunk. */
export const MATH_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
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
