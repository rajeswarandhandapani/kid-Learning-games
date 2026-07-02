/**
 * Tamil alphabet question generator.
 * Reads ?type=vowels|consonants from the URL to restrict practice to one
 * group of letters; defaults to the full set (vowels + consonants).
 *
 * Sound mapping notes:
 *  - Vowels use kid-friendly English phonics (ee as in "see", oh as in "go").
 *  - Consonants are the true mei eluthukkal: the pulli (dot) mutes the
 *    inherent "a" vowel, so க் is the pure sound "k" (க without the dot
 *    would be "ka").
 *  - CAPITAL letters mark the retroflex (tongue curled back) sounds:
 *    ண் = N, ள் = L, ற் = R (the strong/trilled r).
 *  - ந் and ன் share the same spoken sound "n" (the difference is where
 *    they appear in a word), so both map to "n" and are never offered as
 *    distractors for each other.
 */
const TAMIL_LETTERS = [
  // Uyir eluthukkal (vowels)
  { tamil: "அ", sound: "a", type: "vowels" }, // as in "up"
  { tamil: "ஆ", sound: "aa", type: "vowels" }, // as in "father"
  { tamil: "இ", sound: "i", type: "vowels" }, // as in "sit"
  { tamil: "ஈ", sound: "ee", type: "vowels" }, // as in "see"
  { tamil: "உ", sound: "u", type: "vowels" }, // as in "put"
  { tamil: "ஊ", sound: "oo", type: "vowels" }, // as in "moon"
  { tamil: "எ", sound: "e", type: "vowels" }, // as in "egg"
  { tamil: "ஏ", sound: "ay", type: "vowels" }, // as in "day"
  { tamil: "ஐ", sound: "ai", type: "vowels" }, // as in "eye"
  { tamil: "ஒ", sound: "o", type: "vowels" }, // as in "on"
  { tamil: "ஓ", sound: "oh", type: "vowels" }, // as in "go"
  { tamil: "ஔ", sound: "ow", type: "vowels" }, // as in "cow"
  // Mei eluthukkal (consonants) — pure sounds, no inherent vowel
  { tamil: "க்", sound: "k", type: "consonants" },
  { tamil: "ங்", sound: "ng", type: "consonants" },
  { tamil: "ச்", sound: "ch", type: "consonants" },
  { tamil: "ஞ்", sound: "nj", type: "consonants" },
  { tamil: "ட்", sound: "t", type: "consonants" },
  { tamil: "ண்", sound: "N", type: "consonants" },
  { tamil: "த்", sound: "th", type: "consonants" },
  { tamil: "ந்", sound: "n", type: "consonants" },
  { tamil: "ப்", sound: "p", type: "consonants" },
  { tamil: "ம்", sound: "m", type: "consonants" },
  { tamil: "ய்", sound: "y", type: "consonants" },
  { tamil: "ர்", sound: "r", type: "consonants" },
  { tamil: "ல்", sound: "l", type: "consonants" },
  { tamil: "வ்", sound: "v", type: "consonants" },
  { tamil: "ழ்", sound: "zh", type: "consonants" },
  { tamil: "ள்", sound: "L", type: "consonants" },
  { tamil: "ற்", sound: "R", type: "consonants" },
  { tamil: "ன்", sound: "n", type: "consonants" },
];

function getSelectedLetters() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (type === "vowels" || type === "consonants") {
    return TAMIL_LETTERS.filter((l) => l.type === type);
  }
  return TAMIL_LETTERS;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTamilQuestion(letters) {
  return (askedSet) => {
    const remaining = letters.filter((l) => !askedSet.has(l.tamil));
    const pool = remaining.length ? remaining : letters;
    const letter = pool[randomInt(0, pool.length - 1)];

    const correctAnswer = letter.sound;
    const distractorPool = letters.filter((l) => l.sound !== correctAnswer);
    const uniqueSounds = new Set(distractorPool.map((l) => l.sound));
    const choices = new Set([correctAnswer]);
    while (choices.size < 4 && choices.size < uniqueSounds.size + 1) {
      const pick = distractorPool[randomInt(0, distractorPool.length - 1)];
      choices.add(pick.sound);
    }

    return {
      prompt: letter.tamil,
      correctAnswer,
      choices: shuffle([...choices]),
    };
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const letters = getSelectedLetters();
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const label =
    type === "vowels" ? "Vowels (உயிர் எழுத்துக்கள்)" : type === "consonants" ? "Consonants (மெய் எழுத்துக்கள்)" : "All letters (உயிர் + மெய்)";
  document.getElementById("letters-label").textContent = label;

  const quiz = new QuizEngine({
    totalQuestions: letters.length,
    timePerQuestion: 10,
    generateQuestion: generateTamilQuestion(letters),
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("start-screen").classList.add("d-none");
    quiz.start();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    quiz.start();
  });
});
