// Trivia Fetch! — Question Engine + Gemini AI Integration
// Categories, fallback questions, and AI-powered question generation

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// ─── Categories ───────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'disney',      name: 'Disney',       emoji: '🏰', color: '#9B59B6' },
  { id: 'harrypotter', name: 'Harry Potter',  emoji: '⚡', color: '#AE1438' },
  { id: 'horror',      name: 'Horror',        emoji: '🎃', color: '#34495E' },
  { id: 'animals',     name: 'Animals',       emoji: '🐾', color: '#27AE60' },
  { id: 'tv',          name: 'TV Shows',      emoji: '📺', color: '#3498DB' },
  { id: 'movies',      name: 'Movies',        emoji: '🎬', color: '#E67E22' },
  { id: 'music',       name: 'Music',         emoji: '🎵', color: '#E91E63' },
  { id: 'science',     name: 'Science',       emoji: '🔬', color: '#00BCD4' },
];

export const WHEEL_SEGMENTS = [
  ...CATEGORIES,
  { id: 'crown', name: 'Crown Challenge', emoji: '👑', color: '#F1C40F', type: 'crown' },
  { id: 'wild',  name: "Gus's Wild",      emoji: '🐕', color: '#FF9800', type: 'wild' },
];

// ─── Fallback Questions (when Gemini is unavailable) ──────────
const FALLBACK = {
  disney: [
    { question: "What year did Disneyland first open its gates?", options: ["1945", "1955", "1965", "1975"], correctIndex: 1, funFact: "Disneyland opened on July 17, 1955 in Anaheim, California!", difficulty: "medium" },
    { question: "What is the name of Simba's father in The Lion King?", options: ["Scar", "Mufasa", "Rafiki", "Zazu"], correctIndex: 1, funFact: "Mufasa means 'King' in the Manazoto language!", difficulty: "easy" },
    { question: "Which Disney princess can control ice and snow?", options: ["Anna", "Rapunzel", "Elsa", "Moana"], correctIndex: 2, funFact: "Frozen became the highest-grossing animated film at the time of its release!", difficulty: "easy" },
    { question: "What type of fish is Nemo?", options: ["Surgeonfish", "Clownfish", "Angelfish", "Pufferfish"], correctIndex: 1, funFact: "Clownfish can change their gender — all are born male!", difficulty: "easy" },
    { question: "In Tangled, how long is Rapunzel's hair?", options: ["40 feet", "50 feet", "70 feet", "100 feet"], correctIndex: 2, funFact: "Rapunzel's hair contains about 100,000 individual strands in the animation!", difficulty: "hard" },
    { question: "What is the name of the fairy in Peter Pan?", options: ["Tinker Bell", "Silvermist", "Rosetta", "Fawn"], correctIndex: 0, funFact: "Tinker Bell was originally voiced with just jingling bells — no spoken lines!", difficulty: "easy" },
    { question: "Which Disney villain has a pet parrot named Iago?", options: ["Hades", "Jafar", "Captain Hook", "Gaston"], correctIndex: 1, funFact: "Iago was voiced by comedian Gilbert Gottfried!", difficulty: "medium" },
  ],
  harrypotter: [
    { question: "What is the name of Harry Potter's owl?", options: ["Errol", "Pigwidgeon", "Hedwig", "Scabbers"], correctIndex: 2, funFact: "Hedwig was a Snowy Owl — one of the largest owl species!", difficulty: "easy" },
    { question: "Which Hogwarts house does Harry belong to?", options: ["Slytherin", "Hufflepuff", "Ravenclaw", "Gryffindor"], correctIndex: 3, funFact: "The Sorting Hat almost put Harry in Slytherin!", difficulty: "easy" },
    { question: "What is Voldemort's real name?", options: ["Tom Riddle", "Severus Prince", "Regulus Black", "Barty Crouch"], correctIndex: 0, funFact: "Voldemort's name is an anagram of his birth name, Tom Marvolo Riddle!", difficulty: "medium" },
    { question: "What position does Harry play in Quidditch?", options: ["Chaser", "Beater", "Keeper", "Seeker"], correctIndex: 3, funFact: "Harry was the youngest Seeker in a century at Hogwarts!", difficulty: "easy" },
    { question: "What magical object shows the viewer their deepest desire?", options: ["Pensieve", "Mirror of Erised", "Time-Turner", "Remembrall"], correctIndex: 1, funFact: "'Erised' is 'Desire' spelled backwards!", difficulty: "medium" },
    { question: "What is the core of Harry's wand?", options: ["Dragon heartstring", "Unicorn hair", "Phoenix feather", "Thestral tail"], correctIndex: 2, funFact: "Harry's wand shares its core with Voldemort's — both contain feathers from Fawkes!", difficulty: "hard" },
  ],
  horror: [
    { question: "In what year was the original Halloween movie released?", options: ["1974", "1976", "1978", "1980"], correctIndex: 2, funFact: "The movie was filmed in just 20 days on a tiny budget of $300,000!", difficulty: "medium" },
    { question: "What is the name of the hotel in The Shining?", options: ["Bates Motel", "The Overlook Hotel", "Hotel & Spa", "The Stanley Hotel"], correctIndex: 1, funFact: "The Stanley Hotel in Colorado inspired Stephen King to write The Shining!", difficulty: "medium" },
    { question: "Who directed the movie Get Out?", options: ["James Wan", "Jordan Peele", "Ari Aster", "Mike Flanagan"], correctIndex: 1, funFact: "Jordan Peele won the Academy Award for Best Original Screenplay for Get Out!", difficulty: "medium" },
    { question: "What is the name of the killer doll in Child's Play?", options: ["Annabelle", "Chucky", "Billy", "Tiffany"], correctIndex: 1, funFact: "Chucky's full name is Charles Lee Ray — named after three real killers!", difficulty: "easy" },
    { question: "In Jaws, what type of shark terrorizes the town?", options: ["Hammerhead", "Tiger Shark", "Bull Shark", "Great White"], correctIndex: 3, funFact: "The mechanical shark was nicknamed 'Bruce' after Spielberg's lawyer!", difficulty: "easy" },
    { question: "What horror franchise features a puzzle box called the Lament Configuration?", options: ["Saw", "Hellraiser", "Phantasm", "Evil Dead"], correctIndex: 1, funFact: "The original Hellraiser was based on Clive Barker's novella 'The Hellbound Heart'!", difficulty: "hard" },
  ],
  animals: [
    { question: "What is the largest living species of lizard?", options: ["Iguana", "Monitor Lizard", "Komodo Dragon", "Gila Monster"], correctIndex: 2, funFact: "Komodo Dragons can eat up to 80% of their body weight in a single meal!", difficulty: "medium" },
    { question: "How many hearts does an octopus have?", options: ["One", "Two", "Three", "Four"], correctIndex: 2, funFact: "Two hearts pump blood to the gills, while the third pumps it to the body!", difficulty: "medium" },
    { question: "What is a group of flamingos called?", options: ["A flock", "A flamboyance", "A parade", "A colony"], correctIndex: 1, funFact: "Flamingos are born white — their pink color comes from their diet of brine shrimp!", difficulty: "hard" },
    { question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Pronghorn", "Greyhound"], correctIndex: 1, funFact: "Cheetahs can accelerate from 0 to 60 mph in just 3 seconds!", difficulty: "easy" },
    { question: "Which animal sleeps the most hours per day?", options: ["Cat", "Sloth", "Koala", "Bat"], correctIndex: 2, funFact: "Koalas sleep up to 22 hours a day because eucalyptus leaves provide very little energy!", difficulty: "hard" },
    { question: "What is the only mammal that can truly fly?", options: ["Flying Squirrel", "Sugar Glider", "Bat", "Colugo"], correctIndex: 2, funFact: "Bats make up nearly 20% of all classified mammal species!", difficulty: "easy" },
  ],
  tv: [
    { question: "What is the longest-running animated TV show in US history?", options: ["Family Guy", "South Park", "The Simpsons", "SpongeBob"], correctIndex: 2, funFact: "The Simpsons first aired in 1989 and has over 750 episodes!", difficulty: "easy" },
    { question: "In Stranger Things, what is the parallel dimension called?", options: ["The Shadow Realm", "The Upside Down", "The Other Side", "The Dark World"], correctIndex: 1, funFact: "The Duffer Brothers originally called the show 'Montauk' before Netflix renamed it!", difficulty: "easy" },
    { question: "What is the fictional continent in Game of Thrones?", options: ["Tamriel", "Middle-earth", "Westeros", "Narnia"], correctIndex: 2, funFact: "George R.R. Martin based Westeros roughly on the shape of Great Britain!", difficulty: "easy" },
    { question: "In Friends, what is the name of the coffee shop?", options: ["The Coffee Bean", "Central Perk", "Brewed Awakening", "Mocha Joe's"], correctIndex: 1, funFact: "The orange couch at Central Perk was found in a Warner Bros. storage basement!", difficulty: "easy" },
    { question: "Which TV show features a paper company called Dunder Mifflin?", options: ["30 Rock", "Parks and Recreation", "The Office", "Silicon Valley"], correctIndex: 2, funFact: "Steve Carell was not originally planned to be the lead — the role was offered to others first!", difficulty: "easy" },
    { question: "In Breaking Bad, what is Walter White's alter ego?", options: ["Heisenberg", "The Cook", "Cap'n Cook", "The Chemist"], correctIndex: 0, funFact: "The name Heisenberg comes from the real physicist Werner Heisenberg!", difficulty: "medium" },
  ],
  movies: [
    { question: "Who directed Jurassic Park?", options: ["James Cameron", "Steven Spielberg", "George Lucas", "Ridley Scott"], correctIndex: 1, funFact: "The T-Rex roar was made from baby elephant, tiger, and alligator sounds mixed together!", difficulty: "easy" },
    { question: "What is the first rule of Fight Club?", options: ["Always fight fair", "No weapons allowed", "You do not talk about Fight Club", "Everyone fights"], correctIndex: 2, funFact: "Brad Pitt and Edward Norton actually learned to make soap for the movie!", difficulty: "easy" },
    { question: "In The Matrix, what color pill does Neo take?", options: ["Blue", "Red", "Green", "Purple"], correctIndex: 1, funFact: "The 'digital rain' code was actually made from reversed Japanese cookbook recipes!", difficulty: "easy" },
    { question: "Which movie features the quote 'Here's looking at you, kid'?", options: ["Gone with the Wind", "Casablanca", "The Maltese Falcon", "Citizen Kane"], correctIndex: 1, funFact: "Humphrey Bogart ad-libbed this famous line — it was not in the original script!", difficulty: "medium" },
    { question: "How many Lord of the Rings movies did Peter Jackson direct?", options: ["Two", "Three", "Four", "Six"], correctIndex: 1, funFact: "All three films were shot simultaneously over 438 consecutive days in New Zealand!", difficulty: "easy" },
    { question: "What fictional country is Black Panther set in?", options: ["Zamunda", "Wakanda", "Genovia", "Latveria"], correctIndex: 1, funFact: "The Wakandan language in the film is actually Xhosa, a real South African language!", difficulty: "easy" },
  ],
  music: [
    { question: "Who is known as the 'Queen of Pop'?", options: ["Lady Gaga", "Beyonce", "Madonna", "Whitney Houston"], correctIndex: 2, funFact: "Madonna has sold over 300 million records worldwide!", difficulty: "easy" },
    { question: "What band was Freddie Mercury the lead singer of?", options: ["The Beatles", "Led Zeppelin", "Queen", "The Rolling Stones"], correctIndex: 2, funFact: "Freddie Mercury had four extra teeth in his upper jaw, giving him his distinctive voice!", difficulty: "easy" },
    { question: "Which instrument typically has 88 keys?", options: ["Organ", "Accordion", "Piano", "Harpsichord"], correctIndex: 2, funFact: "A piano has 52 white keys and 36 black keys!", difficulty: "easy" },
    { question: "Which country is the band BTS from?", options: ["Japan", "China", "South Korea", "Thailand"], correctIndex: 2, funFact: "BTS stands for 'Bangtan Sonyeondan' which means 'Bulletproof Boy Scouts'!", difficulty: "easy" },
    { question: "What was the best-selling album of all time?", options: ["Abbey Road", "Back in Black", "Thriller", "The Dark Side of the Moon"], correctIndex: 2, funFact: "Michael Jackson's Thriller has sold over 70 million copies worldwide!", difficulty: "medium" },
    { question: "Which artist painted the album cover for The Beatles' 'Sgt. Pepper'?", options: ["Andy Warhol", "Peter Blake", "Roy Lichtenstein", "David Hockney"], correctIndex: 1, funFact: "The cover features over 70 famous figures including Edgar Allan Poe and Marilyn Monroe!", difficulty: "hard" },
  ],
  science: [
    { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correctIndex: 2, funFact: "Au comes from the Latin word 'Aurum' meaning 'shining dawn'!", difficulty: "medium" },
    { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correctIndex: 1, funFact: "Pluto was reclassified as a 'dwarf planet' in 2006!", difficulty: "easy" },
    { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"], correctIndex: 2, funFact: "Mitochondria have their own DNA, separate from the cell's nucleus!", difficulty: "easy" },
    { question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 2, funFact: "Trees can absorb up to 48 pounds of CO2 per year!", difficulty: "easy" },
    { question: "What is the hardest natural substance on Earth?", options: ["Titanium", "Quartz", "Diamond", "Tungsten"], correctIndex: 2, funFact: "Diamonds are made of carbon atoms arranged in a crystal structure under extreme pressure!", difficulty: "easy" },
    { question: "How many bones does an adult human have?", options: ["186", "206", "226", "246"], correctIndex: 1, funFact: "Babies are born with about 270 bones — many fuse together as they grow!", difficulty: "medium" },
  ],
};

// ─── Gemini AI Setup ──────────────────────────────────────────
let model = null;

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-api-key-here') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    console.log('🤖 Gemini AI connected — dynamic questions enabled!');
  } catch (e) {
    console.warn('⚠️  Gemini setup failed, using fallback questions:', e.message);
  }
} else {
  console.log('📋 No Gemini API key — using fallback question bank');
}

// ─── Question Generation ──────────────────────────────────────
function getRandomFallback(categoryId, usedHashes) {
  const pool = FALLBACK[categoryId];
  if (!pool || pool.length === 0) {
    // Fallback to a random category if somehow missing
    const keys = Object.keys(FALLBACK);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return FALLBACK[randomKey][Math.floor(Math.random() * FALLBACK[randomKey].length)];
  }

  // Try to find an unused question
  const unused = pool.filter(q => !usedHashes.has(q.question.substring(0, 50)));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }

  // All used — pick random anyway
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateQuestion(categoryId, usedHashes = new Set()) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  const catName = category ? category.name : categoryId;

  if (!model) return getRandomFallback(categoryId, usedHashes);

  try {
    const prompt = `You are the trivia engine for "Trivia Fetch!", a fun multiplayer trivia game hosted by Gus the Goldendoodle.

Generate ONE trivia question for the category: "${catName}"

Rules:
- Make it interesting and fun, not obscure or trick-based
- All 4 answer options should be plausible (no joke answers)
- Include a brief, delightful fun fact about the correct answer
- Vary difficulty across easy/medium/hard

Respond with ONLY this JSON (no markdown fences, no extra text):
{"question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"...","difficulty":"medium"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const q = JSON.parse(text);

    // Validate structure
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
        typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error('Invalid question structure from Gemini');
    }

    return q;
  } catch (e) {
    console.warn('Gemini question failed, using fallback:', e.message);
    return getRandomFallback(categoryId, usedHashes);
  }
}

// ─── Gus's Wild Questions ─────────────────────────────────────
const WILD_FALLBACKS = [
  { question: "What would a goldendoodle's favorite pizza topping be?", options: ["Pepperoni", "Bacon", "Tennis Balls", "Cheese"], correctIndex: 1, funFact: "Dogs actually can smell up to 100,000 times better than humans — imagine how good bacon smells to them!", difficulty: "easy" },
  { question: "If dogs could use social media, what platform would they prefer?", options: ["Bark-stagram", "Tik-Bark", "Fetch-book", "X (formerly known as Woof)"], correctIndex: 0, funFact: "There are actually millions of dog accounts on Instagram — some with more followers than most humans!", difficulty: "easy" },
  { question: "How many times can a goldendoodle wag its tail per minute?", options: ["About 50", "About 100", "About 200", "About 500"], correctIndex: 1, funFact: "Dogs wag their tails to the right when happy and to the left when nervous!", difficulty: "medium" },
];

export async function generateWildQuestion() {
  if (!model) return WILD_FALLBACKS[Math.floor(Math.random() * WILD_FALLBACKS.length)];

  try {
    const prompt = `You are Gus, an adorable goldendoodle game show host. Generate a FUN, quirky, creative trivia question that mixes categories or is dog-themed.

It should be answerable (not nonsense) but playful and surprising. Think "fun pub trivia" energy.

Respond with ONLY this JSON (no markdown fences):
{"question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"...","difficulty":"medium"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const q = JSON.parse(text);

    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error('Invalid wild question');
    }
    return q;
  } catch (e) {
    return WILD_FALLBACKS[Math.floor(Math.random() * WILD_FALLBACKS.length)];
  }
}

// ─── Gus Commentary ───────────────────────────────────────────
const GUS_DEFAULTS = {
  correct: [
    "WOOF! Nailed it! You're pawsitively brilliant! 🐾",
    "That's my human! Treat-worthy answer! 🦴",
    "Arf arf! Somebody's been doing their homework! 📚",
    "Golden retriev— I mean, golden ANSWER! ⭐",
    "*happy tail wags* You're on FIRE! 🔥",
    "Bow-WOW! That was ruff-ly amazing! 🌟",
  ],
  wrong: [
    "Aww, don't worry pupper! Everyone trips on a stick sometimes! 🐕",
    "Oops! But hey, even the best doggos miss a squirrel now and then! 🐿️",
    "*tilts head* That wasn't it, friend, but keep your tail up! 💪",
    "Ruh-roh! But you'll fetch the next one for sure! 🎾",
    "No treats this time, but I still love ya! ❤️",
  ],
  timeout: [
    "Time's up! Even I can't hold a 'stay' forever! ⏰",
    "Woof, that clock moves faster than a greyhound! 🏃",
    "*drops ball at your feet* Time ran out, friend! Next time! 🎾",
  ],
  streak: [
    "🔥 STREAK! You're hotter than a fresh batch of pup-cakes! 🧁",
    "🔥 ON A ROLL! Like me rolling in the grass! 🌿",
    "🔥 UNSTOPPABLE! Even the mailman couldn't stop you! 📬",
  ],
  stamp: [
    "NEW PAW STAMP! *does excited zoomies* 🐾✨",
    "STAMP EARNED! One paw closer to the crown! 👑",
    "You fetched that stamp like a CHAMP! 🏆",
  ],
  crown_attempt: [
    "👑 CROWN CHALLENGE! This is it! The big fetch! I believe in you!",
    "👑 THE CROWN QUESTION! *sits very still* You've got this, human!",
  ],
  crown_not_ready: [
    "Almost there, pupper! Keep collecting those stamps! 🐾",
    "Need more paw stamps before I hand over the crown! Keep fetching! 👑",
  ],
  wild: [
    "🐕 GUS'S WILD CARD! Time for one of MY special questions! *excited bark*",
    "🐕 WILD TIME! Gus picked this one just for you! *tail helicopter*",
  ],
  win: [
    "🎉👑 THE CROWN IS YOURS!! *barks uncontrollably* BEST. HUMAN. EVER! 🏆",
    "🎉👑 WINNER WINNER CHICKEN DINNER! ...wait, is there actual chicken? 🍗",
  ],
};

export async function getGusReaction(event, context = {}) {
  // Try Gemini for custom reactions, fall back to defaults
  const defaults = GUS_DEFAULTS[event] || GUS_DEFAULTS.correct;
  const fallback = defaults[Math.floor(Math.random() * defaults.length)];

  if (!model) return fallback;

  try {
    const prompt = `You are Gus, an adorable and enthusiastic goldendoodle who hosts the trivia game show "Trivia Fetch!". 
You're bubbly, punny, love treats and belly rubs, and you call things "pawsome". You say "woof" and "arf" sometimes. 
Keep it to 1-2 SHORT sentences. Be cute and encouraging. Use 1-2 emojis max.

The player "${context.playerName || 'someone'}" just: ${event}${context.detail ? `. Context: ${context.detail}` : ''}

React as Gus (plain text, no JSON):`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().substring(0, 200);
  } catch {
    return fallback;
  }
}
