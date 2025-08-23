// Sample verses for now - in production, this would be a full Bible database
const sampleVerses = [
  { text: "The Lord is my shepherd. He gives me everything I need.", reference: "Psalm 23:1" },
  { text: "I can do all things through Christ who gives me strength.", reference: "Philippians 4:13" },
  { text: "God loved the world so much that he gave his only Son, so everyone who believes in him won't die but will have eternal life.", reference: "John 3:16" },
  { text: "Trust in the Lord with all your heart. Don't lean on your own understanding.", reference: "Proverbs 3:5" },
  { text: "Be strong and courageous. Don't be afraid or discouraged, for the Lord your God is with you wherever you go.", reference: "Joshua 1:9" },
  { text: "Come to me, everyone who is tired and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "The Lord is close to those who have a broken heart and saves those with a crushed spirit.", reference: "Psalm 34:18" },
  { text: "Don't worry about anything. Instead, pray about everything.", reference: "Philippians 4:6" },
  { text: "Love is patient and kind. Love doesn't envy or boast. It's not proud.", reference: "1 Corinthians 13:4" },
  { text: "For I know the plans I have for you, declares the Lord, plans to help you and not harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "The Lord is my light and my salvation. Who should I fear?", reference: "Psalm 27:1" },
  { text: "Cast all your worries on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "We know that all things work together for good for those who love God.", reference: "Romans 8:28" },
  { text: "The joy of the Lord is your strength.", reference: "Nehemiah 8:10" },
  { text: "God is our refuge and strength, always ready to help in times of trouble.", reference: "Psalm 46:1" }
];

// Fisher-Yates shuffle with seed
const shuffleWithSeed = (array, seed) => {
  const arr = [...array];
  let m = arr.length;
  let t, i;
  
  // Simple seeded random
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  while (m) {
    i = Math.floor(random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  
  return arr;
};

// Get user-specific seed from localStorage or generate new one
const getUserSeed = () => {
  let seed = localStorage.getItem('verseSeed');
  if (!seed) {
    seed = Math.floor(Math.random() * 1000000);
    localStorage.setItem('verseSeed', seed);
  }
  return parseInt(seed);
};

// Get verse pointer
const getVersePointer = () => {
  const pointer = localStorage.getItem('versePointer');
  return pointer ? parseInt(pointer) : 0;
};

// Update verse pointer
const updateVersePointer = (newPointer) => {
  localStorage.setItem('versePointer', newPointer);
};

export const getVerses = (count = 2) => {
  const seed = getUserSeed();
  const shuffled = shuffleWithSeed(sampleVerses, seed);
  const pointer = getVersePointer();
  
  const verses = [];
  for (let i = 0; i < count; i++) {
    const index = (pointer + i) % shuffled.length;
    verses.push(shuffled[index]);
  }
  
  // Update pointer for next time
  updateVersePointer((pointer + count) % shuffled.length);
  
  return verses;
};

// Paraphrase verse to modern English (mock for now, would use AI in production)
export const paraphraseVerse = async (verse) => {
  // In production, this would call an AI API
  // For now, return the verse as-is since our samples are already modernized
  return verse.text;
};
