/* Punctuation Pals. Rows: [sentence without its last mark, the mark, why]. Exclamations carry a clear word of feeling or warning, so the choice is never a matter of taste. */
(function (root) {
  'use strict';
  const SENTENCES = [
    ["What is your name","?","It asks something, so it needs a question mark."],
    ["Where do you live","?","It asks something, so it needs a question mark."],
    ["How old is your sister","?","It starts with “how” and asks something."],
    ["Can you help me","?","It asks for an answer."],
    ["When does the bus come","?","It starts with “when” and asks something."],
    ["Why is the sky blue","?","It starts with “why” and asks something."],
    ["Do you like mangoes","?","It asks for a yes or no answer."],
    ["Who ate the last cookie","?","It starts with “who” and asks something."],
    ["Is it raining outside","?","It asks for a yes or no answer."],
    ["Which book did you choose","?","It starts with “which” and asks something."],
    ["The cat sleeps on the mat",".","It simply tells us something, so it ends with a full stop."],
    ["I walk to school every day",".","It simply tells us something."],
    ["My brother has a red bike",".","It simply tells us something."],
    ["We ate rice for lunch",".","It simply tells us something."],
    ["The sun rises in the east",".","It tells us a fact."],
    ["Birds build nests in trees",".","It tells us a fact."],
    ["Grandma lives near the sea",".","It simply tells us something."],
    ["The library opens at nine",".","It tells us a fact."],
    ["My shoes are by the door",".","It simply tells us something."],
    ["Please close the window",".","It is a calm request, so a full stop is right."],
    ["Wow, what a huge wave","!","“Wow” shows a big feeling, so it needs an exclamation mark."],
    ["Look out, a snake","!","It is an urgent warning."],
    ["Hooray, we won the game","!","“Hooray” shows a big feeling."],
    ["Help, I am stuck","!","It is an urgent call for help."],
    ["Ouch, that really hurt","!","“Ouch” shows a sudden feeling."],
    ["What a beautiful rainbow","!","It shows amazement. It is not asking anything."],
    ["Stop, the road is not safe","!","It is an urgent warning."],
    ["Yay, it is my birthday","!","“Yay” shows a big feeling."],
    ["Oh no, I dropped my ice cream","!","“Oh no” shows a sudden feeling."],
    ["Happy birthday to you","!","It is an excited greeting."],
  ];
  const api = { SENTENCES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
