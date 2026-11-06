/* Stay Safe & Healthy. Rows: [picture, situation, the safe choice, two unsafe choices, why]. Advice is general and points to a trusted grown-up. It is not a substitute for what a family or school teaches. */
(function (root) {
  'use strict';
  const SITUATIONS = [
    ["🚸","You want to cross the road.","Stop, look both ways, then cross",["Run across without looking","Cross behind a parked bus"],"Stopping and looking keeps you safe from cars."],
    ["🚦","The crossing light is red for walkers.","Wait until it turns green",["Run across quickly","Walk across slowly"],"Red means wait."],
    ["🚲","You are going for a bike ride.","Put on your helmet first",["Ride with no helmet","Hang the helmet on the handlebars"],"A helmet protects your head if you fall."],
    ["🚗","You get into the car.","Put on your seat belt",["Stand up on the seat","Sit on the belt"],"A seat belt holds you safe if the car stops suddenly."],
    ["🔥","A stove is on and a pot is steaming.","Stay back and ask a grown-up",["Touch the pot to see if it is hot","Climb up to look inside"],"Stoves and pots can burn you."],
    ["🕯️","You find matches on the table.","Leave them and tell a grown-up",["Light one to see","Put them in your pocket"],"Matches can start a fire. Grown-ups keep them safe."],
    ["🔌","You see a wall socket.","Keep your fingers and toys away",["Poke a pencil in it","Touch it with wet hands"],"Electricity can badly hurt you."],
    ["💊","You find some colorful pills.","Do not eat them, and tell a grown-up",["Taste one","Share them with a friend"],"Medicine is only safe when a grown-up gives it to you."],
    ["🧴","There is a bottle of cleaning liquid under the sink.","Leave it alone",["Smell it up close","Take a small sip"],"Cleaning liquids can make you very ill."],
    ["🌊","You are at the beach and the waves are big.","Stay near a grown-up on the sand",["Swim out alone","Go in while nobody is watching"],"Only swim when a grown-up is watching you."],
    ["🏊","You want to play by the pool.","Wait for a grown-up to come",["Jump in by yourself","Run along the wet edge"],"Water is only safe with a grown-up watching."],
    ["🌩️","There is lightning outside.","Go indoors",["Stand under a tall tree","Fly a kite"],"Being indoors keeps you safe in a storm."],
    ["☀️","It is a very hot, sunny day.","Wear a hat and drink water",["Stay out all day with no water","Wear a thick coat"],"A hat and water help you stay cool and well."],
    ["🧑","Someone you do not know offers you sweets.","Say no and go to a grown-up you trust",["Take the sweets","Go with them to get more"],"Tell a grown-up you trust. Do not go with strangers."],
    ["🚙","A stranger in a car asks you to get in.","Say no, move away and tell a grown-up",["Get in the car","Go closer to talk"],"Never go with someone unless your family said so."],
    ["🛍️","You cannot see your family in a shop.","Stay put and ask a shop worker for help",["Run outside to look","Go home by yourself"],"A shop worker can help find your family."],
    ["📱","A game online asks for your home address.","Do not type it, and tell a grown-up",["Type your address","Send a photo of your house"],"Keep your name and address private online."],
    ["🚨","The fire alarm rings at school.","Line up and follow your teacher outside",["Hide under your desk","Go back for your bag"],"Get out quickly and stay with your teacher."],
    ["🧼","You just came in from playing outside.","Wash your hands with soap",["Eat right away","Wipe your hands on your shirt"],"Soap washes away germs you cannot see."],
    ["🤧","You need to sneeze.","Sneeze into your elbow or a tissue",["Sneeze on your friend","Sneeze into your food"],"That keeps your germs from spreading."],
    ["🪥","It is bedtime.","Brush your teeth",["Eat some candy in bed","Skip brushing all week"],"Brushing keeps your teeth strong and clean."],
    ["🍎","You are hungry after school.","Eat a piece of fruit",["Eat a whole bag of candy","Drink three sodas"],"Fruit gives your body vitamins and energy."],
    ["💧","You feel thirsty after running.","Drink some water",["Keep running and drink nothing","Drink a big bottle of soda"],"Water is the best drink for your body."],
    ["😴","You feel very sleepy, but your game is not finished.","Stop the game and go to bed",["Play all night","Hide under the blanket to keep playing"],"Sleep helps your body and your brain grow."],
    ["🐕","You see a dog you do not know.","Ask the owner before you touch it",["Run up and hug it","Pull its tail"],"Even friendly dogs can get scared. Ask first."],
    ["🥄","Your soup has just been served and is steaming.","Wait, and blow on it",["Gulp it down right now","Put your finger in it"],"Hot food can burn your mouth."],
    ["✂️","You need to carry scissors to the table.","Walk slowly with the points held down",["Run with them","Wave them in the air"],"Walking keeps you and others safe from sharp points."],
    ["🪜","Your ball is on a high shelf.","Ask a grown-up to get it",["Climb up the shelves","Stand on a wobbly chair"],"Climbing can make you fall. A grown-up can reach it."],
    ["😢","Someone at school keeps being unkind to you.","Tell a teacher or a grown-up you trust",["Keep it secret","Hit them back"],"Telling a grown-up is brave, and they can help."],
    ["🍽️","You feel a little sick and do not want the food.","Tell a grown-up how you feel",["Eat it anyway and say nothing","Hide it in your pocket"],"Telling a grown-up helps them look after you."],
  ];
  const api = { SITUATIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
