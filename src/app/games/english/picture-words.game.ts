import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { shuffle } from '../math/math-helpers';

type PictureEntry = readonly [string, string, string];

const PICTURE_WORDS: readonly PictureEntry[] = [
  ['🍎', 'apple', 'food'], ['🍌', 'banana', 'food'], ['🍓', 'strawberry', 'food'], ['🍋', 'lemon', 'food'],
  ['🍉', 'watermelon', 'food'], ['🥕', 'carrot', 'food'], ['🍅', 'tomato', 'food'], ['🍞', 'bread', 'food'],
  ['🐶', 'dog', 'animal'], ['🐱', 'cat', 'animal'], ['🐸', 'frog', 'animal'], ['🐢', 'turtle', 'animal'],
  ['🦋', 'butterfly', 'animal'], ['🐟', 'fish', 'animal'], ['🐘', 'elephant', 'animal'], ['🐧', 'penguin', 'animal'],
  ['🚗', 'car', 'travel'], ['🚌', 'bus', 'travel'], ['🚲', 'bicycle', 'travel'], ['✈️', 'airplane', 'travel'],
  ['🚀', 'rocket', 'travel'], ['🚂', 'train', 'travel'], ['⛵', 'sailboat', 'travel'], ['🚁', 'helicopter', 'travel'],
  ['👟', 'shoe', 'things'], ['🎒', 'backpack', 'things'], ['📚', 'books', 'things'], ['🪥', 'toothbrush', 'things'],
  ['🧸', 'teddy bear', 'things'], ['☂️', 'umbrella', 'things'], ['⚽', 'soccer ball', 'things'], ['🔑', 'key', 'things'],
];

const PICTURE_WORDS_2: readonly PictureEntry[] = [
  ['🍍', 'pineapple', 'food'], ['🥦', 'broccoli', 'food'], ['🍇', 'grapes', 'food'], ['🥥', 'coconut', 'food'],
  ['🧀', 'cheese', 'food'], ['🍕', 'pizza', 'food'], ['🥚', 'egg', 'food'], ['🌽', 'corn', 'food'],
  ['🦒', 'giraffe', 'animal'], ['🦓', 'zebra', 'animal'], ['🐙', 'octopus', 'animal'], ['🦀', 'crab', 'animal'],
  ['🦉', 'owl', 'animal'], ['🦘', 'kangaroo', 'animal'], ['🦔', 'hedgehog', 'animal'], ['🦜', 'parrot', 'animal'],
  ['🚜', 'tractor', 'travel'], ['🚒', 'fire engine', 'travel'], ['🚑', 'ambulance', 'travel'], ['🛴', 'scooter', 'travel'],
  ['🚢', 'ship', 'travel'], ['🛶', 'canoe', 'travel'], ['🚠', 'cable car', 'travel'], ['🚕', 'taxi', 'travel'],
  ['🔭', 'telescope', 'things'], ['🧲', 'magnet', 'things'], ['🪜', 'ladder', 'things'], ['🎻', 'violin', 'things'],
  ['🥁', 'drum', 'things'], ['🧭', 'compass', 'things'], ['🪁', 'kite', 'things'], ['🕯️', 'candle', 'things'],
];

export const pictureWordsGame: QuizGameDefinition = {
  id: 'picture-words',
  buildConfig(params) {
    const level = params.get('level') === '2' ? 2 : 1;
    const wordList = level === 2 ? PICTURE_WORDS_2 : PICTURE_WORDS;

    return {
      totalQuestions: 10,
      timePerQuestion: 25,
      infoText: '10 picture questions · practice at your own pace',
      instructions: 'Listen to the word, then tap its picture. Use the speaker to hear it again.',
      finishTitle: 'Great exploring!',
      mascot: '🖼️',
      bigChoices: true,
      questionClass: 'quiz-question-sm',
      generateQuestion(askedSet): QuizQuestion {
        const available = wordList.filter((item) => !askedSet.has(item[1]));
        const answer = shuffle(available.length ? available : wordList)[0];
        const sameGroup = shuffle(wordList.filter((item) => item !== answer && item[2] === answer[2]));
        const choices = shuffle([answer, ...sameGroup.slice(0, 3)]);
        return {
          prompt: `Find the ${answer[1]}.`,
          dedupeKey: answer[1],
          correctAnswer: answer[0],
          choices: choices.map((item) => item[0]),
          choiceLabels: Object.fromEntries(choices.map((item) => [item[0], item[1]])),
          reviewPrompt: `Find the ${answer[1]}.`,
        };
      },
    };
  },
};
