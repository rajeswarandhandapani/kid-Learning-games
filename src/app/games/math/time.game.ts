import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { klgClock, pick, randomInt, shuffle } from './math-helpers';

type TimeMode = 'all' | 'clock' | 'elapsed';

const ACTIVITIES = [
  { name: 'School', icon: '🏫', earliest: 7 * 60, latest: 10 * 60 },
  { name: 'Art class', icon: '🎨', earliest: 9 * 60, latest: 11 * 60 },
  { name: 'Music class', icon: '🎵', earliest: 9 * 60, latest: 12 * 60 },
  { name: 'The movie', icon: '🎬', earliest: 14 * 60, latest: 19 * 60 },
  { name: 'Soccer practice', icon: '⚽', earliest: 15 * 60, latest: 18 * 60 },
  { name: 'Swimming lesson', icon: '🏊', earliest: 16 * 60, latest: 18 * 60 },
  { name: 'The birthday party', icon: '🎂', earliest: 14 * 60, latest: 18 * 60 },
];
const DURATIONS = [20, 30, 40, 45, 50, 60, 75, 90];
const TIME_OFFSETS = [-60, -30, -15, -10, -5, 5, 10, 15, 30, 60];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtClock(hour: number, minute: number): string {
  return `${hour}:${pad2(minute)}`;
}

function fmt12(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${h24 % 12 || 12}:${pad2(mins % 60)} ${ampm}`;
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function durationPhrase(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minutes`;
  const hours = h === 1 ? '1 hour' : `${h} hours`;
  return m === 0 ? hours : `${hours} ${m} minutes`;
}

function offsetWrongs(correct: number, offsets: readonly number[], isValid: (v: number) => boolean, fmt: (v: number) => string): string[] {
  const wrongs = new Set<string>();
  for (const off of shuffle(offsets)) {
    const v = correct + off;
    if (isValid(v)) wrongs.add(fmt(v));
    if (wrongs.size === 3) break;
  }
  return [...wrongs];
}

function pickTime(level: number): [number, number] {
  const hour = randomInt(1, 12);
  const minute = level === 1 ? [0, 30][randomInt(0, 1)] : level === 2 ? 5 * randomInt(0, 11) : randomInt(0, 59);
  return [hour, minute];
}

function clockWrongs(hour: number, minute: number, level: number): Array<[number, number]> {
  const next = (hour % 12) + 1;
  const prev = ((hour + 10) % 12) + 1;
  const list: Array<[number, number]> = [
    [hour, minute === 0 ? 30 : 0],
    [next, minute],
    [prev, minute],
    [hour, (minute + 30) % 60],
    [hour, (minute + 5) % 60],
    [hour, (minute + 55) % 60],
  ];
  if (minute % 5 === 0 && minute !== 0 && (hour * 5) % 60 !== minute) {
    list.push([minute / 5 || 12, (hour * 5) % 60]);
  }
  if (level === 3) {
    list.push([hour, (minute + 1) % 60], [hour, (minute + 59) % 60]);
  }
  const seen = new Set([fmtClock(hour, minute)]);
  const out: Array<[number, number]> = [];
  for (const [h, m] of shuffle(list)) {
    const text = fmtClock(h, m);
    if (!seen.has(text)) {
      seen.add(text);
      out.push([h, m]);
    }
  }
  return out.slice(0, 3);
}

function makeClockQuestion(level: number): QuizQuestion {
  const [hour, minute] = pickTime(level);
  const correct = fmtClock(hour, minute);
  const wrongs = clockWrongs(hour, minute, level).map(([h, m]) => fmtClock(h, m));
  return {
    visual: () => klgClock()?.face(hour, minute) ?? null,
    prompt: 'What time does the clock show?',
    dedupeKey: `clock:${correct}`,
    correctAnswer: correct,
    choices: shuffle([correct, ...wrongs]),
    explanation: `The short hand is near ${hour} and the long hand shows ${minute} minutes: ${correct}.`,
  };
}

function makeMatchClockQuestion(level: number): QuizQuestion {
  const ck = klgClock();
  const [hour, minute] = pickTime(level);
  const correct = fmtClock(hour, minute);
  const times: Array<[number, number]> = [[hour, minute], ...clockWrongs(hour, minute, level)];
  const spokenTime = ck ? ck.spoken(hour, minute) : correct;
  const choiceVisuals: Record<string, () => HTMLElement | null> = {};
  const choiceLabels: Record<string, string> = {};
  times.forEach(([h, m]) => {
    const key = fmtClock(h, m);
    choiceVisuals[key] = () => klgClock()?.face(h, m) ?? null;
    choiceLabels[key] = `a clock showing ${ck ? ck.spoken(h, m) : key}`;
  });
  return {
    prompt: `Which clock shows ${spokenTime}?`,
    dedupeKey: `match:${correct}`,
    correctAnswer: correct,
    choices: shuffle(times.map(([h, m]) => fmtClock(h, m))),
    choiceVisuals,
    choiceLabels,
    noChoiceListen: true,
    explanation: `${spokenTime} is ${correct}. Look at where the short and long hands point.`,
  };
}

function makeEndTimeQuestion(): QuizQuestion {
  const act = pick(ACTIVITIES);
  const start = act.earliest + 5 * randomInt(0, (act.latest - act.earliest) / 5);
  const dur = pick(DURATIONS);
  const correct = start + dur;
  const wrongs = offsetWrongs(correct, TIME_OFFSETS, (v) => v > start, fmt12);
  return {
    visual: () =>
      klgClock()?.timeline(start, dur, {
        label: `A timeline that starts at ${fmt12(start)}; the bar shows how long ${act.name} lasts`,
      }) ?? null,
    prompt: `${act.icon} ${act.name} starts at ${fmt12(start)} and lasts ${durationPhrase(dur)}. When does it end?`,
    explanation: `${fmt12(start)} plus ${durationPhrase(dur)} is ${fmt12(correct)}.`,
    correctAnswer: fmt12(correct),
    choices: shuffle([fmt12(correct), ...wrongs]),
  };
}

function makeElapsedQuestion(): QuizQuestion {
  const start = 6 * 60 + 5 * randomInt(0, (14 * 60) / 5);
  const dur = 5 * randomInt(4, 36);
  const wrongs = offsetWrongs(dur, TIME_OFFSETS, (v) => v > 0, fmtDuration);
  return {
    visual: () => klgClock()?.timeline(start, dur) ?? null,
    explanation: `From ${fmt12(start)} to ${fmt12(start + dur)} is ${durationPhrase(dur)}.`,
    prompt: `How much time passes from ${fmt12(start)} to ${fmt12(start + dur)}?`,
    correctAnswer: fmtDuration(dur),
    choices: shuffle([fmtDuration(dur), ...wrongs]),
  };
}

function makeMinutesQuestion(): QuizQuestion {
  const h = randomInt(1, 4);
  const m = pick([0, 15, 30, 45]);
  const correct = h * 60 + m;
  const candidates = shuffle(
    [h * 100 + m, correct - 60, correct + 60, correct - 10, correct + 10, h * 60 - m].filter(
      (v, i, arr) => v > 0 && v !== correct && arr.indexOf(v) === i
    )
  );
  return {
    prompt: `How many minutes are in ${durationPhrase(correct)}?`,
    correctAnswer: String(correct),
    choices: shuffle([correct, ...candidates.slice(0, 3)].map(String)),
  };
}

function buildQuery(type: TimeMode, level: number): string {
  const p = new URLSearchParams();
  if (type !== 'all') p.set('type', type);
  if (level !== 2) p.set('level', String(level));
  const str = p.toString();
  return str ? `?${str}` : '';
}

export const timeGame: QuizGameDefinition = {
  id: 'time',
  buildConfig(params) {
    const rawType = params.get('type');
    const mode: TimeMode = rawType === 'clock' || rawType === 'elapsed' ? rawType : 'all';
    const rawLevel = Number(params.get('level'));
    const level = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2;

    const labels: Record<TimeMode, string> = {
      all: 'Reading clocks + elapsed time',
      clock: 'Reading clock faces and finding the clock for a time',
      elapsed: 'End times, elapsed time and minute conversions',
    };

    const clockKinds = [() => makeClockQuestion(level), () => makeMatchClockQuestion(level)];
    const elapsedKinds = [makeEndTimeQuestion, makeElapsedQuestion, makeMinutesQuestion];
    const kinds = mode === 'clock' ? clockKinds : mode === 'elapsed' ? elapsedKinds : [...clockKinds, ...elapsedKinds];

    return {
      totalQuestions: 15,
      timePerQuestion: 120,
      modeLabel: labels[mode],
      infoText: '15 questions · 2 minutes each · multiple choice',
      instructions: 'Tip for elapsed time: count up to the next full hour first, then add the hours, then the leftover minutes!',
      finishTitle: 'Time Quiz Complete!',
      mascot: '🕰️',
      bigChoices: false,
      questionClass: 'quiz-question-sm',
      bestTimeKey: `klg-time-best-ms:${mode}${level === 2 ? '' : `:L${level}`}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix of both', query: buildQuery('all', level), active: mode === 'all' },
            { label: 'Reading Clocks 🕒', query: buildQuery('clock', level), active: mode === 'clock' },
            { label: 'Elapsed Time ⏱️', query: buildQuery('elapsed', level), active: mode === 'elapsed' },
          ],
        },
        {
          id: 'level-links',
          links: [
            { label: 'Level 1 · o’clock & half past', query: buildQuery(mode, 1), active: level === 1 },
            { label: 'Level 2 · quarters & 5 minutes', query: buildQuery(mode, 2), active: level === 2 },
            { label: 'Level 3 · every minute', query: buildQuery(mode, 3), active: level === 3 },
          ],
        },
      ],
      generateQuestion: () => pick(kinds)(),
    };
  },
};
