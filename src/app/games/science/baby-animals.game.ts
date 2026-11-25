import * as rawAnimalsBank from '../../../../games/baby-animals/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, randomInt, shuffle, unwrapCjs } from '../math/math-helpers';

type BabyMode = 'all' | 'baby' | 'animal';

interface AnimalEntry {
  emoji: string;
  animal: string;
  baby: string;
  avoid?: readonly string[];
}

interface BabyAnimalsBank {
  ANIMALS: readonly AnimalEntry[];
}

const FAMILIAR = [
  'dog', 'cat', 'cow', 'horse', 'sheep', 'pig', 'goat', 'chicken', 'duck', 'kangaroo',
  'bear', 'lion', 'tiger', 'rabbit', 'deer', 'elephant', 'frog', 'butterfly', 'penguin',
  'panda', 'owl', 'whale', 'giraffe', 'dolphin',
];

function nameFits(entry: AnimalEntry, name: string): boolean {
  return entry.baby === name || Boolean(entry.avoid && entry.avoid.includes(name));
}

function an(word: string): string {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

function pickAnimal(animals: readonly AnimalEntry[], askedSet: Set<string | number>): AnimalEntry {
  const available = animals.filter((a) => !askedSet.has(a.animal));
  return pick(available.length ? available : animals);
}

function clueFigure(emoji: string, animal: string): HTMLElement {
  const pic = document.createElement('figure');
  pic.className = 'kv-clue';
  pic.setAttribute('role', 'img');
  pic.setAttribute('aria-label', `A ${animal}`);
  pic.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
  return pic;
}

function makeBabyQuestion(animals: readonly AnimalEntry[], askedSet: Set<string | number>): QuizQuestion {
  const answer = pickAnimal(animals, askedSet);
  const wrongs = new Set<string>();
  const others = shuffle(animals.filter((a) => !nameFits(answer, a.baby)));
  for (const other of others) {
    wrongs.add(other.baby);
    if (wrongs.size === 3) break;
  }
  return {
    visual: () => clueFigure(answer.emoji, answer.animal),
    explanation: `A baby ${answer.animal} is called ${an(answer.baby)}.`,
    reviewPrompt: `What is a baby ${answer.animal} called? ${answer.emoji}`,
    prompt: `What is a baby ${answer.animal} called?`,
    dedupeKey: answer.animal,
    correctAnswer: answer.baby,
    choices: shuffle([answer.baby, ...wrongs]),
  };
}

function makeAnimalQuestion(animals: readonly AnimalEntry[], askedSet: Set<string | number>): QuizQuestion {
  const answer = pickAnimal(animals, askedSet);
  const format = (a: AnimalEntry) => `${a.emoji} ${capitalize(a.animal)}`;
  const wrongs = new Set<string>();
  const others = shuffle(animals.filter((a) => a !== answer && !nameFits(a, answer.baby)));
  for (const other of others) {
    wrongs.add(format(other));
    if (wrongs.size === 3) break;
  }
  return {
    explanation: `A baby ${answer.animal} is called ${an(answer.baby)}.`,
    prompt: `Which animal has a baby called ${an(answer.baby)}?`,
    dedupeKey: answer.animal,
    correctAnswer: format(answer),
    choices: shuffle([format(answer), ...wrongs]),
  };
}

function buildQuery(mode: BabyMode, firstLevel: boolean): string {
  const p = new URLSearchParams();
  if (mode !== 'all') p.set('mode', mode);
  if (firstLevel) p.set('level', '1');
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const babyAnimalsGame: QuizGameDefinition = {
  id: 'baby-animals',
  buildConfig(params) {
    const bank = unwrapCjs<BabyAnimalsBank>(rawAnimalsBank);
    const raw = params.get('mode');
    const mode: BabyMode = raw === 'baby' || raw === 'animal' ? raw : 'all';
    const firstLevel = params.get('level') === '1';
    const animals = firstLevel ? bank.ANIMALS.filter((a) => FAMILIAR.includes(a.animal)) : bank.ANIMALS;
    const totalQuestions = firstLevel ? 8 : 15;

    const labels: Record<BabyMode, string> = {
      all: 'Name the baby + find the animal',
      baby: 'What is the baby called?',
      animal: 'Which animal is the baby from?',
    };

    return {
      totalQuestions,
      timePerQuestion: 15,
      modeLabel: labels[mode],
      infoText: `${totalQuestions} questions • 15 seconds each • multiple choice`,
      instructions: 'A baby cow is a calf, a baby kangaroo is a joey… how many do you know? 🐮🦘',
      finishTitle: 'Quiz Complete!',
      mascot: '🐣',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-baby-animals-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('all', firstLevel), active: mode === 'all' },
            { label: 'Name the Baby', query: buildQuery('baby', firstLevel), active: mode === 'baby' },
            { label: 'Find the Animal', query: buildQuery('animal', firstLevel), active: mode === 'animal' },
          ],
        },
      ],
      generateQuestion(askedSet): QuizQuestion {
        const useBaby = mode === 'baby' || (mode === 'all' && randomInt(0, 1) === 0);
        return useBaby ? makeBabyQuestion(animals, askedSet) : makeAnimalQuestion(animals, askedSet);
      },
    };
  },
};
