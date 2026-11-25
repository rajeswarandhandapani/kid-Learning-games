import * as rawSolarBank from '../../../../games/solar-system/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, randomInt, shuffle, unwrapCjs } from '../math/math-helpers';

type SolarMode = 'all' | 'order' | 'facts';

interface SolarFact {
  q: string;
  a: string;
  wrong: readonly string[];
}

interface SolarBank {
  FACTS: readonly SolarFact[];
}

const PLANETS: ReadonlyArray<{ name: string; emoji: string }> = [
  { name: 'Mercury', emoji: '🌑' },
  { name: 'Venus', emoji: '🟠' },
  { name: 'Earth', emoji: '🌍' },
  { name: 'Mars', emoji: '🔴' },
  { name: 'Jupiter', emoji: '🟤' },
  { name: 'Saturn', emoji: '🪐' },
  { name: 'Uranus', emoji: '🔵' },
  { name: 'Neptune', emoji: '🔷' },
];

const LOOK: Record<string, { s: number; c: string; ring?: boolean }> = {
  Mercury: { s: 14, c: '#9a8f87' },
  Venus: { s: 24, c: '#e6b36a' },
  Earth: { s: 25, c: '#4a90d9' },
  Mars: { s: 18, c: '#c1553b' },
  Jupiter: { s: 54, c: '#d2a679' },
  Saturn: { s: 46, c: '#e3cf9c', ring: true },
  Uranus: { s: 36, c: '#8fd6d8' },
  Neptune: { s: 35, c: '#4a5fd1' },
};

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function disc(name: string): HTMLSpanElement {
  const look = LOOK[name];
  const d = document.createElement('span');
  d.className = 'kv-planet' + (look.ring ? ' ring' : '');
  d.style.setProperty('--s', `${look.s}px`);
  d.style.setProperty('--c', look.c);
  d.setAttribute('aria-hidden', 'true');
  return d;
}

function strip({
  named = [],
  mark = [],
  numbers = false,
  label,
}: {
  named?: readonly string[];
  mark?: readonly number[];
  numbers?: boolean;
  label?: string;
}): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-solar';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', label || 'The Sun and the eight planets in order from the Sun');
  const sun = document.createElement('span');
  sun.className = 'kv-sun';
  sun.setAttribute('aria-hidden', 'true');
  sun.textContent = '☀️';
  f.appendChild(sun);
  PLANETS.forEach((p, i) => {
    const cell = document.createElement('span');
    cell.className = 'kv-pcell' + (mark.includes(i) ? ' marked' : '');
    cell.setAttribute('aria-hidden', 'true');
    cell.dataset['planet'] = p.name;
    const slot = document.createElement('span');
    slot.className = 'kv-pslot';
    slot.appendChild(disc(p.name));
    const cap = document.createElement('span');
    cap.className = 'kv-pname';
    cap.textContent = named.includes(p.name) ? p.name : numbers ? String(i + 1) : '';
    cell.append(slot, cap);
    f.appendChild(cell);
  });
  return f;
}

function planetChoice(name: string, showName = true): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-choice kv-pchoice';
  box.appendChild(disc(name));
  const text = document.createElement('div');
  text.className = 'kv-choice-text';
  text.textContent = showName ? name : '';
  box.appendChild(text);
  return box;
}

function withPlanetPictures(q: QuizQuestion, names: readonly string[], showName = true): QuizQuestion {
  const visuals: Record<string, () => HTMLElement> = {};
  const labels: Record<string, string> = {};
  names.forEach((n) => {
    visuals[n] = () => planetChoice(n, showName);
    labels[n] = n;
  });
  q.choiceVisuals = visuals;
  q.choiceLabels = labels;
  q.noChoiceListen = true;
  return q;
}

function makePictureQuestion(): QuizQuestion {
  const answer = pick(PLANETS);
  const wrongs = shuffle(PLANETS.filter((p) => p !== answer)).slice(0, 3);
  const names = shuffle([answer.name, ...wrongs.map((p) => p.name)]);
  return withPlanetPictures(
    {
      prompt: `Which picture is ${answer.name}?`,
      dedupeKey: `pic-${answer.name}`,
      explanation: `${answer.name} looks like this. Look at its size and colour.`,
      correctAnswer: answer.name,
      choices: names,
    },
    names,
    false
  );
}

function makeOrderQuestion(): QuizQuestion {
  const kind = randomInt(0, 4);
  if (kind === 0) return makePictureQuestion();

  if (kind === 1) {
    const index = randomInt(0, 7);
    const answer = PLANETS[index];
    const wrongs = shuffle(PLANETS.filter((p) => p !== answer)).slice(0, 3);
    const names = shuffle([answer.name, ...wrongs.map((p) => p.name)]);
    return withPlanetPictures(
      {
        visual: () =>
          strip({
            mark: [index],
            numbers: true,
            label: `The Sun and the eight planets in order. The ${ORDINALS[index]} planet is circled.`,
          }),
        prompt: `Which planet is ${ORDINALS[index]} from the Sun?`,
        dedupeKey: `pos-${index}`,
        explanation: `Counting out from the Sun, ${answer.name} is ${ORDINALS[index]}.`,
        correctAnswer: answer.name,
        choices: names,
      },
      names
    );
  }

  if (kind === 2) {
    const index = randomInt(0, 7);
    const planet = PLANETS[index];
    return {
      visual: () =>
        strip({
          mark: [index],
          named: [planet.name],
          label: `The Sun and the eight planets in order. ${planet.name} is circled.`,
        }),
      explanation: `${planet.name} is ${ORDINALS[index]} from the Sun.`,
      prompt: `How far from the Sun is ${planet.name}?`,
      dedupeKey: `ord-${index}`,
      correctAnswer: ORDINALS[index],
      choices: shuffle([ORDINALS[index], ...shuffle(ORDINALS.filter((o) => o !== ORDINALS[index])).slice(0, 3)]),
    };
  }

  if (kind === 3) {
    const index = randomInt(0, 6);
    const planet = PLANETS[index];
    const answer = PLANETS[index + 1];
    const wrongs = shuffle(PLANETS.filter((p) => p !== answer && p !== planet)).slice(0, 3);
    const names = shuffle([answer.name, ...wrongs.map((p) => p.name)]);
    return withPlanetPictures(
      {
        visual: () =>
          strip({
            mark: [index],
            named: [planet.name],
            numbers: false,
            label: `The Sun and the eight planets in order. ${planet.name} is circled.`,
          }),
        prompt: `Which planet comes right after ${planet.name}, moving away from the Sun?`,
        dedupeKey: `after-${index}`,
        explanation: `${answer.name} comes right after ${planet.name}.`,
        correctAnswer: answer.name,
        choices: names,
      },
      names
    );
  }

  const [a, b] = shuffle(PLANETS).slice(0, 2);
  const idxA = PLANETS.indexOf(a);
  const idxB = PLANETS.indexOf(b);
  const closer = idxA < idxB ? a : b;
  return {
    visual: () =>
      strip({
        mark: [idxA, idxB],
        named: [a.name, b.name],
        label: `The Sun and the eight planets in order. ${a.name} and ${b.name} are circled.`,
      }),
    explanation: `${closer.name} is closer to the Sun.`,
    prompt: `Which planet is closer to the Sun: ${a.name} or ${b.name}?`,
    dedupeKey: `closer-${[a.name, b.name].sort().join('-')}`,
    correctAnswer: closer.name,
    choices: shuffle([a.name, b.name]),
  };
}

function makeFactQuestion(facts: readonly SolarFact[]): QuizQuestion {
  const fact = pick(facts);
  return {
    prompt: fact.q,
    dedupeKey: `fact-${fact.a}${fact.q}`,
    correctAnswer: fact.a,
    choices: shuffle([fact.a, ...fact.wrong]),
  };
}

export const solarSystemGame: QuizGameDefinition = {
  id: 'solar-system',
  buildConfig(params) {
    const bank = unwrapCjs<SolarBank>(rawSolarBank);
    const raw = params.get('mode');
    const mode: SolarMode = raw === 'order' || raw === 'facts' ? raw : 'all';

    const labels: Record<SolarMode, string> = {
      all: 'Planet order and space facts',
      order: 'Where are the planets?',
      facts: 'Space facts and firsts',
    };

    return {
      totalQuestions: 15,
      timePerQuestion: 25,
      modeLabel: labels[mode],
      infoText: '15 questions • 25 seconds each • multiple choice',
      instructions: 'Blast off! 🚀 Eight planets, one star and a whole lot of moons — how much of space do you know?',
      finishTitle: 'Quiz Complete!',
      mascot: '🪐',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-solar-system-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: 'Planet Order', query: 'mode=order', active: mode === 'order' },
            { label: 'Space Facts', query: 'mode=facts', active: mode === 'facts' },
          ],
        },
      ],
      generateQuestion: () => {
        const kind = mode === 'all' ? pick(['order', 'facts', 'facts'] as const) : mode;
        return kind === 'order' ? makeOrderQuestion() : makeFactQuestion(bank.FACTS);
      },
    };
  },
};
