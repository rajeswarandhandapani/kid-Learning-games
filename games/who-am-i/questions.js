/* Who Am I? Rows: [answer, three clues from broad to exact, three wrong pictures]. Only the last clue has to rule out every wrong picture. */
(function (root) {
  'use strict';
  const RIDDLES = [
    [["🐘","elephant"],["I am very big.","I live in Africa and Asia.","I have a long trunk."],[["🦒","giraffe"],["🦛","hippo"],["🐭","mouse"]]],
    [["🦒","giraffe"],["I eat leaves.","I have spots.","I have the longest neck of any animal."],[["🐄","cow"],["🐘","elephant"],["🐆","leopard"]]],
    [["🐧","penguin"],["I am a bird.","I cannot fly.","I swim in cold seas."],[["🦅","eagle"],["🦉","owl"],["🐔","hen"]]],
    [["🐢","turtle"],["I am slow on land.","I lay eggs.","I carry a shell on my back."],[["🐇","rabbit"],["🐍","snake"],["🐸","frog"]]],
    [["🦇","bat"],["I come out at night.","I can fly.","I am a mammal."],[["🦉","owl"],["🐝","bee"],["🐈","cat"]]],
    [["🐝","bee"],["I have six legs.","I can fly.","I make honey."],[["🐜","ant"],["🦋","butterfly"],["🐞","ladybird"]]],
    [["🐸","frog"],["I live near water.","I was once a tadpole.","I hop and croak."],[["🐟","fish"],["🐢","turtle"],["🦆","duck"]]],
    [["🐙","octopus"],["I live in the sea.","I have no bones.","I have eight arms."],[["🐬","dolphin"],["🦈","shark"],["🐟","fish"]]],
    [["🦋","butterfly"],["I have wings.","I visit flowers.","I used to be a caterpillar."],[["🐝","bee"],["🐦","bird"],["🐜","ant"]]],
    [["🦘","kangaroo"],["I live in Australia.","I hop on big back legs.","I carry my baby in a pouch."],[["🐨","koala"],["🐇","rabbit"],["🐒","monkey"]]],
    [["🍌","banana"],["I am a fruit.","I grow in bunches.","You peel my long yellow skin."],[["🍎","apple"],["🍇","grapes"],["🍋","lemon"]]],
    [["🥭","mango"],["I am a fruit.","I have one big flat seed.","I am sweet, and I am loved in summer in India."],[["🍎","apple"],["🍇","grapes"],["🍌","banana"]]],
    [["🥕","carrot"],["I am a vegetable.","I grow under the ground.","I am long and orange."],[["🥦","broccoli"],["🌽","corn"],["🍅","tomato"]]],
    [["🍉","watermelon"],["I am a fruit.","I am green outside.","I am red and juicy inside."],[["🍌","banana"],["🥝","kiwi"],["🍋","lemon"]]],
    [["🧀","cheese"],["I am a food.","I am made from milk.","I am often yellow and sliced."],[["🍞","bread"],["🥚","egg"],["🍎","apple"]]],
    [["☀️","Sun"],["I am in the sky.","I give light and heat.","I am a star, and I rise in the morning."],[["🌙","Moon"],["☁️","cloud"],["🌈","rainbow"]]],
    [["🌙","Moon"],["I am in the sky.","I go around the Earth.","I seem to change shape each night."],[["☀️","Sun"],["⭐","star"],["☁️","cloud"]]],
    [["🌈","rainbow"],["I am in the sky.","I come when sun and rain meet.","I have seven colors."],[["☁️","cloud"],["⭐","star"],["🌙","Moon"]]],
    [["❄️","snowflake"],["I fall from the sky.","I am frozen.","I am white and have six points."],[["💧","raindrop"],["🍃","leaf"],["🪶","feather"]]],
    [["🌋","volcano"],["I am very tall.","I am made of rock.","Hot lava can burst out of my top."],[["⛰️","mountain"],["🏠","house"],["🌳","tree"]]],
    [["⏰","alarm clock"],["I sit in a bedroom.","I have numbers on my face.","I ring to wake you up."],[["📖","book"],["💡","lamp"],["🧸","teddy bear"]]],
    [["☂️","umbrella"],["You carry me.","I open up wide.","I keep the rain off you."],[["🎒","backpack"],["👜","bag"],["🧢","cap"]]],
    [["🔑","key"],["I am small and made of metal.","You keep me in your pocket.","I open a lock."],[["🪙","coin"],["📎","paper clip"],["🥄","spoon"]]],
    [["📖","book"],["I have many pages.","I have a cover.","You read stories in me."],[["📦","box"],["🖼️","picture frame"],["🪑","chair"]]],
    [["🪥","toothbrush"],["I live in the bathroom.","I have a long handle and bristles.","You use me twice a day on your teeth."],[["🧼","soap"],["🪮","comb"],["🧽","sponge"]]],
    [["🚲","bicycle"],["I have a seat.","I have two wheels.","You turn my pedals with your feet."],[["🚗","car"],["🚌","bus"],["🛴","scooter"]]],
    [["🚂","train"],["I carry many people.","I have many carriages.","I run along rails."],[["🚌","bus"],["✈️","plane"],["⛵","boat"]]],
    [["🚒","fire engine"],["I am big and have a loud siren.","I am red.","I carry water and ladders to a fire."],[["🚌","bus"],["🚑","ambulance"],["🚜","tractor"]]],
    [["🚀","rocket"],["I go very fast.","I roar and leave fire behind me.","I carry astronauts to space."],[["✈️","plane"],["🚁","helicopter"],["🚂","train"]]],
    [["🦷","tooth"],["I am in your body.","I am hard and white.","You use me to bite and chew."],[["👂","ear"],["👃","nose"],["✋","hand"]]],
  ];
  const api = { RIDDLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
