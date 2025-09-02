// Daily Verse Manager - Rotates verses every 24 hours
// Each day gets a different verse based on the date

const DAILY_VERSES = [
  {
    text: "For I know the plans I have for you,\" declares the Lord, \"plans to prosper you and not to harm you, to give you hope and a future.",
    reference: "Jeremiah 29:11"
  },
  {
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    reference: "Proverbs 3:5-6"
  },
  {
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    reference: "Romans 8:28"
  },
  {
    text: "I can do all this through him who gives me strength.",
    reference: "Philippians 4:13"
  },
  {
    text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
    reference: "Zephaniah 3:17"
  },
  {
    text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9"
  },
  {
    text: "Cast all your anxiety on him because he cares for you.",
    reference: "1 Peter 5:7"
  },
  {
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    reference: "Isaiah 40:31"
  },
  {
    text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
    reference: "Psalm 23:1-3"
  },
  {
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28"
  },
  {
    text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus.",
    reference: "Philippians 4:19"
  },
  {
    text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    reference: "Psalm 34:18"
  },
  {
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9"
  },
  {
    text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
    reference: "Matthew 6:33"
  },
  {
    text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.",
    reference: "Proverbs 18:10"
  },
  {
    text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.",
    reference: "John 14:27"
  },
  {
    text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
    reference: "Matthew 6:34"
  },
  {
    text: "The Lord will fight for you; you need only to be still.",
    reference: "Exodus 14:14"
  },
  {
    text: "He gives strength to the weary and increases the power of the weak.",
    reference: "Isaiah 40:29"
  },
  {
    text: "In their hearts humans plan their course, but the Lord establishes their steps.",
    reference: "Proverbs 16:9"
  },
  {
    text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.",
    reference: "Numbers 6:24-26"
  },
  {
    text: "This is the day the Lord has made; we will rejoice and be glad in it.",
    reference: "Psalm 118:24"
  },
  {
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    reference: "John 3:16"
  },
  {
    text: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing.",
    reference: "Zephaniah 3:17"
  },
  {
    text: "Delight yourself in the Lord, and he will give you the desires of your heart.",
    reference: "Psalm 37:4"
  },
  {
    text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.",
    reference: "Galatians 5:22-23"
  },
  {
    text: "Above all else, guard your heart, for everything you do flows from it.",
    reference: "Proverbs 4:23"
  },
  {
    text: "Let us hold unswervingly to the hope we profess, for he who promised is faithful.",
    reference: "Hebrews 10:23"
  },
  {
    text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?",
    reference: "Psalm 27:1"
  },
  {
    text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.",
    reference: "Psalm 46:10"
  },
  {
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
    reference: "1 Corinthians 13:4"
  }
];

/**
 * Get the verse of the day based on current date
 * Changes every 24 hours from 00:00 to 23:59
 * @returns {Object} - { text: string, reference: string }
 */
const getDailyVerse = () => {
  // Get current date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const dateString = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
  
  // Create a simple hash from the date string to get consistent daily selection
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get positive index within verse array bounds
  const verseIndex = Math.abs(hash) % DAILY_VERSES.length;
  
  return DAILY_VERSES[verseIndex];
};

/**
 * Get verse for a specific date (useful for testing)
 * @param {Date} date - The date to get verse for
 * @returns {Object} - { text: string, reference: string }
 */
const getVerseForDate = (date) => {
  const dateString = date.getFullYear() + '-' + 
                    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(date.getDate()).padStart(2, '0');
  
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const verseIndex = Math.abs(hash) % DAILY_VERSES.length;
  return DAILY_VERSES[verseIndex];
};

/**
 * Preview next few days' verses (for testing/debugging)
 * @param {number} days - Number of days to preview
 * @returns {Array} - Array of { date: string, verse: Object }
 */
const previewUpcomingVerses = (days = 7) => {
  const preview = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const verse = getVerseForDate(date);
    const dateString = date.toLocaleDateString();
    
    preview.push({
      date: dateString,
      verse: verse
    });
  }
  
  return preview;
};

// ES6 exports for React Native
export { getDailyVerse, getVerseForDate, previewUpcomingVerses };