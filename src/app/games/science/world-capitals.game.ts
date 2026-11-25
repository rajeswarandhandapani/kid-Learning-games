import * as rawCapitalsBank from '../../../../games/world-capitals/questions.js';
import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { pick, shuffle, unwrapCjs } from '../math/math-helpers';

type CapitalMode = 'capital' | 'country' | 'flag';
type RegionKey = 'asia' | 'europe' | 'africa' | 'americas' | 'oceania';

interface CountryEntry {
  country: string;
  capital: string;
  flag: string;
  region: RegionKey;
  trap?: string;
}

interface CapitalsBank {
  COUNTRIES: readonly CountryEntry[];
}

const REGIONS: Record<RegionKey, string> = {
  asia: 'Asia',
  europe: 'Europe',
  africa: 'Africa',
  americas: 'The Americas',
  oceania: 'Oceania',
};

const LANDMARKS: Record<string, string> = {
  India: '🕌', China: '🏯', Japan: '🗻', 'South Korea': '🏯', Thailand: '🛕', Egypt: '🐪', France: '🗼',
  'United Kingdom': '🎡', Germany: '🏰', Italy: '🏛️', Spain: '💃', Greece: '🏛️', Netherlands: '🌷',
  Switzerland: '🏔️', Russia: '🪆', Norway: '⛰️', 'United States': '🗽', Canada: '🍁', Mexico: '🌮',
  Brazil: '🌴', Peru: '🦙', Argentina: '⚽', Australia: '🦘', 'New Zealand': '🥝', Kenya: '🦁',
  Morocco: '🕌', Jamaica: '🏝️', Ireland: '☘️', Turkey: '🎈', 'Saudi Arabia': '🕋', Nepal: '🏔️',
  Jordan: '🏜️', Tanzania: '🦒',
};

function flagPicture(entry: CountryEntry): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-clue kv-flagpic';
  f.setAttribute('role', 'img');
  f.setAttribute('aria-label', `The flag of ${entry.country}${LANDMARKS[entry.country] ? ' and a famous landmark' : ''}`);
  f.innerHTML = `<span aria-hidden="true">${entry.flag}${LANDMARKS[entry.country] ? ` ${LANDMARKS[entry.country]}` : ''}</span>`;
  return f;
}

function flagChoiceBox(flag: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'kv-choice';
  box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:3rem">${flag}</span>`;
  return box;
}

function pickDistractors(
  seed: readonly string[],
  preferred: readonly string[],
  rest: readonly string[],
  answer: string
): string[] {
  const wrongs = new Set<string>(seed.filter((v) => v !== answer));
  for (const pool of [preferred, rest]) {
    for (const value of shuffle(pool)) {
      if (wrongs.size === 3) break;
      if (value !== answer) wrongs.add(value);
    }
  }
  return [...wrongs];
}

function generateCapitalQuestion(entries: readonly CountryEntry[], allCountries: readonly CountryEntry[]) {
  return (askedSet: Set<string | number>): QuizQuestion => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const entry = pick(remaining.length ? remaining : entries);
    const sameRegion = entries.filter((e) => e !== entry && e.region === entry.region).map((e) => e.capital);
    const rest = allCountries.filter((e) => e !== entry).map((e) => e.capital);
    const wrongs = pickDistractors(entry.trap ? [entry.trap] : [], sameRegion, rest, entry.capital);
    return {
      visual: () => flagPicture(entry),
      prompt: `What is the capital of ${entry.country}?`,
      explanation: `${entry.capital} is the capital of ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.capital,
      choices: shuffle([entry.capital, ...wrongs]),
    };
  };
}

function generateCountryQuestion(entries: readonly CountryEntry[], allCountries: readonly CountryEntry[]) {
  return (askedSet: Set<string | number>): QuizQuestion => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const entry = pick(remaining.length ? remaining : entries);
    const sameRegion = entries.filter((e) => e !== entry && e.region === entry.region).map((e) => e.country);
    const rest = allCountries.filter((e) => e !== entry).map((e) => e.country);
    return {
      prompt: `${entry.capital} is the capital of which country?`,
      explanation: `${entry.capital} is in ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.country,
      choices: shuffle([entry.country, ...pickDistractors([], sameRegion, rest, entry.country)]),
    };
  };
}

function generateFlagQuestion(entries: readonly CountryEntry[], allCountries: readonly CountryEntry[]) {
  return (askedSet: Set<string | number>): QuizQuestion => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const entry = pick(remaining.length ? remaining : entries);
    const sameRegion = allCountries.filter((e) => e !== entry && e.region === entry.region);
    const others = allCountries.filter((e) => e !== entry && e.region !== entry.region);
    const wrongs = [...shuffle(sameRegion), ...shuffle(others)].filter((e) => e.flag !== entry.flag).slice(0, 3);
    const options = shuffle([entry, ...wrongs]);
    const choiceVisuals: Record<string, () => HTMLElement> = {};
    const choiceLabels: Record<string, string> = {};
    options.forEach((e) => {
      choiceVisuals[e.country] = () => flagChoiceBox(e.flag);
      choiceLabels[e.country] = `the flag of ${e.country}`;
    });
    return {
      prompt: `Which flag belongs to ${entry.country}?`,
      explanation: `This is the flag of ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.country,
      choices: options.map((e) => e.country),
      choiceVisuals,
      choiceLabels,
      noChoiceListen: true,
    };
  };
}

function buildQuery(mode: CapitalMode, region: RegionKey | null): string {
  const p = new URLSearchParams();
  if (mode !== 'capital') p.set('mode', mode);
  if (region) p.set('region', region);
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const worldCapitalsGame: QuizGameDefinition = {
  id: 'world-capitals',
  buildConfig(params) {
    const { COUNTRIES } = unwrapCjs<CapitalsBank>(rawCapitalsBank);
    const rawMode = params.get('mode');
    const mode: CapitalMode = rawMode === 'country' || rawMode === 'flag' ? rawMode : 'capital';
    const rawRegion = params.get('region') as RegionKey | null;
    const region = rawRegion && REGIONS[rawRegion] ? rawRegion : null;
    const entries = region ? COUNTRIES.filter((e) => e.region === region) : COUNTRIES;

    const modeDesc =
      mode === 'capital'
        ? 'Find the capital city of each country'
        : mode === 'flag'
          ? 'Find the flag of each country'
          : 'Find the country each capital belongs to';

    return {
      totalQuestions: Math.min(15, entries.length),
      timePerQuestion: 120,
      modeLabel: `${modeDesc} — ${region ? REGIONS[region] : 'the whole world'}, ${entries.length} countries`,
      infoText: 'Up to 15 questions • 2 minutes each • multiple choice',
      instructions:
        "Watch out for famous-city traps: Sydney is not the capital of Australia (it's Canberra!), and Istanbul is not the capital of Turkey (it's Ankara!).",
      finishTitle: 'Quiz Complete!',
      mascot: '🌍',
      bigChoices: false,
      questionClass: mode === 'country' ? 'quiz-question-sm' : '',
      bestTimeKey: `klg-world-capitals-best-ms:${mode}:${region || 'all'}`,
      modeGroups: [
        {
          id: 'sound-mode-links',
          links: [
            { label: '🏙️ Find the Capital', query: buildQuery('capital', region), active: mode === 'capital' },
            { label: '🗺️ Find the Country', query: buildQuery('country', region), active: mode === 'country' },
            { label: '🏳️ Find the Flag', query: buildQuery('flag', region), active: mode === 'flag' },
          ],
        },
        {
          id: 'mode-links',
          links: [
            { label: 'Whole World', query: buildQuery(mode, null), active: region === null },
            { label: 'Asia', query: buildQuery(mode, 'asia'), active: region === 'asia' },
            { label: 'Europe', query: buildQuery(mode, 'europe'), active: region === 'europe' },
            { label: 'Africa', query: buildQuery(mode, 'africa'), active: region === 'africa' },
            { label: 'Americas', query: buildQuery(mode, 'americas'), active: region === 'americas' },
            { label: 'Oceania', query: buildQuery(mode, 'oceania'), active: region === 'oceania' },
          ],
        },
      ],
      generateQuestion:
        mode === 'capital'
          ? generateCapitalQuestion(entries, COUNTRIES)
          : mode === 'flag'
            ? generateFlagQuestion(entries, COUNTRIES)
            : generateCountryQuestion(entries, COUNTRIES),
    };
  },
};
