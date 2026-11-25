import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, randomInt, shuffle } from '../math/math-helpers';

type AlphabetMode = 'listen' | 'case' | 'order' | 'phonics';

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

const NAME_RHYME_GROUPS: readonly string[][] = [
  ['B', 'C', 'D', 'E', 'G', 'P', 'T', 'V', 'Z'],
  ['A', 'J', 'K'],
  ['F', 'L', 'M', 'N', 'S', 'X'],
  ['I', 'Y'],
  ['Q', 'U', 'W'],
];

const NAME_RHYMES: Record<string, string[]> = {};
NAME_RHYME_GROUPS.forEach((group) => {
  group.forEach((letter) => {
    NAME_RHYMES[letter] = group.filter((other) => other !== letter);
  });
});

const LOWER_LOOKALIKES: Record<string, string> = {
  a: 'oce', b: 'dpq', c: 'eoa', d: 'bqp', e: 'cao', f: 'tlk', g: 'qpy',
  h: 'nbk', i: 'ljt', j: 'igy', k: 'hxf', l: 'itj', m: 'nwu', n: 'muh',
  o: 'ace', p: 'qbd', q: 'pgb', r: 'nvm', s: 'zce', t: 'fli', u: 'vnw',
  v: 'uwy', w: 'mvu', x: 'kyz', y: 'gvj', z: 'sxr',
};

const UPPER_LOOKALIKES: Record<string, string> = {
  A: 'HVM', B: 'RPD', C: 'GOQ', D: 'OBQ', E: 'FBL', F: 'EPT', G: 'CQO',
  H: 'NMK', I: 'LJT', J: 'ILU', K: 'XRH', L: 'IJT', M: 'NWH', N: 'MHZ',
  O: 'QCD', P: 'RBF', Q: 'OGC', R: 'PBK', S: 'ZCG', T: 'IFY', U: 'VWJ',
  V: 'UWY', W: 'MVU', X: 'KYZ', Y: 'VTX', Z: 'SNX',
};

const PHONICS_WORDS: ReadonlyArray<{ letter: string; word: string; emoji: string }> = [
  { letter: 'A', word: 'apple', emoji: '🍎' },
  { letter: 'B', word: 'banana', emoji: '🍌' },
  { letter: 'C', word: 'cat', emoji: '🐱' },
  { letter: 'D', word: 'dog', emoji: '🐶' },
  { letter: 'E', word: 'egg', emoji: '🥚' },
  { letter: 'F', word: 'fish', emoji: '🐟' },
  { letter: 'G', word: 'grapes', emoji: '🍇' },
  { letter: 'H', word: 'house', emoji: '🏠' },
  { letter: 'I', word: 'ice cream', emoji: '🍦' },
  { letter: 'J', word: 'juice', emoji: '🧃' },
  { letter: 'K', word: 'kite', emoji: '🪁' },
  { letter: 'L', word: 'lion', emoji: '🦁' },
  { letter: 'M', word: 'moon', emoji: '🌙' },
  { letter: 'N', word: 'nose', emoji: '👃' },
  { letter: 'O', word: 'octopus', emoji: '🐙' },
  { letter: 'P', word: 'pizza', emoji: '🍕' },
  { letter: 'Q', word: 'queen', emoji: '👸' },
  { letter: 'R', word: 'rainbow', emoji: '🌈' },
  { letter: 'S', word: 'sun', emoji: '☀️' },
  { letter: 'T', word: 'tiger', emoji: '🐯' },
  { letter: 'U', word: 'umbrella', emoji: '☂️' },
  { letter: 'V', word: 'violin', emoji: '🎻' },
  { letter: 'W', word: 'whale', emoji: '🐳' },
  { letter: 'X', word: 'x-ray', emoji: '🩻' },
  { letter: 'Y', word: 'yo-yo', emoji: '🪀' },
  { letter: 'Z', word: 'zebra', emoji: '🦓' },
  { letter: 'A', word: 'ant', emoji: '🐜' },
  { letter: 'A', word: 'alligator', emoji: '🐊' },
  { letter: 'B', word: 'ball', emoji: '⚽' },
  { letter: 'B', word: 'bee', emoji: '🐝' },
  { letter: 'B', word: 'bus', emoji: '🚌' },
  { letter: 'C', word: 'cow', emoji: '🐄' },
  { letter: 'C', word: 'cake', emoji: '🎂' },
  { letter: 'C', word: 'car', emoji: '🚗' },
  { letter: 'D', word: 'duck', emoji: '🦆' },
  { letter: 'D', word: 'drum', emoji: '🥁' },
  { letter: 'E', word: 'elephant', emoji: '🐘' },
  { letter: 'E', word: 'eagle', emoji: '🦅' },
  { letter: 'F', word: 'frog', emoji: '🐸' },
  { letter: 'F', word: 'fire', emoji: '🔥' },
  { letter: 'F', word: 'flower', emoji: '🌸' },
  { letter: 'G', word: 'goat', emoji: '🐐' },
  { letter: 'G', word: 'gift', emoji: '🎁' },
  { letter: 'G', word: 'guitar', emoji: '🎸' },
  { letter: 'H', word: 'hat', emoji: '🎩' },
  { letter: 'H', word: 'horse', emoji: '🐴' },
  { letter: 'I', word: 'iguana', emoji: '🦎' },
  { letter: 'J', word: 'jet', emoji: '✈️' },
  { letter: 'J', word: 'jellyfish', emoji: '🪼' },
  { letter: 'K', word: 'key', emoji: '🔑' },
  { letter: 'K', word: 'kangaroo', emoji: '🦘' },
  { letter: 'L', word: 'leaf', emoji: '🍃' },
  { letter: 'L', word: 'lemon', emoji: '🍋' },
  { letter: 'M', word: 'mouse', emoji: '🐭' },
  { letter: 'M', word: 'monkey', emoji: '🐵' },
  { letter: 'M', word: 'mango', emoji: '🥭' },
  { letter: 'N', word: 'nest', emoji: '🪺' },
  { letter: 'N', word: 'nut', emoji: '🥜' },
  { letter: 'O', word: 'owl', emoji: '🦉' },
  { letter: 'O', word: 'orange', emoji: '🍊' },
  { letter: 'P', word: 'pig', emoji: '🐖' },
  { letter: 'P', word: 'panda', emoji: '🐼' },
  { letter: 'P', word: 'pear', emoji: '🍐' },
  { letter: 'R', word: 'robot', emoji: '🤖' },
  { letter: 'R', word: 'rose', emoji: '🌹' },
  { letter: 'S', word: 'snake', emoji: '🐍' },
  { letter: 'S', word: 'star', emoji: '⭐' },
  { letter: 'S', word: 'sock', emoji: '🧦' },
  { letter: 'T', word: 'tree', emoji: '🌳' },
  { letter: 'T', word: 'train', emoji: '🚆' },
  { letter: 'T', word: 'turtle', emoji: '🐢' },
  { letter: 'V', word: 'van', emoji: '🚐' },
  { letter: 'W', word: 'watch', emoji: '⌚' },
  { letter: 'W', word: 'watermelon', emoji: '🍉' },
  { letter: 'Y', word: 'yarn', emoji: '🧶' },
];

const SAME_SOUND: Record<string, string> = { C: 'KQS', K: 'CQ', Q: 'CK', S: 'C', G: 'J', J: 'G' };
const CASE_KEYS = LETTERS.flatMap((l) => [`U2L:${l}`, `L2U:${l}`]);

function pickDistractors(preferred: readonly string[], pool: readonly string[], answer: string): string[] {
  const wrongs = new Set<string>();
  for (const c of shuffle(preferred)) {
    if (c !== answer) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = pick(pool);
    if (r !== answer) wrongs.add(r);
  }
  return [...wrongs];
}

function pickUnasked(keys: readonly string[], askedSet: Set<string | number>): string {
  const available = keys.filter((k) => !askedSet.has(k));
  const pool = available.length ? available : keys;
  return pick(pool);
}

function generateListenQuestion(askedSet: Set<string | number>, hasSpeech: boolean): QuizQuestion {
  const letter = pickUnasked(LETTERS, askedSet);
  return {
    prompt: hasSpeech ? '🔊' : letter.toLowerCase(),
    promptTappable: hasSpeech,
    speechPrompt: hasSpeech ? letter : undefined,
    speechRate: 0.8,
    dedupeKey: letter,
    correctAnswer: letter,
    choices: shuffle([letter, ...pickDistractors(NAME_RHYMES[letter] || [], LETTERS, letter)]),
  };
}

function generateCaseQuestion(askedSet: Set<string | number>): QuizQuestion {
  const key = pickUnasked(CASE_KEYS, askedSet);
  const [dir, upper] = key.split(':');
  const lower = upper.toLowerCase();
  const toLower = dir === 'U2L';
  const answer = toLower ? lower : upper;
  const lookalikes = toLower ? LOWER_LOOKALIKES[lower] : UPPER_LOOKALIKES[upper];
  const pool = toLower ? LETTERS.map((l) => l.toLowerCase()) : LETTERS;
  return {
    prompt: toLower ? upper : lower,
    dedupeKey: key,
    correctAnswer: answer,
    choices: shuffle([answer, ...pickDistractors([...lookalikes], pool, answer)]),
  };
}

function generateOrderQuestion(): QuizQuestion {
  const start = randomInt(0, LETTERS.length - 4);
  const blankAtEnd = Math.random() < 0.5;
  const answerIdx = blankAtEnd ? start + 3 : start;
  const shownIdxs = [0, 1, 2, 3].map((i) => start + i).filter((i) => i !== answerIdx);
  const shown = shownIdxs.map((i) => LETTERS[i]);
  const answer = LETTERS[answerIdx];

  const wrongs = new Set<string>();
  const neighbours = shuffle([-1, 1, -2, 2, -3, 3].map((d) => answerIdx + d));
  for (const n of neighbours) {
    if (n >= 0 && n < LETTERS.length && !shownIdxs.includes(n)) wrongs.add(LETTERS[n]);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(0, LETTERS.length - 1);
    if (r !== answerIdx && !shownIdxs.includes(r)) wrongs.add(LETTERS[r]);
  }

  return {
    prompt: blankAtEnd ? `${shown.join(' ')} __` : `__ ${shown.join(' ')}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...wrongs]),
  };
}

function generatePhonicsQuestion(askedSet: Set<string | number>, hasSpeech: boolean): QuizQuestion {
  const word = pickUnasked(
    PHONICS_WORDS.map((w) => w.word),
    askedSet
  );
  const entry = PHONICS_WORDS.find((w) => w.word === word)!;
  const answer = entry.letter;
  const banned = SAME_SOUND[answer] || '';
  const preferred = [...UPPER_LOOKALIKES[answer]].filter((l) => !banned.includes(l));
  const pool = LETTERS.filter((l) => !banned.includes(l));
  return {
    prompt: hasSpeech ? entry.emoji : `${entry.emoji} ${entry.word}`,
    promptTappable: hasSpeech,
    speechPrompt: hasSpeech ? entry.word : undefined,
    speechRate: 0.8,
    explanation: `${entry.word} starts with ${answer}.`,
    dedupeKey: entry.word,
    correctAnswer: answer,
    choices: shuffle([answer, ...pickDistractors(preferred, pool, answer)]),
  };
}

export const englishAlphabetsGame: QuizGameDefinition = {
  id: 'english-alphabets',
  buildConfig(params) {
    const raw = params.get('mode');
    const mode: AlphabetMode = raw === 'case' || raw === 'order' || raw === 'phonics' ? raw : 'listen';
    const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

    const meta: Record<
      AlphabetMode,
      { label: string; totalQuestions: number; timePerQuestion: number; info: string; desc: string; questionClass: string }
    > = {
      listen: {
        label: 'Listen & Find',
        totalQuestions: 10,
        timePerQuestion: 15,
        info: 'tap the letter you hear',
        desc: 'Listen 👂 — a letter name is said out loud. Tap the 🔊 any time to hear it again, then tap the matching letter. Turn your sound on!',
        questionClass: 'quiz-question-xl',
      },
      case: {
        label: 'BIG & small letters',
        totalQuestions: 15,
        timePerQuestion: 10,
        info: 'match BIG and small letters',
        desc: 'Every letter has a BIG shape and a small shape: B and b, G and g. Find the partner of the letter shown!',
        questionClass: 'quiz-question-xl',
      },
      order: {
        label: 'ABC Order',
        totalQuestions: 15,
        timePerQuestion: 15,
        info: 'find the missing letter',
        desc: 'The alphabet always goes in the same order: A B C D… Tap the letter that fills the blank.',
        questionClass: '',
      },
      phonics: {
        label: 'First Letters',
        totalQuestions: 15,
        timePerQuestion: 15,
        info: 'tap the first letter of the word',
        desc: 'Look at the picture and listen to the word. Which letter does it start with? Tap the picture to hear the word again.',
        questionClass: 'quiz-question-xl',
      },
    };
    const cfg = meta[mode];

    return {
      totalQuestions: cfg.totalQuestions,
      timePerQuestion: cfg.timePerQuestion,
      modeLabel: cfg.label,
      infoText: `${cfg.totalQuestions} questions • ${cfg.timePerQuestion} seconds each • ${cfg.info}`,
      instructions: cfg.desc,
      speechWarning:
        mode === 'listen' || mode === 'phonics'
          ? "⚠️ This browser can't speak — the question will be shown as text instead."
          : undefined,
      finishTitle: 'Quiz Complete!',
      mascot: '🔤',
      bigChoices: true,
      questionClass: cfg.questionClass,
      bestTimeKey: `klg-english-alphabets-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: '🔊 Listen & Find', query: '', active: mode === 'listen' },
            { label: 'Aa BIG & small', query: 'mode=case', active: mode === 'case' },
            { label: 'ABC Order', query: 'mode=order', active: mode === 'order' },
            { label: '🍎 First Letters', query: 'mode=phonics', active: mode === 'phonics' },
          ],
        },
      ],
      generateQuestion(askedSet) {
        if (mode === 'case') return generateCaseQuestion(askedSet);
        if (mode === 'order') return generateOrderQuestion();
        if (mode === 'phonics') return generatePhonicsQuestion(askedSet, hasSpeech);
        return generateListenQuestion(askedSet, hasSpeech);
      },
    };
  },
};
