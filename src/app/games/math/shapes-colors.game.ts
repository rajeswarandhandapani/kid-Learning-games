import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgShapes, pick, randomInt, shuffle } from './math-helpers';

const SHAPES = [
  { name: 'circle', emoji: '🔵' },
  { name: 'square', emoji: '🟦' },
  { name: 'triangle', emoji: '🔺' },
  { name: 'star', emoji: '⭐' },
  { name: 'heart', emoji: '❤️' },
  { name: 'diamond', emoji: '🔷' },
  { name: 'crescent', emoji: '🌙' },
] as const;

const POLYGONS = [
  { name: 'triangle', sides: 3 },
  { name: 'square', sides: 4 },
  { name: 'rectangle', sides: 4 },
  { name: 'pentagon', sides: 5 },
  { name: 'hexagon', sides: 6 },
  { name: 'octagon', sides: 8 },
] as const;

const COLORS = [
  { name: 'red', emoji: '🟥' },
  { name: 'orange', emoji: '🟧' },
  { name: 'yellow', emoji: '🟨' },
  { name: 'green', emoji: '🟩' },
  { name: 'blue', emoji: '🟦' },
  { name: 'purple', emoji: '🟪' },
  { name: 'brown', emoji: '🟫' },
  { name: 'black', emoji: '⬛' },
  { name: 'white', emoji: '⬜' },
] as const;

const COLOR_DOTS: Record<string, string> = {
  red: '🔴',
  orange: '🟠',
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  purple: '🟣',
  brown: '🟤',
  black: '⚫',
  white: '⚪',
};

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

const SHAPE_PICTURES: Record<string, string> = {
  Circle: '⚪',
  Square: '🟦',
  Triangle: '🔺',
  Star: '⭐',
  Heart: '❤️',
  Diamond: '🔷',
  Crescent: '🌙',
  Rectangle: '▭',
  Pentagon: '⬠',
  Hexagon: '⬡',
  Octagon: '🛑',
};

const ANSWER_PICTURES: Record<string, string> = {
  ...SHAPE_PICTURES,
  ...Object.fromEntries(COLORS.map(({ name, emoji }) => [capitalize(name), emoji])),
};

const OBJECT_SHAPES = [
  { thing: 'a ball ⚽', shape: 'circle' },
  { thing: 'a door 🚪', shape: 'rectangle' },
  { thing: 'a slice of pizza 🍕', shape: 'triangle' },
  { thing: 'a clock face 🕒', shape: 'circle' },
  { thing: 'a dice cube 🎲', shape: 'square' },
  { thing: 'a stop sign 🛑', shape: 'octagon' },
  { thing: 'a book cover 📕', shape: 'rectangle' },
  { thing: 'a party hat 🎉', shape: 'triangle' },
  { thing: 'a coin 🪙', shape: 'circle' },
  { thing: 'a window 🪟', shape: 'square' },
  { thing: 'a honeycomb cell 🍯', shape: 'hexagon' },
  { thing: 'a kite 🪁', shape: 'diamond' },
] as const;

const OBJECT_COLORS = [
  { thing: 'a banana 🍌', color: 'yellow' },
  { thing: 'grass 🌱', color: 'green' },
  { thing: 'the sky on a sunny day ☀️', color: 'blue' },
  { thing: 'a tomato 🍅', color: 'red' },
  { thing: 'an orange 🍊', color: 'orange' },
  { thing: 'a carrot 🥕', color: 'orange' },
  { thing: 'grapes 🍇', color: 'purple' },
  { thing: 'chocolate 🍫', color: 'brown' },
  { thing: 'snow ❄️', color: 'white' },
  { thing: 'the night sky 🌃', color: 'black' },
  { thing: 'a strawberry 🍓', color: 'red' },
  { thing: 'a leaf 🍃', color: 'green' },
  { thing: 'a school bus 🚌', color: 'yellow' },
  { thing: 'an eggplant 🍆', color: 'purple' },
] as const;

const SOLID_OBJECTS: Record<string, readonly string[]> = {
  cube: ['🎲', '🧊', '📦'],
  sphere: ['⚽', '🏀', '🌍'],
  cylinder: ['🥫', '🛢️'],
  cone: ['🍦'],
};
const SOLIDS = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'] as const;

function an(word: string): string {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

function wrongNames<T extends Record<string, string>>(pool: readonly T[], answer: string, key: keyof T): string[] {
  return shuffle(pool.filter((item) => item[key] !== answer))
    .filter((item, i, arr) => arr.findIndex((o) => o[key] === item[key]) === i)
    .slice(0, 3)
    .map((item) => item[key]);
}

function makeShapeQuestion(): QuizQuestion {
  const kind = randomInt(1, 3);
  if (kind === 1) {
    const answer = pick(SHAPES);
    return {
      prompt: `What shape is this?  ${answer.emoji}`,
      dedupeKey: 'name-' + answer.name,
      correctAnswer: capitalize(answer.name),
      choices: shuffle([capitalize(answer.name), ...wrongNames(SHAPES, answer.name, 'name').map(capitalize)]),
    };
  }
  if (kind === 2) {
    const answer = pick(SHAPES);
    const wrongs = shuffle(SHAPES.filter((s) => s.name !== answer.name)).slice(0, 3);
    return {
      prompt: `Which one is ${an(answer.name)}?`,
      dedupeKey: 'find-' + answer.name,
      correctAnswer: answer.emoji,
      choices: shuffle([answer.emoji, ...wrongs.map((s) => s.emoji)]),
    };
  }
  const item = pick(OBJECT_SHAPES);
  const allNames = [...new Set([...SHAPES.map((s) => s.name), ...POLYGONS.map((p) => p.name)])];
  const wrongs = shuffle(allNames.filter((n) => n !== item.shape)).slice(0, 3);
  return {
    prompt: `What shape is ${item.thing}?`,
    dedupeKey: 'object-' + item.thing,
    correctAnswer: capitalize(item.shape),
    choices: shuffle([capitalize(item.shape), ...wrongs.map(capitalize)]),
  };
}

function makeColorQuestion(): QuizQuestion {
  const kind = randomInt(1, 3);
  if (kind === 1) {
    const answer = pick(COLORS);
    return {
      prompt: `What color is this?  ${COLOR_DOTS[answer.name]}`,
      dedupeKey: 'color-' + answer.name,
      correctAnswer: capitalize(answer.name),
      choices: shuffle([capitalize(answer.name), ...wrongNames(COLORS, answer.name, 'name').map(capitalize)]),
    };
  }
  if (kind === 2) {
    const answer = pick(COLORS);
    const wrongs = shuffle(COLORS.filter((c) => c.name !== answer.name)).slice(0, 3);
    return {
      prompt: `Which one is ${answer.name}?`,
      dedupeKey: 'findcolor-' + answer.name,
      correctAnswer: answer.emoji,
      choices: shuffle([answer.emoji, ...wrongs.map((c) => c.emoji)]),
    };
  }
  const item = pick(OBJECT_COLORS);
  const wrongs = shuffle(COLORS.filter((c) => c.name !== item.color)).slice(0, 3);
  return {
    prompt: `What color is ${item.thing}?`,
    dedupeKey: 'objcolor-' + item.thing,
    correctAnswer: capitalize(item.color),
    choices: shuffle([capitalize(item.color), ...wrongs.map((c) => capitalize(c.name))]),
  };
}

function makeSidesQuestion(): QuizQuestion {
  const kind = randomInt(1, 6);
  if (kind === 6) {
    return {
      prompt: 'Which shape has no corners at all?',
      dedupeKey: 'no-corners',
      correctAnswer: 'Circle',
      choices: shuffle(['Circle', 'Triangle', 'Square', 'Hexagon']),
    };
  }
  const shape = pick(POLYGONS);
  const word = kind <= 3 ? 'sides' : 'corners';
  const wrongs = shuffle([2, 3, 4, 5, 6, 7, 8, 10].filter((n) => n !== shape.sides)).slice(0, 3);
  return {
    visual: () => klgShapes()?.polygon(shape.name) || null,
    explanation: `A ${shape.name} has ${shape.sides} sides and ${shape.sides} corners.`,
    prompt: `How many ${word} does ${an(shape.name)} have?`,
    dedupeKey: `${word}-${shape.name}`,
    correctAnswer: shape.sides,
    choices: shuffle([shape.sides, ...wrongs]),
  };
}

function makeSolidQuestion(): QuizQuestion {
  const kind = randomInt(1, 4);
  if (kind <= 2) {
    const name = pick(SOLIDS);
    return {
      visual: () => klgShapes()?.solid(name, { label: 'A 3D shape' }) || null,
      prompt: 'What 3D shape is this?',
      dedupeKey: 'solid-' + name,
      explanation: `It is a ${name}.`,
      correctAnswer: capitalize(name),
      choices: shuffle([capitalize(name), ...shuffle(SOLIDS.filter((s) => s !== name)).slice(0, 3).map(capitalize)]),
    };
  }
  if (kind === 3) {
    const name = pick(['cube', 'sphere', 'cylinder'] as const);
    const object = pick(SOLID_OBJECTS[name]);
    const wrongs = shuffle(['cube', 'sphere', 'cylinder', 'cone'].filter((s) => s !== name))
      .slice(0, 3)
      .map((s) => pick(SOLID_OBJECTS[s]));
    return {
      visual: () => klgShapes()?.solid(name) || null,
      prompt: `Which one is shaped like this ${name}?`,
      dedupeKey: 'obj-' + name + object,
      explanation: `${object} is shaped like a ${name}.`,
      correctAnswer: object,
      choices: shuffle([object, ...wrongs]),
    };
  }
  const [prop, count] = pick([
    ['faces', 6],
    ['edges', 12],
    ['corners', 8],
  ] as const);
  const wrongs = shuffle([4, 5, 6, 8, 10, 12, 14].filter((n) => n !== count)).slice(0, 3);
  return {
    visual: () => klgShapes()?.solid('cube') || null,
    prompt: `How many ${prop} does a cube have?`,
    dedupeKey: 'cube-' + prop,
    explanation: 'A cube has 6 faces, 12 edges and 8 corners.',
    correctAnswer: count,
    choices: shuffle([count, ...wrongs]),
  };
}

export const shapesColorsGame: QuizGameDefinition = {
  id: 'shapes-colors',
  buildConfig(params) {
    const raw = params.get('mode');
    const mode = raw && ['shape', 'color', 'sides', 'solid'].includes(raw) ? raw : 'all';
    const labels: Record<string, string> = {
      all: 'Shapes, colors, sides & corners',
      shape: 'Name and find the shapes',
      color: 'Name and find the colors',
      sides: 'How many sides and corners?',
      solid: 'Cubes, spheres, cones and cylinders',
    };

    return {
      totalQuestions: 12,
      timePerQuestion: 20,
      bigChoices: false,
      modeLabel: labels[mode],
      infoText: '12 questions • 20 seconds each • tap the answer',
      instructions: 'Circles, squares, triangles and every color of the rainbow 🌈 — look carefully and tap what you see!',
      finishTitle: 'Quiz Complete!',
      bestTimeKey: `klg-shapes-colors-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: 'Name the Shape', query: 'mode=shape', active: mode === 'shape' },
            { label: 'Name the Color', query: 'mode=color', active: mode === 'color' },
            { label: '🧊 3D shapes', query: 'mode=solid', active: mode === 'solid' },
            { label: 'Sides & Corners', query: 'mode=sides', active: mode === 'sides' },
          ],
        },
      ],
      generateQuestion(): QuizQuestion {
        const kind = mode === 'all' ? pick(['shape', 'color', 'shape', 'color', 'sides', 'solid']) : mode;
        const question =
          kind === 'shape'
            ? makeShapeQuestion()
            : kind === 'color'
              ? makeColorQuestion()
              : kind === 'solid'
                ? makeSolidQuestion()
                : makeSidesQuestion();
        if (!String(question.dedupeKey || '').startsWith('name-')) {
          question.choiceDisplay = ANSWER_PICTURES;
        }
        return question;
      },
    };
  },
};
