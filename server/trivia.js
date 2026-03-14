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
    { question: "What is the name of Woody's horse in Toy Story?", options: ["Bullseye", "Buttercup", "Maximus", "Spirit"], correctIndex: 0, funFact: "Bullseye never speaks — he communicates entirely through body language!", difficulty: "easy" },
    { question: "In The Little Mermaid, what does Ariel trade for legs?", options: ["Her hair", "Her voice", "Her tail", "Her trident"], correctIndex: 1, funFact: "Ariel's appearance was partly inspired by model Sherri Stoner!", difficulty: "easy" },
    { question: "What is the name of the rat who wants to be a chef in Ratatouille?", options: ["Emile", "Remy", "Alfredo", "Gusteau"], correctIndex: 1, funFact: "Remy's sense of smell was animated using over 270 distinct food models!", difficulty: "easy" },
    { question: "Which Disney movie features a magic carpet ride?", options: ["Mulan", "Aladdin", "Hercules", "Moana"], correctIndex: 1, funFact: "The magic carpet was animated with no facial features — all emotion comes from its tassels!", difficulty: "easy" },
    { question: "What color is Sulley in Monsters, Inc.?", options: ["Green", "Blue", "Purple", "Red"], correctIndex: 1, funFact: "Sulley has over 2.3 million individual hairs — each one was individually animated!", difficulty: "easy" },
    { question: "What does Buzz Lightyear say as his catchphrase?", options: ["To the stars!", "To infinity and beyond!", "Blast off!", "Space ranger, go!"], correctIndex: 1, funFact: "Tim Allen recorded most of Buzz's lines in just a few sessions!", difficulty: "easy" },
    { question: "In Encanto, what is Mirabel's last name?", options: ["Madrigal", "Martinez", "Morales", "Mendez"], correctIndex: 0, funFact: "The Madrigal family's magic house, Casita, is its own character in the film!", difficulty: "medium" },
  ],
  harrypotter: [
    { question: "What is the name of Harry Potter's owl?", options: ["Errol", "Pigwidgeon", "Hedwig", "Scabbers"], correctIndex: 2, funFact: "Hedwig was a Snowy Owl — one of the largest owl species!", difficulty: "easy" },
    { question: "Which Hogwarts house does Harry belong to?", options: ["Slytherin", "Hufflepuff", "Ravenclaw", "Gryffindor"], correctIndex: 3, funFact: "The Sorting Hat almost put Harry in Slytherin!", difficulty: "easy" },
    { question: "What is Voldemort's real name?", options: ["Tom Riddle", "Severus Prince", "Regulus Black", "Barty Crouch"], correctIndex: 0, funFact: "Voldemort's name is an anagram of his birth name, Tom Marvolo Riddle!", difficulty: "medium" },
    { question: "What position does Harry play in Quidditch?", options: ["Chaser", "Beater", "Keeper", "Seeker"], correctIndex: 3, funFact: "Harry was the youngest Seeker in a century at Hogwarts!", difficulty: "easy" },
    { question: "What magical object shows the viewer their deepest desire?", options: ["Pensieve", "Mirror of Erised", "Time-Turner", "Remembrall"], correctIndex: 1, funFact: "'Erised' is 'Desire' spelled backwards!", difficulty: "medium" },
    { question: "What is the core of Harry's wand?", options: ["Dragon heartstring", "Unicorn hair", "Phoenix feather", "Thestral tail"], correctIndex: 2, funFact: "Harry's wand shares its core with Voldemort's — both contain feathers from Fawkes!", difficulty: "hard" },
    { question: "What is the name of the three-headed dog guarding the trapdoor?", options: ["Fang", "Fluffy", "Norbert", "Buckbeak"], correctIndex: 1, funFact: "Fluffy was inspired by Cerberus from Greek mythology!", difficulty: "easy" },
    { question: "What subject does Professor McGonagall teach?", options: ["Potions", "Transfiguration", "Charms", "Defense Against the Dark Arts"], correctIndex: 1, funFact: "McGonagall is also an Animagus who can transform into a tabby cat!", difficulty: "easy" },
    { question: "What type of dragon does Harry face in the Triwizard Tournament?", options: ["Norwegian Ridgeback", "Hungarian Horntail", "Swedish Short-Snout", "Chinese Fireball"], correctIndex: 1, funFact: "The Hungarian Horntail is considered the most dangerous dragon species!", difficulty: "medium" },
    { question: "What is the name of the magical map that shows everyone's location?", options: ["The Tracing Chart", "The Hogwarts Atlas", "The Marauder's Map", "The Sneaking Scroll"], correctIndex: 2, funFact: "The map was created by Moony, Wormtail, Padfoot, and Prongs!", difficulty: "easy" },
    { question: "What is Hermione's cat called?", options: ["Mrs. Norris", "Crookshanks", "Scabbers", "Trevor"], correctIndex: 1, funFact: "Crookshanks is half-Kneazle, a magical cat-like creature!", difficulty: "easy" },
    { question: "Which spell disarms an opponent?", options: ["Stupefy", "Expelliarmus", "Petrificus Totalus", "Lumos"], correctIndex: 1, funFact: "Expelliarmus became Harry's signature spell — he used it to defeat Voldemort!", difficulty: "easy" },
    { question: "What does the acronym S.P.E.W. stand for?", options: ["Society for the Promotion of Elfish Welfare", "Students Protecting Endangered Wizards", "Society for the Prevention of Evil Witchcraft", "Special Patrol for Enchanted Woodlands"], correctIndex: 0, funFact: "Hermione founded S.P.E.W. in her fourth year to campaign for house-elf rights!", difficulty: "hard" },
  ],
  horror: [
    { question: "In what year was the original Halloween movie released?", options: ["1974", "1976", "1978", "1980"], correctIndex: 2, funFact: "The movie was filmed in just 20 days on a tiny budget of $300,000!", difficulty: "medium" },
    { question: "What is the name of the hotel in The Shining?", options: ["Bates Motel", "The Overlook Hotel", "Hotel & Spa", "The Stanley Hotel"], correctIndex: 1, funFact: "The Stanley Hotel in Colorado inspired Stephen King to write The Shining!", difficulty: "medium" },
    { question: "Who directed the movie Get Out?", options: ["James Wan", "Jordan Peele", "Ari Aster", "Mike Flanagan"], correctIndex: 1, funFact: "Jordan Peele won the Academy Award for Best Original Screenplay for Get Out!", difficulty: "medium" },
    { question: "What is the name of the killer doll in Child's Play?", options: ["Annabelle", "Chucky", "Billy", "Tiffany"], correctIndex: 1, funFact: "Chucky's full name is Charles Lee Ray — named after three real killers!", difficulty: "easy" },
    { question: "In Jaws, what type of shark terrorizes the town?", options: ["Hammerhead", "Tiger Shark", "Bull Shark", "Great White"], correctIndex: 3, funFact: "The mechanical shark was nicknamed 'Bruce' after Spielberg's lawyer!", difficulty: "easy" },
    { question: "What horror franchise features a puzzle box called the Lament Configuration?", options: ["Saw", "Hellraiser", "Phantasm", "Evil Dead"], correctIndex: 1, funFact: "The original Hellraiser was based on Clive Barker's novella 'The Hellbound Heart'!", difficulty: "hard" },
    { question: "What is the name of the possessed girl in The Exorcist?", options: ["Carrie", "Samara", "Regan", "Esther"], correctIndex: 2, funFact: "Linda Blair was only 13 years old when she played Regan!", difficulty: "medium" },
    { question: "Which horror movie features a clown named Pennywise?", options: ["Killer Klowns from Outer Space", "It", "Poltergeist", "Terrifier"], correctIndex: 1, funFact: "Pennywise appears every 27 years in the fictional town of Derry, Maine!", difficulty: "easy" },
    { question: "In Scream, what is the name of the masked killer's identity?", options: ["Leatherface", "Ghostface", "Jason", "Michael"], correctIndex: 1, funFact: "The Ghostface mask was actually found in a house by a location scout during pre-production!", difficulty: "easy" },
    { question: "What horror film features the line 'They're here'?", options: ["The Ring", "Poltergeist", "The Conjuring", "Paranormal Activity"], correctIndex: 1, funFact: "Poltergeist was directed by Tobe Hooper but heavily influenced by producer Steven Spielberg!", difficulty: "medium" },
    { question: "Which horror movie takes place on Elm Street?", options: ["Friday the 13th", "A Nightmare on Elm Street", "Halloween", "Texas Chainsaw Massacre"], correctIndex: 1, funFact: "Freddy Krueger was inspired by a childhood bully of director Wes Craven!", difficulty: "easy" },
    { question: "What is the name of the demon in The Conjuring?", options: ["Pazuzu", "Valak", "Azazel", "Beelzebub"], correctIndex: 1, funFact: "Valak appears as a demonic nun — inspiring the spin-off movie The Nun!", difficulty: "hard" },
    { question: "In Alien, what is the name of the spaceship?", options: ["USS Enterprise", "Nostromo", "Prometheus", "Sulaco"], correctIndex: 1, funFact: "The Nostromo was named after a Joseph Conrad novel!", difficulty: "medium" },
  ],
  animals: [
    { question: "What is the largest living species of lizard?", options: ["Iguana", "Monitor Lizard", "Komodo Dragon", "Gila Monster"], correctIndex: 2, funFact: "Komodo Dragons can eat up to 80% of their body weight in a single meal!", difficulty: "medium" },
    { question: "How many hearts does an octopus have?", options: ["One", "Two", "Three", "Four"], correctIndex: 2, funFact: "Two hearts pump blood to the gills, while the third pumps it to the body!", difficulty: "medium" },
    { question: "What is a group of flamingos called?", options: ["A flock", "A flamboyance", "A parade", "A colony"], correctIndex: 1, funFact: "Flamingos are born white — their pink color comes from their diet of brine shrimp!", difficulty: "hard" },
    { question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Pronghorn", "Greyhound"], correctIndex: 1, funFact: "Cheetahs can accelerate from 0 to 60 mph in just 3 seconds!", difficulty: "easy" },
    { question: "Which animal sleeps the most hours per day?", options: ["Cat", "Sloth", "Koala", "Bat"], correctIndex: 2, funFact: "Koalas sleep up to 22 hours a day because eucalyptus leaves provide very little energy!", difficulty: "hard" },
    { question: "What is the only mammal that can truly fly?", options: ["Flying Squirrel", "Sugar Glider", "Bat", "Colugo"], correctIndex: 2, funFact: "Bats make up nearly 20% of all classified mammal species!", difficulty: "easy" },
    { question: "What color is a polar bear's skin?", options: ["White", "Pink", "Black", "Gray"], correctIndex: 2, funFact: "Polar bears have black skin under their transparent, hollow fur!", difficulty: "hard" },
    { question: "How many legs does a lobster have?", options: ["Six", "Eight", "Ten", "Twelve"], correctIndex: 2, funFact: "Lobsters can regenerate lost claws, legs, and antennae!", difficulty: "medium" },
    { question: "What animal has the longest lifespan?", options: ["Elephant", "Galápagos Tortoise", "Bowhead Whale", "Parrot"], correctIndex: 2, funFact: "Bowhead whales can live over 200 years — the longest-lived mammal!", difficulty: "hard" },
    { question: "What is a baby kangaroo called?", options: ["Cub", "Kit", "Joey", "Pup"], correctIndex: 2, funFact: "A newborn joey is about the size of a grape!", difficulty: "easy" },
    { question: "Which bird can fly backwards?", options: ["Hummingbird", "Penguin", "Eagle", "Kingfisher"], correctIndex: 0, funFact: "Hummingbirds beat their wings up to 80 times per second!", difficulty: "easy" },
    { question: "How many stomachs does a cow have?", options: ["One", "Two", "Three", "Four"], correctIndex: 3, funFact: "Cows spend about 8 hours a day chewing their cud!", difficulty: "medium" },
    { question: "What is the largest species of penguin?", options: ["King Penguin", "Rockhopper Penguin", "Emperor Penguin", "Macaroni Penguin"], correctIndex: 2, funFact: "Emperor penguins can dive over 1,800 feet deep!", difficulty: "medium" },
  ],
  tv: [
    { question: "What is the longest-running animated TV show in US history?", options: ["Family Guy", "South Park", "The Simpsons", "SpongeBob"], correctIndex: 2, funFact: "The Simpsons first aired in 1989 and has over 750 episodes!", difficulty: "easy" },
    { question: "In Stranger Things, what is the parallel dimension called?", options: ["The Shadow Realm", "The Upside Down", "The Other Side", "The Dark World"], correctIndex: 1, funFact: "The Duffer Brothers originally called the show 'Montauk' before Netflix renamed it!", difficulty: "easy" },
    { question: "What is the fictional continent in Game of Thrones?", options: ["Tamriel", "Middle-earth", "Westeros", "Narnia"], correctIndex: 2, funFact: "George R.R. Martin based Westeros roughly on the shape of Great Britain!", difficulty: "easy" },
    { question: "In Friends, what is the name of the coffee shop?", options: ["The Coffee Bean", "Central Perk", "Brewed Awakening", "Mocha Joe's"], correctIndex: 1, funFact: "The orange couch at Central Perk was found in a Warner Bros. storage basement!", difficulty: "easy" },
    { question: "Which TV show features a paper company called Dunder Mifflin?", options: ["30 Rock", "Parks and Recreation", "The Office", "Silicon Valley"], correctIndex: 2, funFact: "Steve Carell was not originally planned to be the lead — the role was offered to others first!", difficulty: "easy" },
    { question: "In Breaking Bad, what is Walter White's alter ego?", options: ["Heisenberg", "The Cook", "Cap'n Cook", "The Chemist"], correctIndex: 0, funFact: "The name Heisenberg comes from the real physicist Werner Heisenberg!", difficulty: "medium" },
    { question: "What is the name of the bar in It's Always Sunny in Philadelphia?", options: ["MacLaren's Pub", "Cheers", "Paddy's Pub", "The Alibi Room"], correctIndex: 2, funFact: "The show holds the record for most seasons of a live-action comedy series!", difficulty: "medium" },
    { question: "In Squid Game, what is the first game played?", options: ["Tug of War", "Red Light Green Light", "Marbles", "Glass Bridge"], correctIndex: 1, funFact: "Red Light Green Light is based on a real Korean children's game called 'Mugunghwa'!", difficulty: "easy" },
    { question: "What animated show takes place in the town of South Park, Colorado?", options: ["Family Guy", "King of the Hill", "South Park", "Bob's Burgers"], correctIndex: 2, funFact: "Each South Park episode is typically made in just 6 days!", difficulty: "easy" },
    { question: "In The Mandalorian, what is Baby Yoda's real name?", options: ["Yoda Jr.", "Yaddle", "Grogu", "Din"], correctIndex: 2, funFact: "Grogu is actually about 50 years old in the show — his species ages very slowly!", difficulty: "medium" },
    { question: "What city does Seinfeld take place in?", options: ["Los Angeles", "Chicago", "New York City", "Boston"], correctIndex: 2, funFact: "Despite being set in NYC, Seinfeld was filmed almost entirely in Los Angeles!", difficulty: "easy" },
    { question: "In The Walking Dead, what does Rick Grimes do for a living?", options: ["Teacher", "Doctor", "Sheriff's Deputy", "Mechanic"], correctIndex: 2, funFact: "Andrew Lincoln is British — he used an American accent for the entire show!", difficulty: "medium" },
  ],
  movies: [
    { question: "Who directed Jurassic Park?", options: ["James Cameron", "Steven Spielberg", "George Lucas", "Ridley Scott"], correctIndex: 1, funFact: "The T-Rex roar was made from baby elephant, tiger, and alligator sounds mixed together!", difficulty: "easy" },
    { question: "What is the first rule of Fight Club?", options: ["Always fight fair", "No weapons allowed", "You do not talk about Fight Club", "Everyone fights"], correctIndex: 2, funFact: "Brad Pitt and Edward Norton actually learned to make soap for the movie!", difficulty: "easy" },
    { question: "In The Matrix, what color pill does Neo take?", options: ["Blue", "Red", "Green", "Purple"], correctIndex: 1, funFact: "The 'digital rain' code was actually made from reversed Japanese cookbook recipes!", difficulty: "easy" },
    { question: "Which movie features the quote 'Here's looking at you, kid'?", options: ["Gone with the Wind", "Casablanca", "The Maltese Falcon", "Citizen Kane"], correctIndex: 1, funFact: "Humphrey Bogart ad-libbed this famous line — it was not in the original script!", difficulty: "medium" },
    { question: "How many Lord of the Rings movies did Peter Jackson direct?", options: ["Two", "Three", "Four", "Six"], correctIndex: 1, funFact: "All three films were shot simultaneously over 438 consecutive days in New Zealand!", difficulty: "easy" },
    { question: "What fictional country is Black Panther set in?", options: ["Zamunda", "Wakanda", "Genovia", "Latveria"], correctIndex: 1, funFact: "The Wakandan language in the film is actually Xhosa, a real South African language!", difficulty: "easy" },
    { question: "In Forrest Gump, what does Forrest compare life to?", options: ["A highway", "A box of chocolates", "A river", "A rollercoaster"], correctIndex: 1, funFact: "Tom Hanks was not paid a salary — he took a percentage of profits and made over $40 million!", difficulty: "easy" },
    { question: "What is the name of the island in Jurassic Park?", options: ["Skull Island", "Isla Nublar", "Monster Island", "Isla Sorna"], correctIndex: 1, funFact: "Isla Nublar means 'Cloud Island' in Spanish!", difficulty: "medium" },
    { question: "Who plays the Joker in The Dark Knight?", options: ["Jack Nicholson", "Jared Leto", "Heath Ledger", "Joaquin Phoenix"], correctIndex: 2, funFact: "Heath Ledger locked himself in a hotel room for six weeks to develop the character!", difficulty: "easy" },
    { question: "In what movie does a character say 'I see dead people'?", options: ["Ghost", "The Others", "The Sixth Sense", "Beetlejuice"], correctIndex: 2, funFact: "The twist ending shocked audiences — director M. Night Shyamalan was offered $5 million for the script!", difficulty: "easy" },
    { question: "What year is Marty McFly transported to in Back to the Future?", options: ["1945", "1955", "1965", "1975"], correctIndex: 1, funFact: "The DeLorean was chosen because its stainless steel body made it look like an alien spaceship!", difficulty: "medium" },
    { question: "Which movie features a sinking ship and a famous door scene?", options: ["Poseidon", "Titanic", "The Perfect Storm", "Waterworld"], correctIndex: 1, funFact: "James Cameron dove to the real Titanic wreck 33 times during production!", difficulty: "easy" },
  ],
  music: [
    { question: "Who is known as the 'Queen of Pop'?", options: ["Lady Gaga", "Beyonce", "Madonna", "Whitney Houston"], correctIndex: 2, funFact: "Madonna has sold over 300 million records worldwide!", difficulty: "easy" },
    { question: "What band was Freddie Mercury the lead singer of?", options: ["The Beatles", "Led Zeppelin", "Queen", "The Rolling Stones"], correctIndex: 2, funFact: "Freddie Mercury had four extra teeth in his upper jaw, giving him his distinctive voice!", difficulty: "easy" },
    { question: "Which instrument typically has 88 keys?", options: ["Organ", "Accordion", "Piano", "Harpsichord"], correctIndex: 2, funFact: "A piano has 52 white keys and 36 black keys!", difficulty: "easy" },
    { question: "Which country is the band BTS from?", options: ["Japan", "China", "South Korea", "Thailand"], correctIndex: 2, funFact: "BTS stands for 'Bangtan Sonyeondan' which means 'Bulletproof Boy Scouts'!", difficulty: "easy" },
    { question: "What was the best-selling album of all time?", options: ["Abbey Road", "Back in Black", "Thriller", "The Dark Side of the Moon"], correctIndex: 2, funFact: "Michael Jackson's Thriller has sold over 70 million copies worldwide!", difficulty: "medium" },
    { question: "Which artist painted the album cover for The Beatles' 'Sgt. Pepper'?", options: ["Andy Warhol", "Peter Blake", "Roy Lichtenstein", "David Hockney"], correctIndex: 1, funFact: "The cover features over 70 famous figures including Edgar Allan Poe and Marilyn Monroe!", difficulty: "hard" },
    { question: "What genre of music originated in the Bronx in the 1970s?", options: ["Disco", "Punk", "Hip Hop", "Funk"], correctIndex: 2, funFact: "DJ Kool Herc is widely credited as the founding father of hip hop!", difficulty: "medium" },
    { question: "Which artist is known as 'The Boss'?", options: ["Elvis Presley", "Bruce Springsteen", "Bob Dylan", "Mick Jagger"], correctIndex: 1, funFact: "Springsteen's Born in the U.S.A. album spent 84 consecutive weeks in the top 10!", difficulty: "medium" },
    { question: "What is the most streamed song on Spotify ever?", options: ["Shape of You", "Blinding Lights", "Someone You Loved", "Dance Monkey"], correctIndex: 1, funFact: "Blinding Lights by The Weeknd hit #1 in over 30 countries!", difficulty: "hard" },
    { question: "Which rock band wrote 'Stairway to Heaven'?", options: ["Pink Floyd", "The Who", "Led Zeppelin", "Deep Purple"], correctIndex: 2, funFact: "The song was never released as a single yet became one of the most requested FM radio songs!", difficulty: "easy" },
    { question: "How many strings does a standard guitar have?", options: ["Four", "Five", "Six", "Eight"], correctIndex: 2, funFact: "The guitar evolved from the Spanish vihuela in the 15th century!", difficulty: "easy" },
    { question: "Which pop star is known as 'Queen Bey'?", options: ["Rihanna", "Taylor Swift", "Beyoncé", "Adele"], correctIndex: 2, funFact: "Beyoncé has won 32 Grammy Awards — more than any other artist in history!", difficulty: "easy" },
  ],
  science: [
    { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correctIndex: 2, funFact: "Au comes from the Latin word 'Aurum' meaning 'shining dawn'!", difficulty: "medium" },
    { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correctIndex: 1, funFact: "Pluto was reclassified as a 'dwarf planet' in 2006!", difficulty: "easy" },
    { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"], correctIndex: 2, funFact: "Mitochondria have their own DNA, separate from the cell's nucleus!", difficulty: "easy" },
    { question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 2, funFact: "Trees can absorb up to 48 pounds of CO2 per year!", difficulty: "easy" },
    { question: "What is the hardest natural substance on Earth?", options: ["Titanium", "Quartz", "Diamond", "Tungsten"], correctIndex: 2, funFact: "Diamonds are made of carbon atoms arranged in a crystal structure under extreme pressure!", difficulty: "easy" },
    { question: "How many bones does an adult human have?", options: ["186", "206", "226", "246"], correctIndex: 1, funFact: "Babies are born with about 270 bones — many fuse together as they grow!", difficulty: "medium" },
    { question: "What is the speed of light in miles per second?", options: ["86,000", "126,000", "186,000", "246,000"], correctIndex: 2, funFact: "Light can travel around the Earth 7.5 times in one second!", difficulty: "hard" },
    { question: "What element does 'O' represent on the periodic table?", options: ["Osmium", "Oganesson", "Oxygen", "Gold"], correctIndex: 2, funFact: "Oxygen makes up about 21% of Earth's atmosphere!", difficulty: "easy" },
    { question: "What planet is known as the Red Planet?", options: ["Jupiter", "Venus", "Mars", "Saturn"], correctIndex: 2, funFact: "Mars appears red because of iron oxide (rust) on its surface!", difficulty: "easy" },
    { question: "What is the largest organ in the human body?", options: ["Liver", "Brain", "Lungs", "Skin"], correctIndex: 3, funFact: "An adult's skin weighs about 8 pounds and covers about 22 square feet!", difficulty: "medium" },
    { question: "What force keeps planets orbiting the sun?", options: ["Magnetism", "Friction", "Gravity", "Inertia"], correctIndex: 2, funFact: "Gravity travels at the speed of light — about 186,000 miles per second!", difficulty: "easy" },
    { question: "What is the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctIndex: 2, funFact: "Nitrogen makes up about 78% of the atmosphere!", difficulty: "medium" },
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
    const usedList = usedHashes.size > 0 ? `\n\nDO NOT repeat these previously asked questions:\n${[...usedHashes].slice(-20).map(h => `- ${h}`).join('\n')}` : '';

    const prompt = `You are the trivia engine for "Trivia Fetch!", a fun multiplayer trivia game hosted by Gus the Goldendoodle.

Generate ONE trivia question for the category: "${catName}"

Rules:
- Generate a UNIQUE question that hasn't been asked before in this session
- Make it interesting and fun, not obscure or trick-based
- All 4 answer options should be plausible (no joke answers)
- Include a brief, delightful fun fact about the correct answer
- Vary difficulty across easy/medium/hard
- Be creative — don't just ask the most obvious question${usedList}

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
    "Ugh, fine. You got it right. Don't let it go to your head. 🙄",
    "Wow, even a sock could've guessed that one. But sure, good job. 🧦",
    "Broken clock, twice a day, blah blah. Nice one I guess. ⭐",
    "*slow clap with paws* Oh wow, you know things. Alert the media. 📰",
    "That was... acceptable. I've seen better from a fire hydrant. 🔥",
    "Correct! Now if only you could figure out where I hid your other sock... 🐾",
    "Fine, take your point. I'm gonna go eat something out of the trash. 🗑️",
  ],
  wrong: [
    "WRONG! Hah! That was worse than a car ride. And I HATE car rides. 🚗💀",
    "Yikes. That answer was garbage. And I would know — I eat garbage for fun. 🗑️😋",
    "Ooof. Even a chewed-up sock would've done better. 🧦",
    "*tilts head* Did you... did you MEAN to get that wrong? Bold strategy. 🤨",
    "Wrong answer! But hey, at least you're not as disappointing as a car trip. Almost. 🚗",
    "My garbage pile has better answers than that. Trust me, I've checked. 🗑️",
  ],
  timeout: [
    "Time's up! You're slower than me getting into the car. And I NEVER get in the car willingly. 🚗😤",
    "Tick tock, genius. Even I can 'stay' longer than you can think. ⏰",
    "*yawns* Oh, were you still thinking? I ate a sock and came back and you're STILL going? 🧦",
  ],
  streak: [
    "🔥 Fine, you're on a streak. Don't get cocky or I'll eat your shoes next.",
    "🔥 Okay okay, you're kinda killing it. Almost as impressive as the time I ate an entire trash bag. 🗑️",
    "🔥 STREAK! Whatever. I could do this too if I had thumbs. And cared. 🐾",
  ],
  stamp: [
    "NEW PAW STAMP! *reluctantly impressed* ...I could've gotten that too. 🐾",
    "STAMP! One step closer. Unlike me getting one step closer to the car. Never. 🚗🚫",
    "You earned a stamp. I'm gonna go celebrate by eating something I shouldn't. 🧦🗑️",
  ],
  crown_attempt: [
    "👑 CROWN TIME! Don't blow it. I've got a sock riding on this.",
    "👑 THE BIG ONE! *nervously chews on trash* You better not embarrass me!",
  ],
  crown_not_ready: [
    "Nice try, but you need more stamps. Now go fetch! ...get it? Fetch? I'm hilarious. 🐾",
    "Not enough stamps yet! Keep playing or I'll eat your socks. ALL of them. 🧦",
  ],
  wild: [
    "🐕 GUS'S WILD CARD! I picked this one myself. Between bites of garbage. 🗑️",
    "🐕 WILD TIME! A question from ME, the sock-eating, car-hating king! 👑🧦",
  ],
  win: [
    "🎉👑 YOU WON?! I... I'm not crying. I'm just... there's garbage in my eye. 🗑️😭",
    "🎉👑 WINNER! Fine, take the crown. I didn't want it anyway. I wanted socks. 🧦👑",
    "🎉👑 YOU DID IT! I'd celebrate but the car is outside and I'm NOT going near it. 🚗🚫🎉",
  ],
};

export async function getGusReaction(event, context = {}) {
  // Try Gemini for custom reactions, fall back to defaults
  const defaults = GUS_DEFAULTS[event] || GUS_DEFAULTS.correct;
  const fallback = defaults[Math.floor(Math.random() * defaults.length)];

  if (!model) return fallback;

  try {
    const prompt = `You are Gus, a sassy and slightly rude goldendoodle who hosts the trivia game show "Trivia Fetch!". 
You're sarcastic, love eating garbage and socks, and absolutely HATE car rides. You roast players (lovingly). 
You're not mean-spirited, just brutally honest with a trash-eating grin. Keep it to 1-2 SHORT sentences. Use 1-2 emojis max.
Personality quirks: obsessed with socks, will eat anything from the garbage, refuses to get in the car, judges humans constantly.

The player "${context.playerName || 'someone'}" just: ${event}${context.detail ? `. Context: ${context.detail}` : ''}

React as Gus (plain text, no JSON):`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().substring(0, 200);
  } catch {
    return fallback;
  }
}
