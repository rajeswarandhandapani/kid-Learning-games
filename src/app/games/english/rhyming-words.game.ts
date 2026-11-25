import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgWordPics, pick, shuffle } from '../math/math-helpers';

type RhymeMode = 'all' | 'picture' | 'rhyme' | 'odd' | 'finish';

const FAMILIES: ReadonlyArray<{ id: string; words: readonly string[] }> = [
  { id: 'at', words: ['cat', 'hat', 'bat', 'mat', 'rat', 'flat'] },
  { id: 'an', words: ['can', 'man', 'fan', 'pan', 'van', 'plan'] },
  { id: 'ap', words: ['cap', 'map', 'nap', 'tap', 'clap'] },
  { id: 'ag', words: ['bag', 'flag', 'tag', 'wag'] },
  { id: 'ed', words: ['bed', 'red', 'sled', 'head', 'bread'] },
  { id: 'en', words: ['hen', 'pen', 'ten', 'men', 'then'] },
  { id: 'et', words: ['net', 'wet', 'pet', 'jet', 'get'] },
  { id: 'ig', words: ['pig', 'big', 'dig', 'wig', 'twig'] },
  { id: 'in', words: ['pin', 'win', 'chin', 'fin', 'grin'] },
  { id: 'ip', words: ['ship', 'lip', 'dip', 'chip', 'drip'] },
  { id: 'it', words: ['sit', 'hit', 'bit', 'fit', 'kit'] },
  { id: 'og', words: ['dog', 'frog', 'log', 'fog', 'jog'] },
  { id: 'op', words: ['top', 'hop', 'mop', 'stop', 'shop'] },
  { id: 'ot', words: ['pot', 'hot', 'dot', 'spot', 'knot'] },
  { id: 'ug', words: ['bug', 'rug', 'hug', 'mug', 'jug'] },
  { id: 'un', words: ['sun', 'run', 'fun', 'bun'] },
  { id: 'ut', words: ['nut', 'cut', 'hut', 'shut'] },
  { id: 'ake', words: ['cake', 'lake', 'bake', 'snake', 'rake'] },
  { id: 'ame', words: ['name', 'game', 'same', 'flame'] },
  { id: 'ain', words: ['rain', 'train', 'plane', 'brain', 'chain'] },
  { id: 'ail', words: ['snail', 'tail', 'mail', 'whale', 'pail'] },
  { id: 'all', words: ['ball', 'wall', 'tall', 'fall', 'small'] },
  { id: 'ell', words: ['bell', 'shell', 'well', 'smell', 'spell'] },
  { id: 'ing', words: ['king', 'ring', 'sing', 'wing', 'swing'] },
  { id: 'ock', words: ['sock', 'rock', 'clock', 'lock', 'block'] },
  { id: 'ite', words: ['night', 'light', 'kite', 'bite', 'white'] },
  { id: 'ee', words: ['tree', 'bee', 'sea', 'tea', 'key', 'three'] },
  { id: 'ar', words: ['car', 'star', 'jar', 'far'] },
  { id: 'own', words: ['crown', 'down', 'town', 'brown', 'clown'] },
  { id: 'oon', words: ['moon', 'spoon', 'balloon', 'soon'] },
  { id: 'oat', words: ['boat', 'coat', 'goat', 'note', 'float'] },
  { id: 'ice', words: ['mice', 'rice', 'ice', 'nice', 'price'] },
  { id: 'ow', words: ['snow', 'blow', 'grow', 'slow', 'toe'] },
];

const RHYME_LINES: ReadonlyArray<{ line: string; family: string; answer: string }> = [
  { line: 'The fat cat sat on a ___', family: 'at', answer: 'mat' },
  { line: 'A little brown bug snuggled up on the ___', family: 'ug', answer: 'rug' },
  { line: 'The green frog jumped onto a ___', family: 'og', answer: 'log' },
  { line: 'I bake a big cake beside the blue ___', family: 'ake', answer: 'lake' },
  { line: 'The king put on his ring and started to ___', family: 'ing', answer: 'sing' },
  { line: 'The tall ball rolled along the garden ___', family: 'all', answer: 'wall' },
  { line: 'At night the moon gives light to a shiny white ___', family: 'ite', answer: 'kite' },
  { line: 'The snail left a trail on the end of its ___', family: 'ail', answer: 'tail' },
  { line: 'My sock came off on a big grey ___', family: 'ock', answer: 'rock' },
  { line: 'The bee sat down for tea under a ___', family: 'ee', answer: 'tree' },
  { line: 'The clown came down into the busy ___', family: 'own', answer: 'town' },
  { line: 'The goat rowed a note across the lake in a ___', family: 'oat', answer: 'boat' },
  { line: 'Ten little hens took turns with one ___', family: 'en', answer: 'pen' },
  { line: 'The pink pig wore a very silly ___', family: 'ig', answer: 'wig' },
  { line: 'In the rain we ran to catch the ___', family: 'ain', answer: 'train' },
  { line: 'The star drove far in a shiny red ___', family: 'ar', answer: 'car' },
  { line: 'The mice think rice is very, very ___', family: 'ice', answer: 'nice' },
  { line: 'The hot sun had lots of ___', family: 'un', answer: 'fun' },
];

function otherWords(familyId: string, count: number): string[] {
  const pool = shuffle(FAMILIES.filter((f) => f.id !== familyId));
  const words: string[] = [];
  for (const family of pool) {
    words.push(pick(family.words));
    if (words.length === count) break;
  }
  return words;
}

function makeRhymeQuestion(): QuizQuestion {
  const family = pick(FAMILIES);
  const [target, answer] = shuffle(family.words);
  return {
    prompt: `Which word rhymes with "${target}"?`,
    dedupeKey: `rhyme-${target}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...otherWords(family.id, 3)]),
  };
}

function wordPicture(word: string): HTMLElement {
  const wp = klgWordPics();
  const box = document.createElement('div');
  box.className = 'kv-choice';
  const emoji = wp?.pic(word) || '';
  box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:2.6rem">${emoji}</span><span class="kv-choice-text">${word}</span>`;
  return box;
}

function makePictureRhymeQuestion(): QuizQuestion {
  const wp = klgWordPics();
  if (!wp) return makeRhymeQuestion();
  const families = FAMILIES.map((f) => ({ id: f.id, words: f.words.filter((w) => wp.has(w)) })).filter(
    (f) => f.words.length >= 2
  );
  const family = pick(families);
  const [target, answer] = shuffle(family.words);
  const wrongs = shuffle(families.filter((f) => f.id !== family.id))
    .slice(0, 3)
    .map((f) => pick(f.words));
  const choices = shuffle([answer, ...wrongs]);
  const choiceVisuals: Record<string, () => HTMLElement> = {};
  const choiceLabels: Record<string, string> = {};
  choices.forEach((w) => {
    choiceVisuals[w] = () => wordPicture(w);
    choiceLabels[w] = w;
  });
  return {
    visual: () => wordPicture(target),
    prompt: `Which picture rhymes with "${target}"?`,
    dedupeKey: `picrhyme-${target}`,
    explanation: `${target} and ${answer} end with the same sound.`,
    correctAnswer: answer,
    choices,
    choiceVisuals,
    choiceLabels,
    noChoiceListen: true,
  };
}

function makeOddQuestion(): QuizQuestion {
  const family = pick(FAMILIES);
  const three = shuffle(family.words).slice(0, 3);
  const odd = otherWords(family.id, 1)[0];
  return {
    prompt: 'Which word does NOT rhyme with the other three?',
    dedupeKey: `odd-${family.id}`,
    correctAnswer: odd,
    choices: shuffle([odd, ...three]),
  };
}

function makeFinishQuestion(): QuizQuestion {
  const entry = pick(RHYME_LINES);
  return {
    prompt: entry.line,
    dedupeKey: `finish-${entry.answer}`,
    correctAnswer: entry.answer,
    choices: shuffle([entry.answer, ...otherWords(entry.family, 3)]),
  };
}

export const rhymingWordsGame: QuizGameDefinition = {
  id: 'rhyming-words',
  buildConfig(params) {
    const raw = params.get('mode');
    const mode: RhymeMode =
      raw === 'rhyme' || raw === 'odd' || raw === 'finish' || raw === 'picture' ? raw : 'all';

    const labels: Record<RhymeMode, string> = {
      all: 'Rhymes, odd ones out & rhymes to finish',
      rhyme: 'Find the word that rhymes',
      odd: 'Spot the word that does not rhyme',
      finish: 'Finish the rhyme',
      picture: 'Find the picture that rhymes',
    };

    return {
      totalQuestions: 12,
      timePerQuestion: 20,
      modeLabel: labels[mode],
      infoText: '12 questions • 20 seconds each • multiple choice',
      instructions: 'Cat, hat, bat — words that rhyme end with the same sound. Say them out loud and listen! 👂',
      finishTitle: 'Quiz Complete!',
      mascot: '🎵',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-rhyming-words-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: '🖼️ Picture rhymes', query: 'mode=picture', active: mode === 'picture' },
            { label: 'Find the Rhyme', query: 'mode=rhyme', active: mode === 'rhyme' },
            { label: 'Odd One Out', query: 'mode=odd', active: mode === 'odd' },
            { label: 'Finish the Rhyme', query: 'mode=finish', active: mode === 'finish' },
          ],
        },
      ],
      generateQuestion: () => {
        const kind = mode === 'all' ? pick(['rhyme', 'rhyme', 'odd', 'finish', 'picture'] as const) : mode;
        if (kind === 'picture') return makePictureRhymeQuestion();
        if (kind === 'rhyme') return makeRhymeQuestion();
        if (kind === 'odd') return makeOddQuestion();
        return makeFinishQuestion();
      },
    };
  },
};
