import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import hapticFeedback from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATEMENTS = [
  { text: 'The Great Wall of China is visible from space with the naked eye.', answer: false, category: 'geography' },
  { text: 'Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.', answer: true, category: 'science' },
  { text: 'Octopuses have three hearts.', answer: true, category: 'nature' },
  { text: 'Lightning never strikes the same place twice.', answer: false, category: 'science' },
  { text: 'Venus is the hottest planet in our solar system.', answer: true, category: 'space' },
  { text: 'Humans use only 10% of their brains.', answer: false, category: 'human body' },
  { text: 'A group of flamingos is called a flamboyance.', answer: true, category: 'nature' },
  { text: 'Sound travels faster in water than in air.', answer: true, category: 'science' },
  { text: 'The Sahara is the largest desert in the world.', answer: false, category: 'geography' },
  { text: 'Bananas are berries, but strawberries are not.', answer: true, category: 'nature' },
  { text: 'Mount Everest is the tallest mountain measured from base to peak.', answer: false, category: 'geography' },
  { text: 'The human body contains enough iron to make a 3-inch nail.', answer: true, category: 'human body' },
  { text: 'Australia is wider than the Moon.', answer: true, category: 'geography' },
  { text: 'Gold is the most conductive metal.', answer: false, category: 'science' },
  { text: 'A day on Venus is longer than a year on Venus.', answer: true, category: 'space' },
  { text: 'Dolphins sleep with one eye open.', answer: true, category: 'nature' },
  { text: 'The Eiffel Tower can grow up to 6 inches taller during summer.', answer: true, category: 'science' },
  { text: 'Russia has more surface area than Pluto.', answer: true, category: 'geography' },
  { text: 'Fingernails grow faster than toenails.', answer: true, category: 'human body' },
  { text: 'Saturn is the only planet with rings.', answer: false, category: 'space' },
  { text: 'Sharks are older than trees.', answer: true, category: 'nature' },
  { text: 'The Amazon River is the longest river in the world.', answer: false, category: 'geography' },
  { text: 'Glass is a liquid that flows very slowly.', answer: false, category: 'science' },
  { text: 'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.', answer: true, category: 'history' },
  { text: 'The human nose can detect over 1 trillion scents.', answer: true, category: 'human body' },
  { text: 'Mars has the tallest volcano in the solar system.', answer: true, category: 'space' },
  { text: 'An ostrich\'s eye is bigger than its brain.', answer: true, category: 'nature' },
  { text: 'Water drains counterclockwise in the Southern Hemisphere due to the Coriolis effect.', answer: false, category: 'science' },
  { text: 'The Pacific Ocean is larger than all the land on Earth combined.', answer: true, category: 'geography' },
  { text: 'Humans share about 60% of their DNA with bananas.', answer: true, category: 'science' },
  { text: 'Jupiter has the shortest day of any planet in our solar system.', answer: true, category: 'space' },
  { text: 'A snail can sleep for three years.', answer: true, category: 'nature' },
  { text: 'The Dead Sea is the lowest point on Earth\'s surface.', answer: true, category: 'geography' },
  { text: 'Diamonds are made from compressed coal.', answer: false, category: 'science' },
  { text: 'The Mona Lisa has eyebrows.', answer: false, category: 'history' },
  { text: 'Your stomach gets a new lining every 3-4 days.', answer: true, category: 'human body' },
  { text: 'Neptune has the strongest winds in the solar system.', answer: true, category: 'space' },
  { text: 'A group of owls is called a parliament.', answer: true, category: 'nature' },
  { text: 'The Nile flows from south to north.', answer: true, category: 'geography' },
  { text: 'Electrons are larger than protons.', answer: false, category: 'science' },
  { text: 'Oxford University is older than the Aztec Empire.', answer: true, category: 'history' },
  { text: 'Adults have more bones than babies.', answer: false, category: 'human body' },
  { text: 'The Sun makes up 99.86% of the mass of our solar system.', answer: true, category: 'space' },
  { text: 'Elephants are the only animals that can\'t jump.', answer: false, category: 'nature' },
  { text: 'Iceland has no mosquitoes.', answer: true, category: 'geography' },
  { text: 'Hot water freezes faster than cold water.', answer: true, category: 'science' },
  { text: 'Napoleon was unusually short for his time.', answer: false, category: 'history' },
  { text: 'The tongue is the strongest muscle in the human body.', answer: false, category: 'human body' },
  { text: 'A year on Mercury is shorter than a day on Mercury.', answer: false, category: 'space' },
  { text: 'Cows have best friends and get stressed when separated.', answer: true, category: 'nature' },
  { text: 'Alaska is the westernmost, northernmost, AND easternmost U.S. state.', answer: true, category: 'geography' },
  { text: 'You can\'t hum while holding your nose.', answer: true, category: 'human body' },
  { text: 'Light from the Sun takes about 8 minutes to reach Earth.', answer: true, category: 'space' },
  { text: 'Koalas have fingerprints nearly identical to human fingerprints.', answer: true, category: 'nature' },
  { text: 'There are more trees on Earth than stars in the Milky Way.', answer: true, category: 'science' },
  { text: 'The Great Fire of London in 1666 killed thousands of people.', answer: false, category: 'history' },
  { text: 'The human brain is about 73% water.', answer: true, category: 'human body' },
  { text: 'Uranus rotates on its side.', answer: true, category: 'space' },
  { text: 'Butterflies taste with their feet.', answer: true, category: 'nature' },
  { text: 'Africa is the only continent in all four hemispheres.', answer: true, category: 'geography' },
  { text: 'A teaspoon of neutron star weighs about 6 billion tons.', answer: true, category: 'space' },
  { text: 'The Wright brothers\' first flight was shorter than a Boeing 747.', answer: true, category: 'history' },
  { text: 'Blood is blue inside your body before it touches oxygen.', answer: false, category: 'human body' },
  { text: 'The Moon is slowly moving away from Earth.', answer: true, category: 'space' },
  { text: 'A cockroach can live for weeks without its head.', answer: true, category: 'nature' },
  { text: 'Canada has more lakes than the rest of the world combined.', answer: true, category: 'geography' },
  { text: 'Einstein failed math in school.', answer: false, category: 'history' },
  { text: 'Your body produces enough saliva to fill two swimming pools in a lifetime.', answer: true, category: 'human body' },
  { text: 'Black holes emit no light whatsoever.', answer: false, category: 'space' },
  { text: 'A group of porcupines is called a prickle.', answer: true, category: 'nature' },
  { text: 'The shortest war in history lasted 38 minutes.', answer: true, category: 'history' },
  { text: 'The speed of light is approximately 300,000 km per second.', answer: true, category: 'science' },
  { text: 'Redheads require more anesthesia than people with other hair colors.', answer: true, category: 'human body' },
  { text: 'There are more possible iterations of a game of chess than atoms in the observable universe.', answer: true, category: 'science' },
  { text: 'The Mariana Trench is deeper than Mount Everest is tall.', answer: true, category: 'geography' },
  { text: 'Pluto was discovered in 1930.', answer: true, category: 'space' },
  { text: 'Sloths can hold their breath for up to 40 minutes underwater.', answer: true, category: 'nature' },
  { text: 'Vikings wore horned helmets.', answer: false, category: 'history' },
  { text: 'Humans have a unique tongue print, just like fingerprints.', answer: true, category: 'human body' },
  { text: 'Mercury is the closest planet to the Sun and the hottest.', answer: false, category: 'space' },
  { text: 'Cats have fewer toes on their back paws than their front paws.', answer: true, category: 'nature' },
  { text: 'The Atlantic Ocean is saltier than the Pacific Ocean.', answer: true, category: 'geography' },
  { text: 'Steel is heavier than iron.', answer: false, category: 'science' },
  { text: 'The first person convicted of speeding was going 8 mph.', answer: true, category: 'history' },
  { text: 'The human eye can distinguish about 10 million different colors.', answer: true, category: 'human body' },
  { text: 'The Milky Way is a spiral galaxy.', answer: true, category: 'space' },
  { text: 'Polar bear fur is actually transparent, not white.', answer: true, category: 'nature' },
  { text: 'Hawaii is moving closer to Alaska by about 7.5 cm per year.', answer: true, category: 'geography' },
  { text: 'Oil and water don\'t mix because water molecules are attracted to each other more than to oil.', answer: true, category: 'science' },
  { text: 'The Titanic was the first ship to use SOS.', answer: false, category: 'history' },
  { text: 'Sneezes regularly exceed 100 mph.', answer: true, category: 'human body' },
  { text: 'The Sun is actually white, not yellow.', answer: true, category: 'space' },
  { text: 'Hummingbirds can fly backwards.', answer: true, category: 'nature' },
  { text: 'Lake Baikal contains about 20% of the world\'s unfrozen fresh water.', answer: true, category: 'geography' },
  { text: 'Rubber bands last longer when refrigerated.', answer: true, category: 'science' },
  { text: 'Ancient Romans used urine as mouthwash.', answer: true, category: 'history' },
  { text: 'Your small intestine is about 22 feet long.', answer: true, category: 'human body' },
  { text: 'It rains diamonds on Jupiter and Saturn.', answer: true, category: 'space' },
  { text: 'A blue whale\'s heart is the size of a small car.', answer: true, category: 'nature' },
  { text: 'Mount Chimborazo in Ecuador is the closest point to the Sun on Earth.', answer: true, category: 'geography' },
  { text: 'Helium makes your voice higher by making sound travel faster.', answer: true, category: 'science' },
  { text: 'The Berlin Wall fell in 1991.', answer: false, category: 'history' },
  { text: 'Your bones are stronger than steel on a weight-for-weight basis.', answer: true, category: 'human body' },
  { text: 'The International Space Station orbits Earth about 16 times per day.', answer: true, category: 'space' },
  { text: 'Ants never sleep.', answer: false, category: 'nature' },
  { text: 'Africa has 54 countries.', answer: true, category: 'geography' },
  { text: 'A rainbow is always a full circle when viewed from above.', answer: true, category: 'science' },
  { text: 'Coca-Cola was originally green.', answer: false, category: 'history' },
  { text: 'The average person walks the equivalent of three times around the world in a lifetime.', answer: true, category: 'human body' },
  { text: 'Saturn would float if placed in water.', answer: true, category: 'space' },
  { text: 'Wombat droppings are cube-shaped.', answer: true, category: 'nature' },
  { text: 'Istanbul is the only city in the world located on two continents.', answer: false, category: 'geography' },
  { text: 'Absolute zero is exactly -273.15 degrees Celsius.', answer: true, category: 'science' },
  { text: 'The first Olympic Games were held in Rome.', answer: false, category: 'history' },
  { text: 'Babies are born with about 300 bones.', answer: true, category: 'human body' },
  { text: 'There are more stars in the universe than grains of sand on all of Earth\'s beaches.', answer: true, category: 'space' },
  { text: 'Seahorses are one of the only animals where the male gives birth.', answer: true, category: 'nature' },
  { text: 'Russia spans 11 time zones.', answer: true, category: 'geography' },
  { text: 'DNA is a double helix structure.', answer: true, category: 'science' },
  { text: 'Shakespeare invented the word "assassination".', answer: false, category: 'history' },
  { text: 'The surface area of your lungs is roughly the size of a tennis court.', answer: true, category: 'human body' },
  { text: 'The largest known star could fit 5 billion Suns inside it.', answer: true, category: 'space' },
  { text: 'Goldfish have a 3-second memory.', answer: false, category: 'nature' },
  { text: 'Mongolia is the most sparsely populated country in the world.', answer: true, category: 'geography' },
  { text: 'Water boils at a lower temperature at higher altitudes.', answer: true, category: 'science' },
  { text: 'The pyramids of Giza were originally white.', answer: true, category: 'history' },
  { text: 'Your body has more bacterial cells than human cells.', answer: true, category: 'human body' },
  { text: 'A photon of light takes 100,000 years to travel from the core of the Sun to its surface.', answer: true, category: 'space' },
  { text: 'Tardigrades can survive in outer space.', answer: true, category: 'nature' },
  { text: 'The Caspian Sea is actually a lake.', answer: true, category: 'geography' },
  { text: 'Microwave ovens cook food from the inside out.', answer: false, category: 'science' },
  { text: 'The Romans built straight roads to prevent ambushes.', answer: false, category: 'history' },
  { text: 'You produce about 25,000 quarts of saliva in a lifetime.', answer: true, category: 'human body' },
  { text: 'Venus spins in the opposite direction to most other planets.', answer: true, category: 'space' },
  { text: 'Elephants can hear through their feet.', answer: true, category: 'nature' },
  { text: 'The country with the most islands is Sweden.', answer: true, category: 'geography' },
  { text: 'Bats are blind.', answer: false, category: 'nature' },
  { text: 'The first computer programmer was a woman.', answer: true, category: 'history' },
  { text: 'Humans glow in the dark, but the light is too weak for our eyes to see.', answer: true, category: 'human body' },
  { text: 'The Sun\'s core temperature is about 15 million degrees Celsius.', answer: true, category: 'space' },
  { text: 'Starfish have a brain.', answer: false, category: 'nature' },
  { text: 'New Zealand was the first country to give women the right to vote.', answer: true, category: 'history' },
  { text: 'Your cornea is the only part of your body with no blood supply.', answer: true, category: 'human body' },
  { text: 'Pluto has five known moons.', answer: true, category: 'space' },
  { text: 'Flamingos are naturally pink.', answer: false, category: 'nature' },
  { text: 'Brazil shares a border with every South American country except Chile and Ecuador.', answer: true, category: 'geography' },
  { text: 'The smell of rain has a name: petrichor.', answer: true, category: 'science' },
  { text: 'Ancient Egyptians used sleds to move the pyramid stones.', answer: true, category: 'history' },
  { text: 'The human brain uses about 20% of the body\'s total energy.', answer: true, category: 'human body' },
  { text: 'Jupiter has 95 known moons.', answer: true, category: 'space' },
  { text: 'Hippos sweat is red.', answer: true, category: 'nature' },
  { text: 'Vatican City is the smallest country in the world.', answer: true, category: 'geography' },
  { text: 'Sound can travel through a vacuum.', answer: false, category: 'science' },
  { text: 'The first email was sent in 1971.', answer: true, category: 'history' },
  { text: 'Your body replaces all of its cells every 7 years.', answer: false, category: 'human body' },
  { text: 'Europa, one of Jupiter\'s moons, has more water than Earth.', answer: true, category: 'space' },
  { text: 'Chameleons change color to blend in with their surroundings.', answer: false, category: 'nature' },
  { text: 'The Great Barrier Reef is visible from space.', answer: true, category: 'geography' },
  { text: 'There are 118 elements on the periodic table.', answer: true, category: 'science' },
  { text: 'The first photograph ever taken required 8 hours of exposure.', answer: true, category: 'history' },
  { text: 'Nerve impulses travel at over 250 mph.', answer: true, category: 'human body' },
  { text: 'Mars appears red because of iron oxide on its surface.', answer: true, category: 'space' },
  { text: 'Penguins can fly short distances.', answer: false, category: 'nature' },
  { text: 'Greenland is the largest island in the world.', answer: true, category: 'geography' },
  { text: 'Lightning is hotter than the surface of the Sun.', answer: true, category: 'science' },
  { text: 'The Hundred Years\' War lasted exactly 100 years.', answer: false, category: 'history' },
  { text: 'Your heart beats about 100,000 times per day.', answer: true, category: 'human body' },
  { text: 'The Voyager 1 spacecraft is the farthest human-made object from Earth.', answer: true, category: 'space' },
  { text: 'Spiders are insects.', answer: false, category: 'nature' },
  { text: 'The longest river in Europe is the Volga.', answer: true, category: 'geography' },
  { text: 'The word "atom" comes from the Greek word for "indivisible".', answer: true, category: 'science' },
  { text: 'The first US president to live in the White House was George Washington.', answer: false, category: 'history' },
  { text: 'Humans can survive longer without food than without sleep.', answer: true, category: 'human body' },
  { text: 'The asteroid belt between Mars and Jupiter is very densely packed.', answer: false, category: 'space' },
  { text: 'Octopuses have blue blood.', answer: true, category: 'nature' },
  { text: 'The largest ocean on Earth is the Pacific.', answer: true, category: 'geography' },
  { text: 'Humans and chimpanzees share about 98% of their DNA.', answer: true, category: 'science' },
  { text: 'The Spanish Inquisition started in the 12th century.', answer: false, category: 'history' },
  { text: 'Your body has about 60,000 miles of blood vessels.', answer: true, category: 'human body' },
  { text: 'The surface of Venus is hot enough to melt lead.', answer: true, category: 'space' },
  { text: 'Some turtles can breathe through their rear end.', answer: true, category: 'nature' },
  { text: 'K2 is taller than Mount Everest.', answer: false, category: 'geography' },
  { text: 'The speed of sound is called Mach 1.', answer: true, category: 'science' },
  { text: 'The Roman Empire fell in the 5th century AD.', answer: true, category: 'history' },
  { text: 'The human eye blinks an average of 15-20 times per minute.', answer: true, category: 'human body' },
  { text: 'There are 8 planets in our solar system.', answer: true, category: 'space' },
  { text: 'A group of crows is called a murder.', answer: true, category: 'nature' },
  { text: 'The longest coastline of any country belongs to Canada.', answer: true, category: 'geography' },
  { text: 'Ice is denser than liquid water.', answer: false, category: 'science' },
  { text: 'Genghis Khan killed an estimated 40 million people.', answer: true, category: 'history' },
  { text: 'The liver is the largest internal organ in the human body.', answer: true, category: 'human body' },
  { text: 'Neptune takes about 165 Earth years to orbit the Sun.', answer: true, category: 'space' },
  { text: 'Frogs drink water through their skin.', answer: true, category: 'nature' },
  { text: 'Mount Kilimanjaro is in Kenya.', answer: false, category: 'geography' },
  { text: 'Gravity is the weakest of the four fundamental forces.', answer: true, category: 'science' },
  { text: 'The printing press was invented in Germany.', answer: true, category: 'history' },
  { text: 'Humans produce a new skeleton every 10 years.', answer: true, category: 'human body' },
  { text: 'The closest star to Earth (after the Sun) is Proxima Centauri.', answer: true, category: 'space' },
  { text: 'Jellyfish have brains.', answer: false, category: 'nature' },
  { text: 'The world\'s longest bridge is in China.', answer: true, category: 'geography' },
  { text: 'Photosynthesis converts carbon dioxide into oxygen.', answer: true, category: 'science' },
  { text: 'The Rosetta Stone helped decipher Egyptian hieroglyphics.', answer: true, category: 'history' },
  { text: 'A sneeze travels faster than a blink.', answer: true, category: 'human body' },
  { text: 'The first animal sent into space was a fruit fly.', answer: true, category: 'space' },
  { text: 'Mosquitoes are the deadliest animal in the world.', answer: true, category: 'nature' },
  { text: 'The Bermuda Triangle is in the Atlantic Ocean.', answer: true, category: 'geography' },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CATEGORY_COLORS = {
  science: '#06B6D4',
  geography: '#22C55E',
  history: '#F59E0B',
  nature: '#4ADE80',
  space: '#A855F7',
  'human body': '#FF6B6B',
};

const TrueOrFalseGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [statements, setStatements] = useState(() => shuffleArray(STATEMENTS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);

  const timerRef = useRef(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const livesRef = useRef(3);

  const currentStatement = statements[currentIndex % statements.length];

  const getTimeForLevel = useCallback((lvl) => {
    if (lvl <= 5) return 10;
    if (lvl <= 10) return 8;
    if (lvl <= 15) return 6;
    if (lvl <= 20) return 5;
    return 4;
  }, []);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    if (gameState !== 'playing' || answered) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, answered, currentIndex]);

  const handleTimeout = useCallback(() => {
    setAnswered(true);
    setLastCorrect(false);
    setTotal(prev => prev + 1);
    setStreak(0);

    const newLives = livesRef.current - 1;
    setLives(newLives);
    hapticFeedback.warning();

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    if (newLives <= 0) {
      setTimeout(() => endGame(), 800);
    } else {
      setTimeout(() => nextStatement(), 1200);
    }
  }, [flashAnim]);

  const handleAnswer = useCallback((userAnswer) => {
    if (answered || gameState !== 'playing') return;

    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(true);
    setTotal(prev => prev + 1);

    const isCorrect = userAnswer === currentStatement.answer;
    setLastCorrect(isCorrect);

    if (isCorrect) {
      hapticFeedback.success();
      setCorrect(prev => prev + 1);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const timeBonus = Math.round(timeLeft * 3);
      const streakMultiplier = Math.min(3, 1 + Math.floor(newStreak / 3) * 0.5);
      const basePoints = 10 + level * 2;
      const points = Math.round((basePoints + timeBonus) * streakMultiplier);
      setScore(prev => prev + points);

      if (newStreak % 10 === 0) {
        setLevel(prev => prev + 1);
      }

      Animated.sequence([
        Animated.timing(cardScale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      hapticFeedback.error();
      setStreak(0);
      const newLives = livesRef.current - 1;
      setLives(newLives);

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      if (newLives <= 0) {
        setTimeout(() => endGame(), 800);
        return;
      }
    }

    setTimeout(() => nextStatement(), 1200);
  }, [answered, gameState, currentStatement, streak, bestStreak, timeLeft, level, cardScale, flashAnim]);

  const nextStatement = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= statements.length) {
      setStatements(shuffleArray(STATEMENTS));
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
    setAnswered(false);
    setLastCorrect(null);
    setTimeLeft(getTimeForLevel(level));

    Animated.sequence([
      Animated.timing(cardAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
  }, [currentIndex, statements, level, cardAnim, getTimeForLevel]);

  const endGame = useCallback(() => {
    setGameState('gameover');
    hapticFeedback.error();
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [resultSlide, resultOpacity]);

  const resetGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setLives(3);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setTotal(0);
    setStatements(shuffleArray(STATEMENTS));
    setCurrentIndex(0);
    setTimeLeft(10);
    setAnswered(false);
    setLastCorrect(null);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [resultSlide, resultOpacity]);

  const livesDisplay = Array.from({ length: 3 }, (_, i) => (
    <MaterialIcons
      key={i}
      name="favorite"
      size={18}
      color={i < lives ? '#FF3B80' : 'rgba(255,255,255,0.15)'}
    />
  ));

  const timerPercent = timeLeft / getTimeForLevel(level);
  const timerColor = timerPercent > 0.5 ? '#4ADE80' : timerPercent > 0.25 ? '#FFB800' : '#FF3B30';
  const catColor = CATEGORY_COLORS[currentStatement.category] || '#888';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View
        style={[styles.damageFlash, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>True or False</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <View style={styles.livesRow}>{livesDisplay}</View>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="whatshot" size={14} color="#FFB800" />
          <Text style={styles.statLabel}>{streak}x</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>{correct}/{total}</Text>
        </View>
      </View>

      {gameState === 'playing' && (
        <View style={styles.gameArea}>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${timerPercent * 100}%`, backgroundColor: timerColor }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>

          <Animated.View style={[styles.statementCard, { transform: [{ scale: cardScale }] }]}>
            <LinearGradient
              colors={['#1A1A2E', '#1E1E3A']}
              style={styles.statementGradient}
            >
              <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                <Text style={[styles.categoryText, { color: catColor }]}>
                  {currentStatement.category.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.statementText}>{currentStatement.text}</Text>

              {answered && (
                <View style={[
                  styles.feedbackBadge,
                  { backgroundColor: lastCorrect ? 'rgba(74,222,128,0.15)' : 'rgba(255,59,48,0.15)' },
                ]}>
                  <MaterialIcons
                    name={lastCorrect ? 'check-circle' : 'cancel'}
                    size={20}
                    color={lastCorrect ? '#4ADE80' : '#FF3B30'}
                  />
                  <Text style={[
                    styles.feedbackText,
                    { color: lastCorrect ? '#4ADE80' : '#FF3B30' },
                  ]}>
                    {lastCorrect ? 'Correct!' : `Wrong! Answer: ${currentStatement.answer ? 'True' : 'False'}`}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAnswer(true)}
              style={styles.answerButton}
              disabled={answered}
            >
              <LinearGradient
                colors={answered && currentStatement.answer === true ? ['#166534', '#15803D'] : ['#1A2E1A', '#1E3A1E']}
                style={[styles.answerGradient, answered && !lastCorrect && currentStatement.answer === true && styles.correctHighlight]}
              >
                <MaterialIcons name="check" size={32} color="#4ADE80" />
                <Text style={[styles.answerText, { color: '#4ADE80' }]}>TRUE</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAnswer(false)}
              style={styles.answerButton}
              disabled={answered}
            >
              <LinearGradient
                colors={answered && currentStatement.answer === false ? ['#7F1D1D', '#991B1B'] : ['#2E1A1A', '#3A1E1E']}
                style={[styles.answerGradient, answered && !lastCorrect && currentStatement.answer === false && styles.correctHighlight]}
              >
                <MaterialIcons name="close" size={32} color="#FF6B6B" />
                <Text style={[styles.answerText, { color: '#FF6B6B' }]}>FALSE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {gameState === 'gameover' && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: resultOpacity, transform: [{ translateY: resultSlide }] },
            ]}
          >
            <LinearGradient
              colors={['#1E1E4A', '#2A2A5E', '#1E1E4A']}
              style={styles.resultGradient}
            >
              <Text style={styles.resultEmoji}>🧠</Text>
              <Text style={styles.resultTitle}>Game Over</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Correct</Text>
                  <Text style={styles.sValue}>{correct}/{total}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Accuracy</Text>
                  <Text style={styles.sValue}>{total > 0 ? Math.round((correct / total) * 100) : 0}%</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Best Streak</Text>
                  <Text style={styles.sValue}>{bestStreak}x</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabelBig}>Final Score</Text>
                  <Text style={[styles.sValueBig, { color: '#FFD700' }]}>
                    {score.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={resetGame}
                style={styles.playAgainButton}
              >
                <LinearGradient
                  colors={['#4A3AFF', '#6B5AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playAgainGradient}
                >
                  <MaterialIcons name="replay" size={20} color="#FFF" />
                  <Text style={styles.playAgainText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default TrueOrFalseGame;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  damageFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    zIndex: 999,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scoreContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timerBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  statementCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 40,
  },
  statementGradient: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  statementText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 20,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  answerButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  answerGradient: {
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  correctHighlight: {
    borderColor: 'rgba(74,222,128,0.4)',
    borderWidth: 2,
  },
  answerText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  resultGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,100,200,0.2)',
    borderRadius: 24,
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  scoreBreakdown: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  sValue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  scoreDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  sLabelBig: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sValueBig: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4ADE80',
  },
  playAgainButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  playAgainText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
