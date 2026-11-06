/* What Do We Use? QUESTIONS rows: [question, right tool, three wrong tools].
 * Wrong tools are chosen by hand so that none of them could do the job as well. */
(function (root) {
 'use strict';
 const TOOLS = {
  toothbrush: '🪥', spoon: '🥄', scissors: '✂️', umbrella: '☂️',
  pencil: '✏️', broom: '🧹', key: '🔑', cup: '🥤',
  soap: '🧼', comb: '🪮', flashlight: '🔦', clock: '⏰',
  bucket: '🪣', backpack: '🎒', phone: '📱',
  thermometer: '🌡️', paintbrush: '🖌️', camera: '📷',
  hammer: '🔨', headphones: '🎧', shovel: '🪏',
  bandage: '🩹', fork: '🍴', magnifying_glass: '🔍',
  mirror: '🪞', ladder: '🪜', needle: '🪡', ruler: '📏',
  glasses: '👓', gloves: '🧤', scarf: '🧣', sponge: '🧽',
  compass: '🧭', stethoscope: '🩺', magnet: '🧲', envelope: '✉️',
  book: '📖', helmet: '⛑️', wrench: '🔧', map: '🗺️', socks: '🧦',
 };
 const QUESTIONS = [
  ['What do we use to brush our teeth?', 'toothbrush', 'spoon', 'comb', 'key'],
  ['What do we use to eat soup?', 'spoon', 'pencil', 'broom', 'scissors'],
  ['What can keep rain off our heads?', 'umbrella', 'cup', 'clock', 'paintbrush'],
  ['What do we use to cut paper?', 'scissors', 'toothbrush', 'phone', 'soap'],
  ['What do we use to write on paper?', 'pencil', 'shovel', 'spoon', 'comb'],
  ['What do we use to sweep the floor?', 'broom', 'camera', 'fork', 'key'],
  ['What opens a locked door?', 'key', 'soap', 'clock', 'paintbrush'],
  ['What do we drink water from?', 'cup', 'scissors', 'hammer', 'backpack'],
  ['What do we use to wash our hands?', 'soap', 'pencil', 'shovel', 'clock'],
  ['What do we use to tidy our hair?', 'comb', 'hammer', 'cup', 'camera'],
  ['What helps us see in the dark?', 'flashlight', 'toothbrush', 'spoon', 'backpack'],
  ['What shows us the time?', 'clock', 'fork', 'umbrella', 'soap'],
  ['What can carry water to a little plant?', 'bucket', 'headphones', 'key', 'scissors'],
  ['What can carry our books to school?', 'backpack', 'soap', 'fork', 'hammer'],
  ['What can we use to call grandma?', 'phone', 'comb', 'shovel', 'clock'],
  ['What checks if we have a fever?', 'thermometer', 'spoon', 'camera', 'broom'],
  ['What do we use to paint a picture?', 'paintbrush', 'key', 'soap', 'fork'],
  ['What can take a picture?', 'camera', 'toothbrush', 'clock', 'shovel'],
  ['What do we use to tap a nail into wood?', 'hammer', 'spoon', 'cup', 'comb'],
  ['What can we wear to listen to music?', 'headphones', 'umbrella', 'broom', 'key'],
  ['What do we use to dig a hole in dirt?', 'shovel', 'phone', 'paintbrush', 'soap'],
  ['What can cover a small scrape?', 'bandage', 'camera', 'scissors', 'backpack'],
  ['What do we use to pick up noodles at dinner?', 'fork', 'clock', 'umbrella', 'comb'],
  ['What makes tiny things look bigger?', 'magnifying_glass', 'broom', 'cup', 'phone'],
  ['What can we look into to see our own face?', 'mirror', 'hammer', 'sponge', 'key'],
  ['What helps us climb up to a high shelf?', 'ladder', 'spoon', 'scarf', 'pencil'],
  ['What do we use to sew on a button?', 'needle', 'bucket', 'book', 'broom'],
  ['What do we use to measure how long a line is?', 'ruler', 'soap', 'gloves', 'cup'],
  ['What can help someone see the board more clearly?', 'glasses', 'socks', 'hammer', 'shovel'],
  ['What keeps our hands warm in the snow?', 'gloves', 'fork', 'clock', 'ruler'],
  ['What keeps our neck warm on a cold day?', 'scarf', 'spoon', 'key', 'camera'],
  ['What do we use to scrub the dirty dishes?', 'sponge', 'pencil', 'ladder', 'envelope'],
  ['What shows us which way is north?', 'compass', 'bucket', 'comb', 'socks'],
  ['What does a doctor use to listen to your heartbeat?', 'stethoscope', 'broom', 'fork', 'umbrella'],
  ['What can pick up iron paper clips without touching them?', 'magnet', 'book', 'cup', 'scarf'],
  ['What do we put a letter in before we post it?', 'envelope', 'ladder', 'spoon', 'hammer'],
  ['What do we read a story from?', 'book', 'shovel', 'soap', 'wrench'],
  ['What protects our head on a building site?', 'helmet', 'fork', 'pencil', 'mirror'],
  ['What can we use to tighten a bolt?', 'wrench', 'scarf', 'sponge', 'book'],
  ['What shows us the roads to a place far away?', 'map', 'toothbrush', 'gloves', 'bucket'],
  ['What do we wear on our feet inside our shoes?', 'socks', 'clock', 'compass', 'needle'],
 ];
 const api = { TOOLS, QUESTIONS };
 if (typeof module !== 'undefined' && module.exports) module.exports = api;
 root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
