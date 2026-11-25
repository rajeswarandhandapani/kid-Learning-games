import type { QuizGameDefinition } from '../../game/quiz-types';
import { animalHabitatsGame } from './animal-habitats.game';
import { babyAnimalsGame } from './baby-animals.game';
import { everydayToolsGame } from './everyday-tools.game';
import { feelingsFacesGame } from './feelings-faces.game';
import { scienceQuizGame } from './science-quiz.game';
import { solarSystemGame } from './solar-system.game';
import { worldCapitalsGame } from './world-capitals.game';

/** All 7 Science & World QuizEngine games lazily loaded as one subject chunk. */
export const SCIENCE_QUIZ_GAMES: Readonly<Record<string, QuizGameDefinition>> = {
  [feelingsFacesGame.id]: feelingsFacesGame,
  [everydayToolsGame.id]: everydayToolsGame,
  [babyAnimalsGame.id]: babyAnimalsGame,
  [animalHabitatsGame.id]: animalHabitatsGame,
  [solarSystemGame.id]: solarSystemGame,
  [scienceQuizGame.id]: scienceQuizGame,
  [worldCapitalsGame.id]: worldCapitalsGame,
};
