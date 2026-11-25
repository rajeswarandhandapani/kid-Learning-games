import * as rawScienceBank from '../../../../games/science-quiz/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, shuffle, unwrapCjs } from '../math/math-helpers';

type ScienceTopic = 'animals' | 'body' | 'plants' | 'matter';
type ScienceMode = 'all' | ScienceTopic;

interface ScienceEntry {
  q: string;
  a: string;
  wrong: readonly string[];
}

interface ScienceBank {
  BANK: Record<ScienceTopic, readonly ScienceEntry[]>;
  EASY: Record<ScienceTopic, readonly number[]>;
}

const CLUES: ReadonlyArray<readonly [string, string]> = [
  ['What do we call animals that eat only plants', '🐄🌿'],
  ['What do we call animals that eat only meat', '🦁🥩'],
  ['How do fish breathe', '🐟💧'],
  ['A caterpillar changes', '🐛➡️❓'],
  ['What do many baby animals grow inside', '🥚🐣'],
  ['Which animal sleeps through the winter', '❄️💤'],
  ['Which animal changes color', '🌿🎨'],
  ['How many senses', '👀👂👃👅✋'],
  ['Which body part digests', '🍽️'],
  ['What holds your body up', '🧍'],
  ['How many teeth', '🦷'],
  ['Which food group helps', '💪🥚🫘'],
  ['Which part of your body protects your brain', '🧠'],
  ['How many bones', '🦴🦴🦴'],
  ['Which part of a plant makes food', '☀️🌱'],
  ['What do plants need', '🌱☀️💧'],
  ['What gas do plants give out', '🌳💨'],
  ['Which part of the plant holds it up', '🌻'],
  ['Where do most plants get their water', '🌧️🌱'],
  ['What do we call a tree that keeps', '🌲'],
  ['Why do leaves look green', '🍃'],
  ['What are the three states of matter', '🧊💧♨️'],
  ['Water boiling', '🍲🔥'],
  ['Which of these is a liquid', '💧'],
  ['Which of these floats', '🌊'],
  ['What pulls everything down', '🍎⬇️'],
  ['Sound travels', '🔔🔊'],
  ['What do we call the water cycle', '☀️💧⬆️'],
];

const ANSWER_PICS: Record<string, string> = {
  Chicken: '🐔', Cow: '🐄', Dog: '🐕', Cat: '🐈', 'Blue whale': '🐋', Elephant: '🐘', Giraffe: '🦒', Shark: '🦈',
  Bear: '🐻', Lion: '🦁', Horse: '🐴', Monkey: '🐒', Chameleon: '🦎', Zebra: '🦓', Kangaroo: '🦘',
  Honey: '🍯', Milk: '🥛', Silk: '🧵', Butter: '🧈', Carrot: '🥕', Apple: '🍎', Lettuce: '🥬', Pea: '🫛',
  Snow: '❄️', Fog: '🌫️', Dew: '💧', Steam: '♨️', 'A rainbow': '🌈', 'A cloud': '☁️', 'The moon': '🌙', 'A star': '⭐',
  'The heart': '🫀', 'The brain': '🧠', 'The lungs': '🫁', 'The stomach': '🫃', 'The liver': '🍖', 'The kidneys': '🫘', 'The muscles': '💪',
  'Our nose': '👃', 'Our ears': '👂', 'Our tongue': '👅', 'Our eyes': '👀', 'Our fingers': '✋',
  'A thermometer': '🌡️', 'A ruler': '📏', 'A clock': '⏰', 'A scale': '⚖️',
  'The Sun': '☀️', 'The Moon': '🌙', 'A mirror': '🪞', 'A window': '🪟',
  'A wooden stick': '🪵', 'A metal key': '🔑', 'A stone': '🪨', 'A coin': '🪙', 'A brick': '🧱', 'A pillow': '🛏️', 'A spoon': '🥄',
  'The bee': '🐝', 'The ant': '🐜', 'The fly': '🪰', 'The beetle': '🪲', Butterfly: '🦋', Bee: '🐝', Bird: '🐦', Beetle: '🪲',
};

const PICTOGRAPH = /\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*/gu;

function clueFor(entry: ScienceEntry): string {
  const inText = entry.q.match(PICTOGRAPH);
  if (inText) return inText.join('');
  const found = CLUES.find(([start]) => entry.q.startsWith(start));
  return found ? found[1] : '';
}

function clueFigure(emoji: string): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-clue';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', 'Picture clue');
  f.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
  return f;
}

function answerChoiceBox(emoji: string, label: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-choice';
  box.innerHTML = `<span class="kv-emoji" aria-hidden="true">${emoji}</span><span class="kv-choice-text">${label}</span>`;
  return box;
}

function buildQuery(mode: ScienceMode, firstLevel: boolean): string {
  const p = new URLSearchParams();
  if (mode !== 'all') p.set('mode', mode);
  if (firstLevel) p.set('level', '1');
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const scienceQuizGame: QuizGameDefinition = {
  id: 'science-quiz',
  buildConfig(params) {
    const rawBank = unwrapCjs<ScienceBank>(rawScienceBank);
    const firstLevel = params.get('level') === '1';
    const bank = Object.fromEntries(
      (Object.keys(rawBank.BANK) as ScienceTopic[]).map((topic) => [
        topic,
        firstLevel ? rawBank.EASY[topic].map((i) => rawBank.BANK[topic][i]) : rawBank.BANK[topic],
      ])
    ) as Record<ScienceTopic, readonly ScienceEntry[]>;
    const topics: readonly ScienceTopic[] = ['animals', 'body', 'plants', 'matter'];

    const raw = params.get('mode');
    const mode: ScienceMode = topics.includes(raw as ScienceTopic) ? (raw as ScienceTopic) : 'all';
    const totalQuestions = mode === 'all' ? 15 : Math.min(10, bank[mode].length);

    const labels: Record<ScienceMode, string> = {
      all: 'Animals, bodies, plants, matter & weather',
      animals: 'Animal groups and how they live',
      body: 'How your body works',
      plants: 'How plants grow and feed',
      matter: 'Matter, weather and forces',
    };

    return {
      totalQuestions,
      timePerQuestion: 25,
      modeLabel: labels[mode],
      infoText: `${totalQuestions} questions • 25 seconds each • multiple choice`,
      instructions: 'Why do plants need sun? What is ice made of? Time to think like a scientist. 🧪',
      finishTitle: 'Quiz Complete!',
      mascot: '🔬',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-science-quiz-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: buildQuery('all', firstLevel), active: mode === 'all' },
            { label: 'Animals', query: buildQuery('animals', firstLevel), active: mode === 'animals' },
            { label: 'My Body', query: buildQuery('body', firstLevel), active: mode === 'body' },
            { label: 'Plants', query: buildQuery('plants', firstLevel), active: mode === 'plants' },
            { label: 'Matter & Weather', query: buildQuery('matter', firstLevel), active: mode === 'matter' },
          ],
        },
      ],
      generateQuestion(): QuizQuestion {
        const topic = mode === 'all' ? pick(topics) : mode;
        const entry = pick(bank[topic]);
        const choices = shuffle([entry.a, ...entry.wrong]);
        let emoji = clueFor(entry);
        if (ANSWER_PICS[entry.a] && emoji.includes(ANSWER_PICS[entry.a])) emoji = '❓';
        const q: QuizQuestion = {
          visual: emoji ? () => clueFigure(emoji) : null,
          prompt: entry.q.replace(PICTOGRAPH, '').replace(/\s+([?.])/g, '$1').trim(),
          reviewPrompt: entry.q,
          dedupeKey: entry.a + entry.q,
          correctAnswer: entry.a,
          choices,
          explanation: `The answer is ${entry.a}.`,
        };
        if (choices.every((c) => ANSWER_PICS[c])) {
          const choiceVisuals: Record<string, () => HTMLElement> = {};
          const choiceLabels: Record<string, string> = {};
          choices.forEach((c) => {
            choiceVisuals[c] = () => answerChoiceBox(ANSWER_PICS[c], c);
            choiceLabels[c] = c;
          });
          q.choiceVisuals = choiceVisuals;
          q.choiceLabels = choiceLabels;
        }
        return q;
      },
    };
  },
};
