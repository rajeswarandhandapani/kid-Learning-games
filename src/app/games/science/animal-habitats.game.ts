import * as rawHabitatsBank from '../../../../games/animal-habitats/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgScene, pick, shuffle, unwrapCjs } from '../math/math-helpers';

type HabitatRow = readonly [string, string, string, string, (readonly string[])?];

interface HabitatsBank {
  HABITATS: readonly HabitatRow[];
  HABITATS_2: readonly HabitatRow[];
}

const SCENE_FOR: Record<string, string> = {
  Desert: 'desert',
  Ocean: 'ocean',
  Arctic: 'arctic',
  Antarctica: 'arctic',
  Forest: 'forest',
  Rainforest: 'rainforest',
  Grassland: 'grassland',
  Pond: 'pond',
  'Coral reef': 'reef',
  Cave: 'cave',
};

const NEUTRAL: Record<string, ReadonlyArray<{ e: string; x: number; y: number; size: number }>> = {
  Desert: [{ e: '🌵', x: 10, y: 30, size: 2.6 }, { e: '☀️', x: 70, y: 4, size: 2.4 }, { e: '🏜️', x: 44, y: 48, size: 2 }],
  Ocean: [{ e: '🌊', x: 10, y: 30, size: 2.4 }, { e: '⛵', x: 50, y: 10, size: 2.4 }, { e: '🫧', x: 76, y: 50, size: 1.8 }],
  Arctic: [{ e: '❄️', x: 14, y: 8, size: 2 }, { e: '🧊', x: 60, y: 46, size: 2.4 }, { e: '⛄', x: 30, y: 34, size: 2.4 }],
  Antarctica: [{ e: '❄️', x: 14, y: 8, size: 2 }, { e: '🏔️', x: 50, y: 20, size: 2.8 }, { e: '🧊', x: 76, y: 50, size: 2 }],
  Forest: [{ e: '🌲', x: 8, y: 20, size: 3 }, { e: '🌳', x: 56, y: 18, size: 3.2 }, { e: '🍄', x: 34, y: 56, size: 1.8 }],
  Rainforest: [{ e: '🌴', x: 8, y: 18, size: 3.2 }, { e: '🌿', x: 50, y: 44, size: 2.2 }, { e: '🌺', x: 74, y: 50, size: 2 }],
  Grassland: [{ e: '🌾', x: 10, y: 40, size: 2.6 }, { e: '🌼', x: 50, y: 56, size: 1.8 }, { e: '☀️', x: 74, y: 4, size: 2.4 }],
  Pond: [{ e: '🪷', x: 20, y: 46, size: 2.2 }, { e: '🌿', x: 60, y: 14, size: 2.2 }, { e: '💧', x: 44, y: 30, size: 1.8 }],
  'Coral reef': [{ e: '🐚', x: 16, y: 56, size: 2 }, { e: '🌿', x: 60, y: 40, size: 2.2 }, { e: '🫧', x: 40, y: 14, size: 1.8 }],
  Cave: [{ e: '🪨', x: 18, y: 50, size: 2.4 }, { e: '⛰️', x: 46, y: 16, size: 3 }, { e: '🕯️', x: 76, y: 46, size: 2 }],
};

const CONFLICTS: Record<string, readonly string[]> = {
  Arctic: ['Antarctica'],
  Antarctica: ['Arctic'],
  Ocean: ['Coral reef'],
  'Coral reef': ['Ocean'],
  Forest: ['Rainforest'],
  Rainforest: ['Forest'],
};

const withArticle = (name: string) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;

function habitatChoice(place: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-choice';
  const sceneVis = klgScene();
  if (sceneVis) {
    const scene = sceneVis.preset(SCENE_FOR[place], { height: 78, label: place, items: NEUTRAL[place] });
    scene.removeAttribute('role');
    scene.removeAttribute('aria-label');
    box.appendChild(scene);
  }
  const text = document.createElement('div');
  text.className = 'kv-choice-text';
  text.textContent = place;
  box.appendChild(text);
  return box;
}

function animalPicture(emoji: string, animal: string): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-clue';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', withArticle(animal));
  f.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
  return f;
}

export const animalHabitatsGame: QuizGameDefinition = {
  id: 'animal-habitats',
  buildConfig(params) {
    const bank = unwrapCjs<HabitatsBank>(rawHabitatsBank);
    const habitats = params.get('level') === '2' ? bank.HABITATS_2 : bank.HABITATS;
    const allPlaces = [...new Set(habitats.map((row) => row[2]))];

    return {
      totalQuestions: 10,
      timePerQuestion: 25,
      infoText: 'Explore forests, oceans, deserts, and polar places. Learn why each animal belongs there.',
      instructions: 'Look at the animal and pick the home where it belongs.',
      finishTitle: 'Great exploring!',
      mascot: '🦊',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      generateQuestion(askedSet): QuizQuestion {
        const available = habitats.filter((row) => !askedSet.has(row[1]));
        const [emoji, animal, correct, explanation, alsoFair = []] = pick(available.length ? available : habitats);
        const blocked = CONFLICTS[correct] || [];
        const also = alsoFair || [];
        const others = shuffle(
          allPlaces.filter((place) => place !== correct && !blocked.includes(place) && !also.includes(place))
        ).slice(0, 3);
        const choices = shuffle([correct, ...others]);
        const choiceVisuals: Record<string, () => HTMLElement> = {};
        const choiceLabels: Record<string, string> = {};
        choices.forEach((place) => {
          choiceVisuals[place] = () => habitatChoice(place);
          choiceLabels[place] = place;
        });
        return {
          visual: () => animalPicture(emoji, animal),
          prompt: `Where would you find ${withArticle(animal)}?`,
          reviewPrompt: `${emoji} Where would you find ${withArticle(animal)}?`,
          dedupeKey: animal,
          correctAnswer: correct,
          choices,
          explanation,
          choiceVisuals,
          choiceLabels,
          noChoiceListen: true,
        };
      },
    };
  },
};
