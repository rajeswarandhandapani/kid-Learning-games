import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgWordPics, pick, shuffle } from '../math/math-helpers';

type OppositesMode = 'all' | 'opposite' | 'similar' | 'picture';

const OPPOSITE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['big', 'small'], ['big', 'little'], ['tall', 'short'], ['long', 'short'],
  ['hot', 'cold'], ['up', 'down'], ['in', 'out'], ['day', 'night'],
  ['fast', 'slow'], ['happy', 'sad'], ['open', 'closed'], ['old', 'new'],
  ['old', 'young'], ['wet', 'dry'], ['hard', 'soft'], ['heavy', 'light'],
  ['dark', 'light'], ['full', 'empty'], ['loud', 'quiet'], ['clean', 'dirty'],
  ['first', 'last'], ['push', 'pull'], ['give', 'take'], ['start', 'stop'],
  ['above', 'below'], ['near', 'far'], ['left', 'right'], ['more', 'less'],
  ['win', 'lose'], ['remember', 'forget'], ['always', 'never'], ['front', 'back'],
  ['top', 'bottom'], ['inside', 'outside'], ['brave', 'scared'], ['strong', 'weak'],
  ['early', 'late'], ['smooth', 'rough'], ['thick', 'thin'], ['sweet', 'sour'],
  ['asleep', 'awake'], ['buy', 'sell'], ['float', 'sink'], ['laugh', 'cry'],
  ['arrive', 'leave'], ['same', 'different'], ['true', 'false'], ['rich', 'poor'],
  ['deep', 'shallow'], ['wide', 'narrow'], ['question', 'answer'], ['begin', 'end'],
  ['hard', 'easy'], ['difficult', 'easy'],
];

const ALSO_RIGHT: Record<string, readonly string[]> = {
  loud: ['silent'], quiet: ['noisy'], happy: ['unhappy'], sad: ['glad', 'cheerful'],
  begin: ['stop', 'finish'], end: ['start'], start: ['end', 'finish'], stop: ['begin'],
  first: ['end', 'final'], last: ['start', 'begin'], open: ['shut'],
  up: ['below', 'bottom', 'under'], down: ['above', 'top'],
  top: ['below', 'down'], bottom: ['above', 'up'],
  above: ['down', 'bottom'], below: ['up', 'top'],
  in: ['outside'], out: ['inside'], inside: ['out'], outside: ['in'],
  tall: ['small', 'little', 'tiny', 'low'], short: ['big', 'large', 'huge', 'long'],
  long: ['small', 'little', 'tiny'], wide: ['thin'], narrow: ['thick'],
  dirty: ['neat', 'tidy'], weak: ['powerful'], awake: ['sleepy', 'tired'],
  brave: ['afraid'], slow: ['quick'], hot: ['cool', 'chilly'], cold: ['warm'],
};

const SIMILAR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['big', 'large'], ['big', 'huge'], ['small', 'tiny'], ['happy', 'glad'],
  ['happy', 'cheerful'], ['sad', 'unhappy'], ['fast', 'quick'], ['angry', 'mad'],
  ['begin', 'start'], ['closed', 'shut'], ['jump', 'leap'], ['shout', 'yell'],
  ['quiet', 'silent'], ['smart', 'clever'], ['tired', 'sleepy'], ['pretty', 'beautiful'],
  ['scared', 'afraid'], ['sick', 'ill'], ['hard', 'difficult'], ['easy', 'simple'],
  ['gift', 'present'], ['tale', 'story'], ['cool', 'chilly'], ['cool', 'cold'],
  ['cold', 'chilly'], ['small', 'little'], ['little', 'tiny'], ['rock', 'stone'],
  ['home', 'house'], ['kid', 'child'], ['bag', 'sack'], ['road', 'street'],
  ['trip', 'journey'], ['funny', 'amusing'], ['strong', 'powerful'], ['neat', 'tidy'],
  ['shiny', 'sparkly'], ['hurry', 'rush'], ['look', 'watch'], ['talk', 'speak'],
];

function buildMap(pairs: ReadonlyArray<readonly [string, string]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    let set = map.get(from);
    if (!set) {
      set = new Set<string>();
      map.set(from, set);
    }
    set.add(to);
  };
  pairs.forEach(([a, b]) => {
    add(a, b);
    add(b, a);
  });
  return map;
}

const OPPOSITES = buildMap(OPPOSITE_PAIRS);
const SIMILARS = buildMap(SIMILAR_PAIRS);
const ALL_WORDS = [...new Set([...OPPOSITES.keys(), ...SIMILARS.keys()])];

function safeDecoys(word: string, answer: string, count: number, banned: readonly string[] = []): string[] {
  const blocked = new Set<string>([
    word,
    answer,
    ...(OPPOSITES.get(word) || []),
    ...(SIMILARS.get(word) || []),
    ...(SIMILARS.get(answer) || []),
    ...(ALSO_RIGHT[word] || []),
    ...(ALSO_RIGHT[answer] || []),
    ...banned,
  ]);
  return shuffle(ALL_WORDS.filter((w) => !blocked.has(w))).slice(0, count);
}

function makeOppositeQuestion(): QuizQuestion {
  const [word, answer] = shuffle(pick(OPPOSITE_PAIRS));
  return {
    prompt: `What is the opposite of "${word}"?`,
    dedupeKey: `opp-${word}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...safeDecoys(word, answer, 3)]),
  };
}

function pictureBox(word: string, big = false): HTMLElement {
  const wp = klgWordPics();
  const box = document.createElement('div');
  box.className = 'kv-choice';
  const emoji = wp?.pic(word) || '';
  box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:${big ? 3.4 : 2.6}rem">${emoji}</span><span class="kv-choice-text">${word}</span>`;
  return box;
}

function makePictureOppositeQuestion(): QuizQuestion {
  const wp = klgWordPics();
  if (!wp) return makeOppositeQuestion();
  const [word, answer] = shuffle(pick(wp.OPPOSITES));
  const decoyWords = safeDecoys(word, answer, 12)
    .filter((w) => wp.has(w))
    .slice(0, 3);
  if (decoyWords.length < 3) return makeOppositeQuestion();
  const choices = shuffle([answer, ...decoyWords]);
  const choiceVisuals: Record<string, () => HTMLElement> = {};
  const choiceLabels: Record<string, string> = {};
  choices.forEach((w) => {
    choiceVisuals[w] = () => pictureBox(w);
    choiceLabels[w] = w;
  });
  return {
    visual: () => pictureBox(word, true),
    prompt: `Which picture shows the opposite of "${word}"?`,
    dedupeKey: `picopp-${word}`,
    explanation: `${answer} is the opposite of ${word}.`,
    correctAnswer: answer,
    choices,
    choiceVisuals,
    choiceLabels,
    noChoiceListen: true,
  };
}

function makeSimilarQuestion(): QuizQuestion {
  const [word, answer] = shuffle(pick(SIMILAR_PAIRS));
  const opposites = [...(OPPOSITES.get(word) || [])];
  const trap = opposites.length ? [pick(opposites)] : [];
  return {
    prompt: `Which word means almost the SAME as "${word}"?`,
    dedupeKey: `sim-${word}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...trap, ...safeDecoys(word, answer, 3 - trap.length, trap)]),
  };
}

export const oppositesGame: QuizGameDefinition = {
  id: 'opposites',
  buildConfig(params) {
    const raw = params.get('mode');
    const mode: OppositesMode = raw === 'opposite' || raw === 'similar' || raw === 'picture' ? raw : 'all';

    const labels: Record<OppositesMode, string> = {
      all: 'Opposites and words that mean the same',
      opposite: 'Find the opposite word',
      similar: 'Find the word that means the same',
      picture: 'Find the picture of the opposite',
    };

    return {
      totalQuestions: 15,
      timePerQuestion: 15,
      modeLabel: labels[mode],
      infoText: '15 questions • 15 seconds each • multiple choice',
      instructions: 'Big and small, hot and cold — opposites are word partners that mean the exact reverse. 🙃',
      finishTitle: 'Quiz Complete!',
      mascot: '↔️',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-opposites-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: 'Opposites', query: 'mode=opposite', active: mode === 'opposite' },
            { label: 'Same Meaning', query: 'mode=similar', active: mode === 'similar' },
            { label: '🖼️ Picture opposites', query: 'mode=picture', active: mode === 'picture' },
          ],
        },
      ],
      generateQuestion: () => {
        const kind = mode === 'all' ? pick(['opposite', 'opposite', 'similar', 'picture'] as const) : mode;
        if (kind === 'picture') return makePictureOppositeQuestion();
        return kind === 'opposite' ? makeOppositeQuestion() : makeSimilarQuestion();
      },
    };
  },
};
