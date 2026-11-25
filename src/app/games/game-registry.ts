import type { QuizGameDefinition } from '../game/quiz-types';

type SubjectChunk = 'math' | 'english' | 'logic' | 'science';

/**
 * Synchronous lookup table mapping all 30 migrated QuizEngine game IDs
 * (17 Math + 5 English + 1 Logic + 7 Science & World) to their lazy subject chunk.
 */
const GAME_SUBJECT: Readonly<Record<string, SubjectChunk>> = {
  // Math (17)
  'number-sounds': 'math',
  counting: 'math',
  'shapes-colors': 'math',
  'comparing-numbers': 'math',
  calendar: 'math',
  'addition-subtraction': 'math',
  'multiply-pictures': 'math',
  'divide-pictures': 'math',
  'fact-families': 'math',
  multiplication: 'math',
  division: 'math',
  fractions: 'math',
  time: 'math',
  money: 'math',
  measurement: 'math',
  'market-day': 'math',
  'rounding-place-value': 'math',
  // English (5)
  'picture-words': 'english',
  'english-alphabets': 'english',
  'rhyming-words': 'english',
  'reading-stories': 'english',
  opposites: 'english',
  // Logic (1)
  patterns: 'logic',
  // Science & World (7)
  'feelings-faces': 'science',
  'everyday-tools': 'science',
  'baby-animals': 'science',
  'animal-habitats': 'science',
  'solar-system': 'science',
  'science-quiz': 'science',
  'world-capitals': 'science',
};

export const ANGULAR_GAME_IDS: ReadonlySet<string> = new Set(Object.keys(GAME_SUBJECT));

const loadedChunks: Partial<Record<SubjectChunk, Promise<Readonly<Record<string, QuizGameDefinition>>>>> = {};

function loadSubjectChunk(subject: SubjectChunk): Promise<Readonly<Record<string, QuizGameDefinition>>> {
  if (!loadedChunks[subject]) {
    if (subject === 'math') {
      loadedChunks[subject] = import('./math').then((m) => m.MATH_QUIZ_GAMES);
    } else if (subject === 'english') {
      loadedChunks[subject] = import('./english').then((m) => m.ENGLISH_QUIZ_GAMES);
    } else if (subject === 'logic') {
      loadedChunks[subject] = import('./logic').then((m) => m.LOGIC_QUIZ_GAMES);
    } else {
      loadedChunks[subject] = import('./science').then((m) => m.SCIENCE_QUIZ_GAMES);
    }
  }
  return loadedChunks[subject]!;
}

export function isAngularGame(id: string | null | undefined): id is string {
  return !!id && Object.prototype.hasOwnProperty.call(GAME_SUBJECT, id);
}

/** Lazy-loads the subject chunk for `id` (cached after first load) and returns its QuizGameDefinition. */
export async function loadAngularQuizGame(id: string | null | undefined): Promise<QuizGameDefinition | null> {
  if (!isAngularGame(id)) return null;
  const chunk = await loadSubjectChunk(GAME_SUBJECT[id]);
  return chunk[id] || null;
}
