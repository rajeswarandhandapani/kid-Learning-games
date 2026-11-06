/* Feelings Faces. MOMENTS rows: [little story with a question, feeling].
 * Each story has clues that point to one feeling, so a choice is never quietly right too. */
(function (root) {
 'use strict';
 const FEELINGS = [
  ['😊','happy'], ['😢','sad'], ['😠','angry'],
  ['😨','scared'], ['😮','surprised'], ['😌','calm'],
 ];
 const MOMENTS = [
  ['Mia got a big hug from her grandma. How does Mia feel?', 'happy'],
  ['Leo found his lost puppy. How does Leo feel?', 'happy'],
  ['Nila is laughing while she plays with her friend. How does Nila feel?', 'happy'],
  ['Arun scored a goal and his team cheered. He jumped up and down, smiling. How does Arun feel?', 'happy'],
  ['Priya’s best friend came over to play. She clapped and danced. How does Priya feel?', 'happy'],
  ['The dog wagged its tail when its family came home. How does the dog feel?', 'happy'],
  ['Kai ate his favorite food at a party and grinned at everyone. How does Kai feel?', 'happy'],
  ['Sam lost his favorite toy and began to cry. How does Sam feel?', 'sad'],
  ['Ava misses her friend and has tears in her eyes. How does Ava feel?', 'sad'],
  ['The little bear dropped its ice cream and started to cry. How does the bear feel?', 'sad'],
  ['Tara’s best friend moved far away. She sat by the window and wiped her eyes. How does Tara feel?', 'sad'],
  ['Hari’s balloon floated away. He looked up and his lip began to shake. How does Hari feel?', 'sad'],
  ['Nobody picked the little penguin for the game, and it hung its head and sniffled. How does the penguin feel?', 'sad'],
  ["Ben's tower was knocked over. He frowned and stomped his feet. How does Ben feel?", 'angry'],
  ['Jo asked someone to stop taking her toys. She frowned. How does Jo feel?', 'angry'],
  ['The fox growled because another fox grabbed its snack. How does the fox feel?', 'angry'],
  ['Someone tore Meena’s drawing on purpose. She crossed her arms and shouted, “Stop!” How does Meena feel?', 'angry'],
  ['Dev’s brother would not give back his bike. Dev’s face went red and he clenched his fists. How does Dev feel?', 'angry'],
  ['The cat hissed and flicked its tail when a dog took its bed. How does the cat feel?', 'angry'],
  ['Omar heard a loud thunderclap and hid under his blanket. How does Omar feel?', 'scared'],
  ['The kitten saw a big barking dog and ran to hide. How does the kitten feel?', 'scared'],
  ['A dark room made Zara tremble and hold Dad’s hand. How does Zara feel?', 'scared'],
  ['Asha could not see her mom in the crowded shop. Her heart beat fast and she called out. How does Asha feel?', 'scared'],
  ['A huge wave rushed up the beach. Vikram gasped and ran to his dad. How does Vikram feel?', 'scared'],
  ['The small mouse heard the owl above and froze, shaking. How does the mouse feel?', 'scared'],
  ['Dad opened a box and found a surprise birthday cake inside. How does Dad feel?', 'surprised'],
  ['A butterfly landed on Nila’s nose when she did not expect it. How does Nila feel?', 'surprised'],
  ['Ava opened her bag and found a mystery gift. Her eyes grew wide. How does Ava feel?', 'surprised'],
  ['Everyone jumped out and shouted, “Happy birthday!” Rosa’s mouth fell open. How does Rosa feel?', 'surprised'],
  ['Jay lifted a rock and a tiny frog hopped out. He gasped, “Oh!” How does Jay feel?', 'surprised'],
  ['Grandpa pulled a coin from behind Lily’s ear. She blinked and said, “How?” How does Lily feel?', 'surprised'],
  ['Mia took slow breaths and rested in a quiet garden. How does Mia feel?', 'calm'],
  ['Ben sat quietly and watched the clouds drift by. How does Ben feel?', 'calm'],
  ['The puppy curled up in a warm bed and relaxed. How does the puppy feel?', 'calm'],
  ['Kiran lay on the soft grass and listened to the birds, in no hurry at all. How does Kiran feel?', 'calm'],
  ['Maya sat with a book by the window while the rain pattered softly. How does Maya feel?', 'calm'],
  ['The old cat stretched out in a patch of sun and slowly closed its eyes. How does the cat feel?', 'calm'],
  ['Sara breathed in, then out, and her shoulders dropped. Everything felt still. How does Sara feel?', 'calm'],
  ['Raj’s kite flew higher than all the others. He laughed and waved at his mom. How does Raj feel?', 'happy'],
  ['A loud firework went off right behind Ella. She jumped and covered her ears, shaking. How does Ella feel?', 'scared'],
 ];
 const api = { FEELINGS, MOMENTS };
 if (typeof module !== 'undefined' && module.exports) module.exports = api;
 root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
