'use strict';
const { FEELINGS, MOMENTS } = window.KlgQuestions;
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
document.addEventListener('DOMContentLoaded', () => {
  const quiz = new QuizEngine({
    totalQuestions: 10,
    timePerQuestion: 30,
    generateQuestion: asked => {
      const available = MOMENTS.filter(([prompt]) => !asked.has(prompt));
      const [prompt, feeling] = shuffle(available.length ? available : MOMENTS)[0];
      const answer = FEELINGS.find(item => item[1] === feeling);
      const choices = shuffle([answer, ...shuffle(FEELINGS.filter(item => item !== answer)).slice(0, 3)]);
      return {
        prompt, correctAnswer: answer[0], choices: choices.map(item => item[0]),
        choiceLabels: Object.fromEntries(choices.map(item => [item[0], item[1]])),
        explanation: `That face shows ${feeling}.`
      };
    }
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('d-none'); quiz.start();
  });
  document.getElementById('play-again-btn').addEventListener('click', () => quiz.start());
});
