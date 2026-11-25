import type { QuizGameDefinition, QuizQuestion } from '../../game/quiz-types';
import { randomInt, shuffle } from './math-helpers';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_IN_MONTH: Record<string, number> = {
  January: 31, March: 31, April: 30, May: 31, June: 30, July: 31,
  August: 31, September: 30, October: 31, November: 30, December: 31,
};

function ordinal(n: number): string {
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

function at<T>(list: readonly T[], i: number): T {
  return list[((i % list.length) + list.length) % list.length];
}

function neighbourChoices(list: readonly string[], askedIndex: number, correctIndex: number): string[] {
  const choices = new Set<string>([at(list, correctIndex)]);
  for (const offset of [-1, 2, 0]) {
    choices.add(at(list, askedIndex + offset));
    if (choices.size === 4) break;
  }
  let step = 3;
  while (choices.size < 4) {
    choices.add(at(list, askedIndex + step));
    step += 1;
  }
  return shuffle([...choices]);
}

function makeSequenceQuestion(list: readonly string[], phrases: { after: string; before: string }): QuizQuestion {
  const i = randomInt(0, list.length - 1);
  const forward = randomInt(0, 1) === 1;
  const correctIndex = forward ? i + 1 : i - 1;
  const phrase = phrases[forward ? 'after' : 'before'];
  return {
    prompt: phrase.replace('{}', list[i]),
    correctAnswer: at(list, correctIndex),
    choices: neighbourChoices(list, i, correctIndex),
  };
}

function makeDayOrderQuestion(): QuizQuestion {
  return makeSequenceQuestion(DAYS, { after: 'What day comes after {}?', before: 'What day comes before {}?' });
}

function makeTomorrowYesterdayQuestion(): QuizQuestion {
  const i = randomInt(0, 6);
  const forward = randomInt(0, 1) === 1;
  const correctIndex = forward ? i + 1 : i - 1;
  return {
    prompt: forward ? `If today is ${DAYS[i]}, what day will tomorrow be?` : `If today is ${DAYS[i]}, what day was yesterday?`,
    correctAnswer: at(DAYS, correctIndex),
    choices: neighbourChoices(DAYS, i, correctIndex),
  };
}

function makeNthDayQuestion(): QuizQuestion {
  const n = randomInt(1, 7);
  const correct = DAYS[n - 1];
  const choices = new Set<string>([correct, at(DAYS, n), at(DAYS, n - 2)]);
  let step = 2;
  while (choices.size < 4) {
    choices.add(at(DAYS, n - 1 + step));
    step += 1;
  }
  return {
    prompt: `What is the ${ordinal(n)} day of the week?`,
    correctAnswer: correct,
    choices: shuffle([...choices]),
  };
}

function makeDayCountQuestion(): QuizQuestion {
  const facts = [
    { prompt: 'How many days are in a week?', correct: 7, wrongs: [5, 6, 8] },
    { prompt: 'How many days are in a weekend?', correct: 2, wrongs: [1, 3, 5] },
    { prompt: 'How many school days are in a week?', correct: 5, wrongs: [4, 6, 7] },
  ];
  const fact = facts[randomInt(0, facts.length - 1)];
  return {
    prompt: fact.prompt,
    correctAnswer: fact.correct,
    choices: shuffle([fact.correct, ...fact.wrongs]),
  };
}

function makeMonthOrderQuestion(): QuizQuestion {
  return makeSequenceQuestion(MONTHS, { after: 'What month comes after {}?', before: 'What month comes before {}?' });
}

function makeNthMonthQuestion(): QuizQuestion {
  const n = randomInt(1, 12);
  return {
    prompt: `What is the ${ordinal(n)} month of the year?`,
    correctAnswer: MONTHS[n - 1],
    choices: neighbourChoices(MONTHS, n - 1, n - 1),
  };
}

function makeDaysInMonthQuestion(): QuizQuestion {
  const names = Object.keys(DAYS_IN_MONTH);
  const month = names[randomInt(0, names.length - 1)];
  return {
    prompt: `How many days does ${month} have?`,
    correctAnswer: DAYS_IN_MONTH[month],
    choices: shuffle([28, 29, 30, 31]),
  };
}

function makeMonthCountQuestion(): QuizQuestion {
  const facts = [
    { prompt: 'How many months are in a year?', correct: 12, wrongs: [10, 11, 13] },
    { prompt: 'How many days are in a year?', correct: 365, wrongs: [356, 360, 375] },
    { prompt: 'Which is the shortest month of the year?', correct: 'February', wrongs: ['January', 'April', 'June'] },
    { prompt: 'Which is the first month of the year?', correct: 'January', wrongs: ['February', 'December', 'March'] },
    { prompt: 'Which is the last month of the year?', correct: 'December', wrongs: ['November', 'January', 'October'] },
  ];
  const fact = facts[randomInt(0, facts.length - 1)];
  return {
    prompt: fact.prompt,
    correctAnswer: fact.correct,
    choices: shuffle([fact.correct, ...fact.wrongs]),
  };
}

function monthGrid(start: number, length: number, marked: number[]): HTMLElement {
  const f = document.createElement('figure');
  f.className = 'kv-month';
  f.setAttribute('role', 'img');
  f.setAttribute(
    'aria-label',
    `A calendar month with ${length} days. The 1st is on a ${DAYS[start]}.` +
      (marked.length ? ` Circled: ${marked.join(' and ')}.` : '')
  );
  f.dataset['start'] = String(start);
  f.dataset['length'] = String(length);
  const table = document.createElement('table');
  table.setAttribute('aria-hidden', 'true');
  const hdr = document.createElement('tr');
  DAYS.forEach((d) => {
    const th = document.createElement('th');
    th.textContent = d.slice(0, 3);
    hdr.appendChild(th);
  });
  table.appendChild(hdr);
  let day = 1;
  for (let week = 0; day <= length; week += 1) {
    const tr = document.createElement('tr');
    for (let col = 0; col < 7; col += 1) {
      const td = document.createElement('td');
      if ((week > 0 || col >= start) && day <= length) {
        td.textContent = String(day);
        if (marked.includes(day)) td.className = 'on';
        day += 1;
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  f.appendChild(table);
  return f;
}

function monthShape(): { start: number; length: number } {
  return { start: randomInt(0, 6), length: [28, 30, 31][randomInt(0, 2)] };
}

function makeGridDayQuestion(): QuizQuestion {
  const { start, length } = monthShape();
  const date = randomInt(8, length);
  const correct = DAYS[(start + date - 1) % 7];
  const wrongs = shuffle(DAYS.filter((d) => d !== correct)).slice(0, 3);
  return {
    visual: () => monthGrid(start, length, [date]),
    prompt: `What day of the week is the ${ordinal(date)}?`,
    dedupeKey: `grid-day-${start}-${date}`,
    explanation: `Follow the circled ${date} up to the top of its column: ${correct}.`,
    correctAnswer: correct,
    choices: shuffle([correct, ...wrongs]),
  };
}

function makeGridBetweenQuestion(): QuizQuestion {
  const { start, length } = monthShape();
  const from = randomInt(1, length - 10);
  const gap = randomInt(2, 10);
  const wrongs = [gap + 1, gap - 1, gap + 7, gap * 2].filter((v, i, a) => v > 0 && v !== gap && a.indexOf(v) === i).slice(0, 3);
  return {
    visual: () => monthGrid(start, length, [from, from + gap]),
    prompt: `How many days from the ${ordinal(from)} to the ${ordinal(from + gap)}?`,
    dedupeKey: `grid-gap-${start}-${from}-${gap}`,
    explanation: `${from + gap} − ${from} = ${gap} days.`,
    correctAnswer: String(gap),
    choices: shuffle([String(gap), ...wrongs.map(String)]),
  };
}

function makeGridWeekQuestion(): QuizQuestion {
  const { start, length } = monthShape();
  const from = randomInt(1, length - 7);
  const wrongs = [from + 6, from + 8, from + 1, from + 14].filter((v, i, a) => v <= length + 7 && a.indexOf(v) === i).slice(0, 3);
  return {
    visual: () => monthGrid(start, length, [from]),
    prompt: `What date is exactly one week after the ${ordinal(from)}?`,
    dedupeKey: `grid-week-${start}-${from}`,
    explanation: `One week is 7 days, and the date goes straight down one row: ${from + 7}.`,
    correctAnswer: String(from + 7),
    choices: shuffle([String(from + 7), ...wrongs.map(String)]),
  };
}

export const calendarGame: QuizGameDefinition = {
  id: 'calendar',
  buildConfig(params) {
    const raw = params.get('type');
    const mode = raw === 'days' || raw === 'months' || raw === 'grid' ? raw : 'all';
    const labels: Record<string, string> = {
      all: 'Days of the week + months of the year',
      days: 'Days of the week',
      months: 'Months of the year',
      grid: 'Reading a month calendar',
    };
    const daysKinds = [makeDayOrderQuestion, makeDayOrderQuestion, makeTomorrowYesterdayQuestion, makeNthDayQuestion, makeDayCountQuestion];
    const monthsKinds = [makeMonthOrderQuestion, makeMonthOrderQuestion, makeNthMonthQuestion, makeDaysInMonthQuestion, makeMonthCountQuestion];
    const gridKinds = [makeGridDayQuestion, makeGridBetweenQuestion, makeGridWeekQuestion];
    const kinds = mode === 'days' ? daysKinds : mode === 'months' ? monthsKinds : mode === 'grid' ? gridKinds : [...daysKinds, ...monthsKinds, ...gridKinds];

    return {
      totalQuestions: 15,
      timePerQuestion: 15,
      bigChoices: false,
      modeLabel: labels[mode],
      infoText: '15 questions • 15 seconds each • multiple choice',
      instructions: 'Weeks start on Sunday, like on a wall calendar — so Sunday is the 1st day of the week.',
      finishTitle: 'Quiz Complete!',
      bestTimeKey: `klg-calendar-best-ms:${mode}`,
      modeGroups: [
        {
          id: 'mode-links',
          links: [
            { label: 'Mix', query: '', active: mode === 'all' },
            { label: 'Days of the Week', query: 'type=days', active: mode === 'days' },
            { label: 'Months of the Year', query: 'type=months', active: mode === 'months' },
            { label: '🗓️ Month grid', query: 'type=grid', active: mode === 'grid' },
          ],
        },
      ],
      generateQuestion: () => kinds[randomInt(0, kinds.length - 1)](),
    };
  },
};
