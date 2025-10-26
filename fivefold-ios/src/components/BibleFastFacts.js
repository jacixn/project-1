import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  PanResponder,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Remote Bible Facts Configuration
const FACTS_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-facts.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_facts_data_v1',
  CACHE_TIMESTAMP_KEY: 'bible_facts_timestamp_v1',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

const BibleFastFacts = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFact, setSelectedFact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Remote data state
  const [factsData, setFactsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal animation refs for detail view
  const detailSlideAnim = useRef(new Animated.Value(0)).current;
  const detailFadeAnim = useRef(new Animated.Value(0)).current;
  const detailPanY = useRef(new Animated.Value(0)).current;

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadFacts();
    }
  }, [visible]);

  // Load favorites from storage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fade in animation
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Reset pan value when modal closes
  useEffect(() => {
    if (!selectedFact) {
      detailPanY.setValue(0);
    }
  }, [selectedFact]);

  // Check if cache is valid
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < FACTS_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  // Fetch facts from GitHub
  const fetchFactsFromRemote = async () => {
    try {
      const url = FACTS_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('Fetching Bible facts from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await AsyncStorage.setItem(FACTS_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(FACTS_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached Bible facts');
      return data;
    } catch (error) {
      console.error('Error fetching Bible facts from remote:', error);
      throw error;
    }
  };

  // Load local fallback data
  const loadLocalFallbackData = () => {
    return {
      categories: [
        { id: 'all', name: 'All Facts', icon: 'auto-awesome', color: '#9C27B0', gradient: ['#9C27B0', '#7B1FA2'] },
        { id: 'numbers', name: 'Numbers & Stats', icon: 'analytics', color: '#2196F3', gradient: ['#2196F3', '#1976D2'] },
      ],
      facts: [
        {
          id: 'fallback_1',
          category: 'numbers',
          title: 'Loading Facts...',
          description: 'Bible facts are loading from remote source. Please check your internet connection.',
          icon: 'cloud_download',
          tags: ['Loading'],
          didYouKnow: 'These facts will be cached for offline use once loaded.',
        },
      ],
      metadata: {
        version: '1.0',
        totalFacts: 1,
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    };
  };

  // Load facts (with caching)
  const loadFacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('📦 Loading Bible facts from cache');
          setFactsData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      // Fetch from remote
      try {
        const remoteData = await fetchFactsFromRemote();
        setFactsData(remoteData);
      } catch (fetchError) {
        console.log('⚠️ Remote fetch failed, checking cache...');
        
        // Try cache even if expired
        const cachedData = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('📦 Using expired cache due to network error');
          setFactsData(JSON.parse(cachedData));
        } else {
          // Use fallback
          console.log('💾 Using local fallback data');
          setFactsData(loadLocalFallbackData());
          setError('Could not load facts. Please check your internet connection.');
        }
      }
    } catch (error) {
      console.error('Error loading Bible facts:', error);
      setError(error.message);
      setFactsData(loadLocalFallbackData());
    } finally {
      setLoading(false);
    }
  };

  // Refresh facts
  const refreshFacts = async () => {
    setRefreshing(true);
    await loadFacts();
    setRefreshing(false);
  };

  // Pan gesture handler for fact detail modal
  const detailPanResponder = useRef(
    category: 'numbers',
    title: 'The Bible Has 66 Books',
    description: '39 books in the Old Testament and 27 in the New Testament. It was written by approximately 40 different authors over 1,500 years.',
    icon: 'menu_book',
    tags: ['Books', 'Structure'],
    didYouKnow: 'The word "Bible" comes from the Greek word "biblia," meaning "books."',
  },
  {
    id: 'fact_2',
    category: 'numbers',
    title: '31,102 Verses Total',
    description: 'The Bible contains 31,102 verses, 1,189 chapters, and approximately 783,137 words in the original languages.',
    icon: 'format_list_numbered',
    tags: ['Verses', 'Statistics'],
    didYouKnow: 'The middle verse of the Bible is Psalm 118:8.',
  },
  {
    id: 'fact_3',
    category: 'numbers',
    title: 'Longest Book: Psalms',
    description: 'Psalms is the longest book with 150 chapters and 2,461 verses. The shortest book is 3 John with only 14 verses.',
    icon: 'library_books',
    tags: ['Psalms', 'Records'],
    didYouKnow: 'The longest chapter is Psalm 119 with 176 verses.',
  },
  {
    id: 'fact_4',
    category: 'numbers',
    title: 'Most Mentioned Name',
    description: 'David is the most mentioned person in the Bible, with over 1,000 references. Jesus is mentioned approximately 973 times.',
    icon: 'person',
    tags: ['Names', 'People'],
    didYouKnow: 'The name "David" means "beloved" in Hebrew.',
  },

  // Historical Facts
  {
    id: 'fact_5',
    category: 'historical',
    title: 'Dead Sea Scrolls Discovery',
    description: 'In 1947, a Bedouin shepherd discovered ancient biblical manuscripts in caves near the Dead Sea, dating back to 200 BC.',
    icon: 'explore',
    tags: ['Discovery', 'Archaeology'],
    didYouKnow: 'The scrolls included complete books of Isaiah and many other Old Testament texts.',
  },
  {
    id: 'fact_6',
    category: 'historical',
    title: 'Oldest Bible Manuscript',
    description: 'The oldest known Bible manuscript fragments date back to around 125 AD, containing portions of the Gospel of John.',
    icon: 'article',
    tags: ['Manuscripts', 'Ancient'],
    didYouKnow: 'This is the Rylands Library Papyrus P52, kept in Manchester, England.',
  },
  {
    id: 'fact_7',
    category: 'historical',
    title: 'Gutenberg Bible - First Printed',
    description: 'In 1455, Johannes Gutenberg printed the first Bible using movable type, revolutionizing Bible distribution.',
    icon: 'print',
    tags: ['Printing', 'Revolution'],
    didYouKnow: 'Only 49 Gutenberg Bibles still exist today, worth millions of dollars.',
  },
  {
    id: 'fact_8',
    category: 'historical',
    title: 'Bible Timeline Span',
    description: 'The events in the Bible span approximately 4,000 years, from Creation to the establishment of the early church.',
    icon: 'timeline',
    tags: ['Timeline', 'History'],
    didYouKnow: 'The Old Testament covers about 3,500 years of history.',
  },

  // People & Places
  {
    id: 'fact_9',
    category: 'people',
    title: 'Methuselah - Oldest Person',
    description: 'Methuselah lived 969 years, making him the oldest person recorded in the Bible (Genesis 5:27).',
    icon: 'elderly',
    tags: ['Age', 'Records'],
    didYouKnow: 'His name means "when he dies, judgment will come." He died the year of the flood.',
  },
  {
    id: 'fact_10',
    category: 'people',
    title: 'Shortest Man: Zacchaeus',
    description: 'Zacchaeus, a chief tax collector, climbed a sycamore tree to see Jesus because he was too short to see over the crowd.',
    icon: 'accessibility',
    tags: ['New Testament', 'Stories'],
    didYouKnow: 'Jesus visited his house, transforming his life completely (Luke 19).',
  },
  {
    id: 'fact_11',
    category: 'people',
    title: 'Jerusalem Mentioned 811 Times',
    description: 'Jerusalem is the most frequently mentioned city in the Bible, appearing 811 times. Damascus is second with 60 mentions.',
    icon: 'location_city',
    tags: ['Cities', 'Geography'],
    didYouKnow: 'Jerusalem is considered holy by three major religions: Judaism, Christianity, and Islam.',
  },
  {
    id: 'fact_12',
    category: 'people',
    title: 'Women Authors Debated',
    description: 'While most biblical books were written by men, some scholars suggest portions may have been written or influenced by women like Deborah.',
    icon: 'woman',
    tags: ['Authors', 'Women'],
    didYouKnow: 'The Song of Deborah (Judges 5) is one of the oldest passages in the Bible.',
  },

  // Languages
  {
    id: 'fact_13',
    category: 'languages',
    title: 'Three Original Languages',
    description: 'The Bible was originally written in Hebrew, Aramaic, and Greek. Most of the Old Testament is in Hebrew.',
    icon: 'language',
    tags: ['Languages', 'Translation'],
    didYouKnow: 'Jesus likely spoke Aramaic in his daily life.',
  },
  {
    id: 'fact_14',
    category: 'languages',
    title: 'Most Translated Book',
    description: 'The Bible has been translated into over 3,500 languages, making it the most translated book in history.',
    icon: 'g_translate',
    tags: ['Translation', 'Records'],
    didYouKnow: 'About 90% of the world can read the Bible in their native language.',
  },
  {
    id: 'fact_15',
    category: 'languages',
    title: 'King James Version Impact',
    description: 'The King James Version (1611) shaped English literature and introduced phrases like "fight the good fight" and "eat, drink, and be merry."',
    icon: 'auto_stories',
    tags: ['KJV', 'English'],
    didYouKnow: 'The KJV took 7 years and 47 scholars to translate.',
  },
  {
    id: 'fact_16',
    category: 'languages',
    title: 'No Word for "Eternity"',
    description: 'The Hebrew language in the Old Testament has no single word for "eternity." Instead, it uses "olam," meaning "forever" or "age."',
    icon: 'all_inclusive',
    tags: ['Hebrew', 'Concepts'],
    didYouKnow: 'This shows how ancient Hebrews conceptualized time differently.',
  },

  // Prophecies
  {
    id: 'fact_17',
    category: 'prophecies',
    title: '300+ Prophecies About Jesus',
    description: 'Over 300 Old Testament prophecies were fulfilled in Jesus Christ, including his birthplace, manner of death, and resurrection.',
    icon: 'verified',
    tags: ['Messiah', 'Fulfillment'],
    didYouKnow: 'The probability of one person fulfilling just 48 prophecies is 1 in 10^157.',
  },
  {
    id: 'fact_18',
    category: 'prophecies',
    title: 'Isaiah Written 700 Years Before',
    description: 'Isaiah 53 describes the suffering servant (Jesus) in remarkable detail, written 700 years before Christ was born.',
    icon: 'calendar_today',
    tags: ['Isaiah', 'Messiah'],
    didYouKnow: 'Dead Sea Scrolls confirmed Isaiah was written before Jesus lived.',
  },
  {
    id: 'fact_19',
    category: 'prophecies',
    title: 'Bethlehem Prophecy',
    description: 'Micah 5:2 predicted the Messiah would be born in Bethlehem, written 700 years before Jesus birth.',
    icon: 'star',
    tags: ['Birth', 'Micah'],
    didYouKnow: 'Bethlehem means "house of bread" in Hebrew.',
  },
  {
    id: 'fact_20',
    category: 'prophecies',
    title: 'Crucifixion Details Predicted',
    description: 'Psalm 22 describes crucifixion details (pierced hands/feet, divided garments) before crucifixion was even invented.',
    icon: 'healing',
    tags: ['Psalm', 'Cross'],
    didYouKnow: 'Crucifixion was invented by the Persians around 500 BC.',
  },

  // Miracles
  {
    id: 'fact_21',
    category: 'miracles',
    title: '37 Miracles of Jesus',
    description: 'The Gospels record 37 specific miracles performed by Jesus, though John says there were many more not recorded.',
    icon: 'auto-fix-high',
    tags: ['Jesus', 'Signs'],
    didYouKnow: 'John 21:25 says "the world could not contain the books" if all Jesus did was written.',
  },
  {
    id: 'fact_22',
    category: 'miracles',
    title: 'Parting of the Red Sea',
    description: 'Moses parted the Red Sea, allowing the Israelites to escape Egypt. Some scholars estimate 2-3 million people crossed.',
    icon: 'waves',
    tags: ['Exodus', 'Moses'],
    didYouKnow: 'This is one of the most dramatic miracles in the Old Testament.',
  },
  {
    id: 'fact_23',
    category: 'miracles',
    title: 'Walls of Jericho',
    description: 'The walls of Jericho fell after the Israelites marched around the city for 7 days and shouted (Joshua 6).',
    icon: 'domain_disabled',
    tags: ['Joshua', 'Conquest'],
    didYouKnow: 'Archaeological evidence shows Jericho walls collapsed outward, matching the biblical account.',
  },
  {
    id: 'fact_24',
    category: 'miracles',
    title: 'Sun Stood Still',
    description: 'Joshua commanded the sun to stand still during battle, and it did for about a full day (Joshua 10:13).',
    icon: 'wb_sunny',
    tags: ['Joshua', 'Battle'],
    didYouKnow: 'This allowed Israel to completely defeat their enemies.',
  },

  // Unique Facts
  {
    id: 'fact_25',
    category: 'unique',
    title: 'Shortest Verse',
    description: '"Jesus wept" (John 11:35) is the shortest verse in the Bible - only two words in English.',
    icon: 'short_text',
    tags: ['Verse', 'Records'],
    didYouKnow: 'This verse shows Jesus humanity and compassion at Lazarus death.',
  },
  {
    id: 'fact_26',
    category: 'unique',
    title: 'Letter Without "E"',
    description: 'In some ancient manuscripts, the letter "E" is carefully avoided in certain passages as a literary technique.',
    icon: 'text_fields',
    tags: ['Literary', 'Unique'],
    didYouKnow: 'This technique is called "lipogrammatic writing."',
  },
  {
    id: 'fact_27',
    category: 'unique',
    title: 'Animals Talk',
    description: 'Only two animals speak in the Bible: the serpent in Eden (Genesis 3) and Balaams donkey (Numbers 22).',
    icon: 'pets',
    tags: ['Animals', 'Stories'],
    didYouKnow: 'Both times, the animals spoke to deliver Gods message.',
  },
  {
    id: 'fact_28',
    category: 'unique',
    title: 'Perfect Palindrome Chapter',
    description: 'Psalm 117 is the shortest chapter (2 verses) and sits at the exact center of the Bible.',
    icon: 'center_focus_strong',
    tags: ['Psalm', 'Structure'],
    didYouKnow: 'It has 594 chapters before it and 594 chapters after it.',
  },
  {
    id: 'fact_29',
    category: 'unique',
    title: 'No Vowels Originally',
    description: 'The original Hebrew text had no vowels or punctuation - they were added centuries later by the Masoretes.',
    icon: 'text_format',
    tags: ['Hebrew', 'History'],
    didYouKnow: 'Readers relied on context and tradition to pronounce words correctly.',
  },
  {
    id: 'fact_30',
    category: 'unique',
    title: 'Bible Reading Marathon',
    description: 'If read continuously, it would take about 70 hours to read the entire Bible aloud.',
    icon: 'schedule',
    tags: ['Reading', 'Time'],
    didYouKnow: 'Thats about 3 days of non-stop reading.',
  },

  // Additional compelling facts
  {
    id: 'fact_31',
    category: 'historical',
    title: 'Bestselling Book Ever',
    description: 'The Bible is the bestselling book of all time, with over 5 billion copies distributed throughout history.',
    icon: 'trending_up',
    tags: ['Sales', 'Records'],
    didYouKnow: 'An estimated 100 million Bibles are sold or given away each year.',
  },
  {
    id: 'fact_32',
    category: 'numbers',
    title: 'Paul Wrote 13 Books',
    description: 'The Apostle Paul wrote 13 books of the New Testament, more than any other single author.',
    icon: 'edit',
    tags: ['Paul', 'Author'],
    didYouKnow: 'Some scholars debate whether Paul wrote Hebrews, which would make it 14.',
  },

  // NUMBERS & STATISTICS - More Facts
  {
    id: 'fact_33',
    category: 'numbers',
    title: '8,000 Prophecies in Scripture',
    description: 'There are approximately 8,000 predictive prophecies in the Bible, with about 3,268 verses containing prophecy.',
    icon: 'auto_graph',
    tags: ['Prophecy', 'Statistics'],
    didYouKnow: 'Around 2,000 of these prophecies have already been fulfilled with 100% accuracy.',
  },
  {
    id: 'fact_34',
    category: 'numbers',
    title: 'The Word "Lord" Appears 7,736 Times',
    description: 'The word "Lord" appears 7,736 times in the King James Version of the Bible.',
    icon: 'format_quote',
    tags: ['Words', 'KJV'],
    didYouKnow: 'The word "God" appears 4,444 times in the same version.',
  },
  {
    id: 'fact_35',
    category: 'numbers',
    title: '23 Years to Write the New Testament',
    description: 'The entire New Testament was written in approximately 23 years, from around 50 AD to 73 AD.',
    icon: 'calendar_month',
    tags: ['New Testament', 'Timeline'],
    didYouKnow: 'James is believed to be the first New Testament book written, around 45-50 AD.',
  },
  {
    id: 'fact_36',
    category: 'numbers',
    title: '929 Chapters in Old Testament',
    description: 'The Old Testament contains 929 chapters, while the New Testament has 260 chapters.',
    icon: 'library_books',
    tags: ['Chapters', 'Structure'],
    didYouKnow: 'This makes the Old Testament about 3.5 times longer than the New Testament.',
  },
  {
    id: 'fact_37',
    category: 'numbers',
    title: '40 Authors Over 1,500 Years',
    description: 'The Bible was written by about 40 different authors over a span of approximately 1,500 years.',
    icon: 'groups',
    tags: ['Authors', 'History'],
    didYouKnow: 'Despite many authors, the Bible maintains remarkable consistency in its message.',
  },
  {
    id: 'fact_38',
    category: 'numbers',
    title: '188 Chapters Mention Jesus',
    description: 'Jesus is mentioned in 188 of the 260 chapters in the New Testament.',
    icon: 'person',
    tags: ['Jesus', 'New Testament'],
    didYouKnow: 'Jesus spoke approximately 30,000 words recorded in the Gospels.',
  },
  {
    id: 'fact_39',
    category: 'numbers',
    title: 'Esther Never Mentions God',
    description: 'The Book of Esther never explicitly mentions God, yet His providence is evident throughout.',
    icon: 'visibility_off',
    tags: ['Esther', 'Unique'],
    didYouKnow: 'Song of Solomon also never explicitly mentions God by name.',
  },
  {
    id: 'fact_40',
    category: 'numbers',
    title: '1,260 Promises in the Bible',
    description: 'The Bible contains approximately 1,260 promises from God to believers.',
    icon: 'verified',
    tags: ['Promises', 'Faith'],
    didYouKnow: 'These include promises of salvation, provision, protection, and eternal life.',
  },

  // HISTORICAL FACTS - More
  {
    id: 'fact_41',
    category: 'historical',
    title: 'Qumran Caves Discovery',
    description: 'The Dead Sea Scrolls were discovered in 11 caves near Qumran between 1947 and 1956, containing parts of every Old Testament book except Esther.',
    icon: 'terrain',
    tags: ['Dead Sea', 'Discovery'],
    didYouKnow: 'These scrolls are 1,000 years older than previously known manuscripts.',
  },
  {
    id: 'fact_42',
    category: 'historical',
    title: 'Bible in Space',
    description: 'A microfilm Bible was taken to the moon on Apollo 14 in 1971 and is still there today.',
    icon: 'rocket_launch',
    tags: ['Space', 'Modern'],
    didYouKnow: '100 copies of the microfilm Bible were created for the moon mission.',
  },
  {
    id: 'fact_43',
    category: 'historical',
    title: 'Codex Sinaiticus',
    description: 'One of the oldest complete Bibles, the Codex Sinaiticus, dates to around 350 AD and contains the entire New Testament.',
    icon: 'history',
    tags: ['Manuscripts', 'Ancient'],
    didYouKnow: 'It was discovered at St. Catherines Monastery at Mount Sinai in 1844.',
  },
  {
    id: 'fact_44',
    category: 'historical',
    title: 'Wycliffes English Bible',
    description: 'John Wycliffe created the first complete English Bible translation in 1382, hand-written before the printing press.',
    icon: 'translate',
    tags: ['Translation', 'English'],
    didYouKnow: 'He was declared a heretic for translating the Bible into common language.',
  },
  {
    id: 'fact_45',
    category: 'historical',
    title: 'Biblical Events Confirmed',
    description: 'Archaeological discoveries have confirmed over 50 people mentioned in the Bible, including King David, Pontius Pilate, and Caiaphas.',
    icon: 'fact_check',
    tags: ['Archaeology', 'Evidence'],
    didYouKnow: 'The Pool of Siloam, mentioned in John 9, was discovered in 2004.',
  },
  {
    id: 'fact_46',
    category: 'historical',
    title: 'Illegal Bible Ownership',
    description: 'During the Middle Ages, owning a Bible in a language other than Latin was illegal and punishable by death.',
    icon: 'gavel',
    tags: ['History', 'Persecution'],
    didYouKnow: 'William Tyndale was executed in 1536 for translating the Bible into English.',
  },
  {
    id: 'fact_47',
    category: 'historical',
    title: 'First Printed Book',
    description: 'The Gutenberg Bible was the first major book printed using movable type in the Western world.',
    icon: 'menu_book',
    tags: ['Printing', 'Gutenberg'],
    didYouKnow: 'Only about 180 copies were originally printed, taking 3 years to complete.',
  },
  {
    id: 'fact_48',
    category: 'historical',
    title: 'Bible Fragments in Egypt',
    description: 'The oldest known New Testament fragment, P52, was found in Egypt and dates to around 125 AD, containing John 18:31-33.',
    icon: 'article',
    tags: ['Manuscripts', 'Egypt'],
    didYouKnow: 'This fragment is only about the size of a credit card.',
  },

  // PEOPLE & PLACES - More
  {
    id: 'fact_49',
    category: 'people',
    title: 'Enoch Never Died',
    description: 'Enoch was taken directly to heaven by God without experiencing death (Genesis 5:24). He lived 365 years.',
    icon: 'flight_takeoff',
    tags: ['Enoch', 'Heaven'],
    didYouKnow: 'Only Enoch and Elijah bypassed death in the Bible.',
  },
  {
    id: 'fact_50',
    category: 'people',
    title: 'Moses Wrote First Five Books',
    description: 'Moses wrote the first five books of the Bible (Genesis through Deuteronomy), called the Pentateuch or Torah.',
    icon: 'edit_note',
    tags: ['Moses', 'Torah'],
    didYouKnow: 'Deuteronomy 34 describes Moses death, likely added by Joshua.',
  },
  {
    id: 'fact_51',
    category: 'people',
    title: 'Mary Most Blessed Woman',
    description: 'Mary, the mother of Jesus, is the most mentioned woman in the Quran and appears in the Bible 19 times.',
    icon: 'woman',
    tags: ['Mary', 'New Testament'],
    didYouKnow: 'She was likely between 12-16 years old when she gave birth to Jesus.',
  },
  {
    id: 'fact_52',
    category: 'people',
    title: 'Job - Oldest Book',
    description: 'The Book of Job is considered the oldest book in the Bible, possibly written around 2000 BC.',
    icon: 'schedule',
    tags: ['Job', 'Ancient'],
    didYouKnow: 'Job lived approximately 140 years after his trials ended.',
  },
  {
    id: 'fact_53',
    category: 'people',
    title: 'Nazareth Was Tiny',
    description: 'Nazareth, where Jesus grew up, was a small village with an estimated population of only 200-400 people.',
    icon: 'home',
    tags: ['Nazareth', 'Jesus'],
    didYouKnow: 'It was so insignificant that Nathanael asked, "Can anything good come from Nazareth?"',
  },
  {
    id: 'fact_54',
    category: 'people',
    title: 'Paul Was a Tentmaker',
    description: 'The Apostle Paul supported himself by making tents while spreading the Gospel (Acts 18:3).',
    icon: 'work',
    tags: ['Paul', 'Occupation'],
    didYouKnow: 'He traveled approximately 10,000 miles during his missionary journeys.',
  },
  {
    id: 'fact_55',
    category: 'people',
    title: 'Solomon Had 700 Wives',
    description: 'King Solomon had 700 wives and 300 concubines, which eventually led him astray from God (1 Kings 11:3).',
    icon: 'groups',
    tags: ['Solomon', 'Kings'],
    didYouKnow: 'Solomon started well but his foreign wives turned his heart to other gods.',
  },
  {
    id: 'fact_56',
    category: 'people',
    title: 'Bethlehem Means House of Bread',
    description: 'Bethlehem, birthplace of Jesus, means "House of Bread" in Hebrew - fitting for the one who is the Bread of Life.',
    icon: 'place',
    tags: ['Bethlehem', 'Meaning'],
    didYouKnow: 'King David was also born in Bethlehem about 1,000 years earlier.',
  },

  // LANGUAGES & TRANSLATIONS - More
  {
    id: 'fact_57',
    category: 'languages',
    title: 'Bible in 3,000+ Languages',
    description: 'At least one book of the Bible has been translated into over 3,500 languages, with complete Bibles in 724 languages.',
    icon: 'language',
    tags: ['Translation', 'Global'],
    didYouKnow: 'About 1.5 billion people still lack the Bible in their native language.',
  },
  {
    id: 'fact_58',
    category: 'languages',
    title: 'Hebrew Has No Vowels',
    description: 'Original Hebrew manuscripts had no vowels, spaces, or punctuation - just consonants written right to left.',
    icon: 'text_format',
    tags: ['Hebrew', 'Language'],
    didYouKnow: 'Vowel points were added by Jewish scholars called Masoretes around 600-900 AD.',
  },
  {
    id: 'fact_59',
    category: 'languages',
    title: 'Greek in 9 Hours',
    description: 'The entire New Testament can be read aloud in Greek in approximately 9 hours.',
    icon: 'record_voice_over',
    tags: ['Greek', 'Reading'],
    didYouKnow: 'Early Christians often heard Scripture read aloud since few owned personal copies.',
  },
  {
    id: 'fact_60',
    category: 'languages',
    title: 'Septuagint Translation',
    description: 'The Septuagint, a Greek translation of the Hebrew Bible, was completed around 250 BC by 70 Jewish scholars.',
    icon: 'history_edu',
    tags: ['Septuagint', 'Translation'],
    didYouKnow: 'Jesus and the apostles often quoted from the Septuagint.',
  },
  {
    id: 'fact_61',
    category: 'languages',
    title: 'YHWH - Sacred Name',
    description: 'Gods name YHWH (Yahweh) appears 6,828 times in the Hebrew Bible but exact pronunciation was lost.',
    icon: 'grade',
    tags: ['Gods Name', 'Hebrew'],
    didYouKnow: 'Jews stopped pronouncing it out of reverence and said "Adonai" (Lord) instead.',
  },
  {
    id: 'fact_62',
    category: 'languages',
    title: 'English Bible Translations',
    description: 'There are over 900 English translations of the Bible, from complete Bibles to paraphrases.',
    icon: 'translate',
    tags: ['English', 'Versions'],
    didYouKnow: 'The NIV is currently the most popular English translation.',
  },
  {
    id: 'fact_63',
    category: 'languages',
    title: 'Aramaic - Jesus Language',
    description: 'Jesus spoke Aramaic, a language closely related to Hebrew, in his daily conversations.',
    icon: 'record_voice_over',
    tags: ['Aramaic', 'Jesus'],
    didYouKnow: 'Parts of Daniel and Ezra were originally written in Aramaic.',
  },
  {
    id: 'fact_64',
    category: 'languages',
    title: 'Koine Greek - Common Language',
    description: 'The New Testament was written in Koine Greek, the common language of the eastern Mediterranean world.',
    icon: 'public',
    tags: ['Greek', 'Language'],
    didYouKnow: 'Koine means "common" - it was the everyday language, not scholarly Greek.',
  },

  // PROPHECIES - More
  {
    id: 'fact_65',
    category: 'prophecies',
    title: 'Virgin Birth Prophesied',
    description: 'Isaiah 7:14 prophesied the virgin birth 700 years before Jesus: "The virgin will conceive and give birth to a son."',
    icon: 'child_care',
    tags: ['Isaiah', 'Birth'],
    didYouKnow: 'This prophecy was fulfilled in Matthew 1:23.',
  },
  {
    id: 'fact_66',
    category: 'prophecies',
    title: '30 Pieces of Silver',
    description: 'Zechariah 11:12-13 prophesied Jesus would be betrayed for 30 pieces of silver, written 500 years before.',
    icon: 'paid',
    tags: ['Zechariah', 'Betrayal'],
    didYouKnow: 'It also predicted the money would be thrown in the temple and used for a potters field.',
  },
  {
    id: 'fact_67',
    category: 'prophecies',
    title: 'Pierced for Our Sins',
    description: 'Isaiah 53:5 prophesied "He was pierced for our transgressions" 700 years before crucifixion.',
    icon: 'healing',
    tags: ['Isaiah', 'Suffering'],
    didYouKnow: 'Crucifixion wasnt even invented when Isaiah wrote this prophecy.',
  },
  {
    id: 'fact_68',
    category: 'prophecies',
    title: 'Not a Bone Broken',
    description: 'Psalm 34:20 prophesied the Messiahs bones would not be broken, fulfilled when soldiers did not break Jesus legs.',
    icon: 'verified',
    tags: ['Psalm', 'Crucifixion'],
    didYouKnow: 'The soldiers broke the legs of the criminals beside Jesus, but not his.',
  },
  {
    id: 'fact_69',
    category: 'prophecies',
    title: 'Born in Bethlehem',
    description: 'Micah 5:2 specified the Messiah would be born in Bethlehem Ephrathah, the smallest clan of Judah.',
    icon: 'location_on',
    tags: ['Micah', 'Bethlehem'],
    didYouKnow: 'This prophecy was so well known that the chief priests quoted it to Herod.',
  },
  {
    id: 'fact_70',
    category: 'prophecies',
    title: 'Cyrus Named 150 Years Early',
    description: 'Isaiah 44:28 named King Cyrus 150 years before he was born, prophesying he would rebuild Jerusalem.',
    icon: 'person_search',
    tags: ['Isaiah', 'Cyrus'],
    didYouKnow: 'When Cyrus read this prophecy about himself, he fulfilled it by letting Jews return.',
  },
  {
    id: 'fact_71',
    category: 'prophecies',
    title: 'Daniels 70 Weeks',
    description: 'Daniel 9:24-27 predicted the exact timing of the Messiahs arrival and death with remarkable precision.',
    icon: 'event',
    tags: ['Daniel', 'Timeline'],
    didYouKnow: 'Many scholars believe this pointed to the exact year Jesus entered Jerusalem.',
  },
  {
    id: 'fact_72',
    category: 'prophecies',
    title: 'Resurrection Foretold',
    description: 'Psalm 16:10 prophesied "You will not abandon me to the realm of the dead" - fulfilled in Jesus resurrection.',
    icon: 'refresh',
    tags: ['Psalm', 'Resurrection'],
    didYouKnow: 'Peter quoted this verse on Pentecost as proof of Jesus resurrection.',
  },

  // MIRACLES - More
  {
    id: 'fact_73',
    category: 'miracles',
    title: 'First Miracle - Water to Wine',
    description: 'Jesus first recorded miracle was turning water into wine at a wedding in Cana (John 2:1-11).',
    icon: 'celebration',
    tags: ['Jesus', 'Wine'],
    didYouKnow: 'He turned approximately 120-180 gallons of water into wine.',
  },
  {
    id: 'fact_74',
    category: 'miracles',
    title: 'Feeding 5,000',
    description: 'Jesus fed 5,000 men (plus women and children, possibly 15,000-20,000 total) with five loaves and two fish.',
    icon: 'restaurant',
    tags: ['Jesus', 'Provision'],
    didYouKnow: 'This is the only miracle recorded in all four Gospels.',
  },
  {
    id: 'fact_75',
    category: 'miracles',
    title: 'Walking on Water',
    description: 'Jesus walked on water during a storm, and Peter briefly did too before his faith wavered (Matthew 14:22-33).',
    icon: 'waves',
    tags: ['Jesus', 'Faith'],
    didYouKnow: 'This happened in the fourth watch of the night (3-6 AM).',
  },
  {
    id: 'fact_76',
    category: 'miracles',
    title: 'Lazarus Raised After 4 Days',
    description: 'Jesus raised Lazarus from the dead after he had been in the tomb for four days (John 11).',
    icon: 'favorite',
    tags: ['Jesus', 'Resurrection'],
    didYouKnow: 'Lazarus was a friend of Jesus, and Jesus wept at his tomb.',
  },
  {
    id: 'fact_77',
    category: 'miracles',
    title: 'Ax Head Floats',
    description: 'Elisha made an iron ax head float on water (2 Kings 6:1-7), defying natural laws.',
    icon: 'build',
    tags: ['Elisha', 'Provision'],
    didYouKnow: 'The ax was borrowed, so Elisha performed this miracle to prevent debt.',
  },
  {
    id: 'fact_78',
    category: 'miracles',
    title: 'Sun Goes Backward',
    description: 'God made the sun go backward 10 degrees as a sign to King Hezekiah (2 Kings 20:8-11).',
    icon: 'wb_sunny',
    tags: ['Hezekiah', 'Sign'],
    didYouKnow: 'This miracle confirmed Gods promise to heal Hezekiah and add 15 years to his life.',
  },
  {
    id: 'fact_79',
    category: 'miracles',
    title: 'Virgin Birth',
    description: 'Jesus was conceived by the Holy Spirit and born of the virgin Mary, a unique miracle in human history.',
    icon: 'child_friendly',
    tags: ['Jesus', 'Birth'],
    didYouKnow: 'An angel appeared to Joseph in a dream to explain this miraculous conception.',
  },
  {
    id: 'fact_80',
    category: 'miracles',
    title: 'Blind Man Sees',
    description: 'Jesus healed a man born blind by making mud with saliva, the only time he used this method (John 9).',
    icon: 'visibility',
    tags: ['Jesus', 'Healing'],
    didYouKnow: 'This led to a major confrontation with the Pharisees about working on the Sabbath.',
  },

  // UNIQUE FACTS - More
  {
    id: 'fact_81',
    category: 'unique',
    title: 'Longest Word',
    description: 'The longest word in the Bible is "Mahershalalhashbaz" (Isaiah 8:1) - a name meaning "quick to plunder, swift to spoil."',
    icon: 'sort_by_alpha',
    tags: ['Names', 'Isaiah'],
    didYouKnow: 'This was the name of Isaiahs son, used as a prophetic sign.',
  },
  {
    id: 'fact_82',
    category: 'unique',
    title: 'Middle Chapter is Psalm 117',
    description: 'Psalm 117 is the shortest chapter and also the middle chapter of the Bible with 594 chapters before and after it.',
    icon: 'center_focus_strong',
    tags: ['Psalm', 'Structure'],
    didYouKnow: 'It has only 2 verses but is a complete call to praise God.',
  },
  {
    id: 'fact_83',
    category: 'unique',
    title: 'Only Palindrome Chapter',
    description: 'The Bible has 1,189 chapters. Psalm 119 is the longest, and the middle verse is Psalm 118:8.',
    icon: 'compare_arrows',
    tags: ['Structure', 'Numbers'],
    didYouKnow: 'Psalm 118:8 says "It is better to take refuge in the Lord than to trust in humans."',
  },
  {
    id: 'fact_84',
    category: 'unique',
    title: 'Acrostic Poems',
    description: 'Psalm 119 is an acrostic poem where each section starts with a successive letter of the Hebrew alphabet.',
    icon: 'format_list_bulleted',
    tags: ['Psalm', 'Poetry'],
    didYouKnow: 'All 176 verses of Psalm 119 are about Gods Word.',
  },
  {
    id: 'fact_85',
    category: 'unique',
    title: 'Book Without Chapters',
    description: 'Obadiah, Philemon, 2 John, 3 John, and Jude each consist of only one chapter.',
    icon: 'article',
    tags: ['Books', 'Structure'],
    didYouKnow: '3 John is the shortest book with only 299 words in Greek.',
  },
  {
    id: 'fact_86',
    category: 'unique',
    title: 'Musical Instruments',
    description: 'The Bible mentions 22 different musical instruments, including cymbals, harps, lyres, and trumpets.',
    icon: 'music_note',
    tags: ['Music', 'Worship'],
    didYouKnow: 'Psalm 150 alone mentions 9 different instruments in its call to praise.',
  },
  {
    id: 'fact_87',
    category: 'unique',
    title: 'No Word for "Obey"',
    description: 'Ancient Hebrew had no separate word for "obey" - the word for "hear" and "obey" was the same (shema).',
    icon: 'hearing',
    tags: ['Hebrew', 'Language'],
    didYouKnow: 'To truly "hear" Gods Word meant to obey it - they were inseparable concepts.',
  },
  {
    id: 'fact_88',
    category: 'unique',
    title: 'Colors Mentioned',
    description: 'The Bible mentions seven colors: red, blue, purple, scarlet, white, black, and amber.',
    icon: 'palette',
    tags: ['Colors', 'Details'],
    didYouKnow: 'Purple dye was extremely expensive, made from thousands of sea snails.',
  },

  // MORE NUMBERS & STATISTICS
  {
    id: 'fact_89',
    category: 'numbers',
    title: '3,566 Verses About Love',
    description: 'Various forms of the word "love" appear in approximately 3,566 Bible verses.',
    icon: 'favorite',
    tags: ['Love', 'Themes'],
    didYouKnow: '1 Corinthians 13 is the famous "love chapter" describing true love.',
  },
  {
    id: 'fact_90',
    category: 'numbers',
    title: 'The Number 7',
    description: 'The number 7 appears over 700 times in the Bible, symbolizing completion and perfection.',
    icon: 'filter_7',
    tags: ['Numbers', 'Symbolism'],
    didYouKnow: 'God rested on the 7th day, and there are 7 days of creation.',
  },
  {
    id: 'fact_91',
    category: 'numbers',
    title: '12 Apostles, 12 Tribes',
    description: 'The number 12 represents Gods people - 12 tribes of Israel and 12 apostles chosen by Jesus.',
    icon: 'groups',
    tags: ['Numbers', 'Symbolism'],
    didYouKnow: 'The New Jerusalem has 12 gates and 12 foundations (Revelation 21).',
  },
  {
    id: 'fact_92',
    category: 'numbers',
    title: '40 Days and Nights',
    description: 'The number 40 often represents testing or trial: rain fell 40 days, Moses on mountain 40 days, Jesus fasted 40 days.',
    icon: 'timeline',
    tags: ['Numbers', 'Testing'],
    didYouKnow: 'Israel wandered 40 years in the wilderness, one year for each day spies explored Canaan.',
  },
  {
    id: 'fact_93',
    category: 'numbers',
    title: '153 Fish Caught',
    description: 'After resurrection, Jesus disciples caught exactly 153 fish (John 21:11) - a specific count preserved.',
    icon: 'set_meal',
    tags: ['Numbers', 'Miracle'],
    didYouKnow: 'Some believe 153 represented all known species of fish, symbolizing all nations.',
  },
  {
    id: 'fact_94',
    category: 'numbers',
    title: 'Genesis Word Count',
    description: 'Genesis contains 38,267 words in Hebrew, making it the longest book in the Torah.',
    icon: 'article',
    tags: ['Genesis', 'Statistics'],
    didYouKnow: 'Genesis covers more time than all other Bible books combined - from creation to Josephs death.',
  },
  {
    id: 'fact_95',
    category: 'numbers',
    title: 'Psalms Has 2,461 Verses',
    description: 'The Book of Psalms has 2,461 verses, more than any other book in the Bible.',
    icon: 'library_music',
    tags: ['Psalms', 'Poetry'],
    didYouKnow: 'Psalms is divided into 5 books, mirroring the 5 books of Moses.',
  },
  {
    id: 'fact_96',
    category: 'numbers',
    title: '3 Days in the Belly',
    description: 'Jonah spent 3 days in the fishs belly, which Jesus compared to his 3 days in the tomb.',
    icon: 'schedule',
    tags: ['Jonah', 'Prophecy'],
    didYouKnow: 'Jesus called this "the sign of Jonah" to prove his resurrection (Matthew 12:39-40).',
  },

  // MORE HISTORICAL FACTS
  {
    id: 'fact_97',
    category: 'historical',
    title: 'Earliest Complete Bible',
    description: 'The Codex Vaticanus (325-350 AD) is one of the oldest complete Greek Bibles still in existence.',
    icon: 'book',
    tags: ['Manuscripts', 'Vatican'],
    didYouKnow: 'It resides in the Vatican Library and has been there since at least 1475.',
  },
  {
    id: 'fact_98',
    category: 'historical',
    title: 'Geneva Bible First with Verses',
    description: 'The Geneva Bible (1560) was the first English Bible to add numbered verses to chapters.',
    icon: 'format_list_numbered',
    tags: ['Translation', 'Formatting'],
    didYouKnow: 'The Pilgrims brought the Geneva Bible to America on the Mayflower.',
  },
  {
    id: 'fact_99',
    category: 'historical',
    title: 'Hotels and Bibles',
    description: 'The Gideons International has placed over 2 billion Bibles in hotel rooms since 1899.',
    icon: 'hotel',
    tags: ['Modern', 'Distribution'],
    didYouKnow: 'They distribute Bibles in 200 countries and over 100 languages.',
  },
  {
    id: 'fact_100',
    category: 'historical',
    title: 'First Bible in America',
    description: 'The first Bible printed in America was in the Algonquian language (1663), not English.',
    icon: 'print',
    tags: ['America', 'Native'],
    didYouKnow: 'John Eliot translated it for Native Americans in Massachusetts.',
  },
  {
    id: 'fact_101',
    category: 'historical',
    title: 'Tyndales Last Words',
    description: 'William Tyndale, before being burned at stake for translating the Bible, prayed "Lord, open the King of Englands eyes."',
    icon: 'local_fire_department',
    tags: ['Martyrdom', 'Translation'],
    didYouKnow: 'Three years later, King Henry VIII authorized the English Bible.',
  },
  {
    id: 'fact_102',
    category: 'historical',
    title: 'Longest Surviving Text',
    description: 'The Bible is the most accurately preserved ancient text, with over 24,000 New Testament manuscript copies.',
    icon: 'verified_user',
    tags: ['Manuscripts', 'Preservation'],
    didYouKnow: 'The second best-preserved ancient work has only 643 copies (Homers Iliad).',
  },
  {
    id: 'fact_103',
    category: 'historical',
    title: 'Lincoln and the Bible',
    description: 'Abraham Lincoln often quoted the Bible and called it "the best gift God has given to man."',
    icon: 'account_balance',
    tags: ['America', 'Presidents'],
    didYouKnow: 'Many U.S. presidents have taken the oath of office on a Bible.',
  },
  {
    id: 'fact_104',
    category: 'historical',
    title: 'Most Stolen Book',
    description: 'The Bible is the most shoplifted book in the world, ironically violating the eighth commandment.',
    icon: 'report',
    tags: ['Modern', 'Irony'],
    didYouKnow: 'Its also the most purchased and most printed book in history.',
  },

  // MORE PEOPLE & PLACES
  {
    id: 'fact_105',
    category: 'people',
    title: 'Abraham - Father of Faith',
    description: 'Abraham is called the father of faith in Judaism, Christianity, and Islam, mentioned 308 times in the Bible.',
    icon: 'family_restroom',
    tags: ['Abraham', 'Faith'],
    didYouKnow: 'God called Abraham when he was 75 years old to leave his homeland.',
  },
  {
    id: 'fact_106',
    category: 'people',
    title: 'Rahab - Gentile Ancestor',
    description: 'Rahab, a Gentile prostitute who helped Israel, is listed in Jesus genealogy (Matthew 1:5).',
    icon: 'woman',
    tags: ['Rahab', 'Grace'],
    didYouKnow: 'She is also commended for her faith in Hebrews 11:31.',
  },
  {
    id: 'fact_107',
    category: 'people',
    title: 'Melchizedek Mystery',
    description: 'Melchizedek appears suddenly in Genesis 14 with no genealogy, called "king of righteousness" and "king of peace."',
    icon: 'help',
    tags: ['Melchizedek', 'Mystery'],
    didYouKnow: 'Hebrews 7 compares Jesus priesthood to Melchizedeks eternal priesthood.',
  },
  {
    id: 'fact_108',
    category: 'people',
    title: 'Ruth - Book Named After Woman',
    description: 'Ruth and Esther are the only two books of the Bible named after women.',
    icon: 'woman',
    tags: ['Ruth', 'Women'],
    didYouKnow: 'Ruth was a Moabite who became King Davids great-grandmother.',
  },
  {
    id: 'fact_109',
    category: 'people',
    title: 'Johns Name Means Grace',
    description: 'The name John (Yochanan in Hebrew) means "God is gracious" - fitting for the apostle of love.',
    icon: 'person',
    tags: ['John', 'Names'],
    didYouKnow: 'John wrote 5 New Testament books: Gospel, 1-3 John, and Revelation.',
  },
  {
    id: 'fact_110',
    category: 'people',
    title: 'Cain Built First City',
    description: 'Cain built the first recorded city in human history and named it after his son Enoch (Genesis 4:17).',
    icon: 'location_city',
    tags: ['Cain', 'Cities'],
    didYouKnow: 'This was after God marked Cain for protection following Abels murder.',
  },
  {
    id: 'fact_111',
    category: 'people',
    title: 'Babel - One Language',
    description: 'Before the Tower of Babel, the whole world spoke one language (Genesis 11:1).',
    icon: 'language',
    tags: ['Babel', 'Languages'],
    didYouKnow: 'God confused their language to stop them from building the tower to heaven.',
  },
  {
    id: 'fact_112',
    category: 'people',
    title: 'Egypt Mentioned 600 Times',
    description: 'Egypt is mentioned approximately 600 times in the Bible, more than any nation except Israel.',
    icon: 'flag',
    tags: ['Egypt', 'Nations'],
    didYouKnow: 'Joseph, Moses, and Jesus all spent significant time in Egypt.',
  },

  // MORE PROPHECIES
  {
    id: 'fact_113',
    category: 'prophecies',
    title: 'Daniels Four Kingdoms',
    description: 'Daniel 2 prophesied four world kingdoms: Babylon, Medo-Persia, Greece, and Rome - all fulfilled.',
    icon: 'account_balance',
    tags: ['Daniel', 'Kingdoms'],
    didYouKnow: 'The statue in Nebuchadnezzars dream represented these kingdoms in order.',
  },
  {
    id: 'fact_114',
    category: 'prophecies',
    title: 'Suffering Servant Songs',
    description: 'Isaiah 52:13-53:12, the suffering servant passage, details Jesus suffering with 10 specific prophecies.',
    icon: 'article',
    tags: ['Isaiah', 'Messiah'],
    didYouKnow: 'Written 700 years early, it describes crucifixion before it was invented.',
  },
  {
    id: 'fact_115',
    category: 'prophecies',
    title: 'Zechariahs Palm Sunday',
    description: 'Zechariah 9:9 prophesied the Messiah would enter Jerusalem on a donkey - fulfilled on Palm Sunday.',
    icon: 'nature',
    tags: ['Zechariah', 'Entry'],
    didYouKnow: 'This was the only time Jesus allowed people to publicly proclaim him king.',
  },
  {
    id: 'fact_116',
    category: 'prophecies',
    title: 'Lots Cast for Garments',
    description: 'Psalm 22:18 predicted soldiers would cast lots for Jesus clothing - fulfilled at the cross.',
    icon: 'casino',
    tags: ['Psalm', 'Crucifixion'],
    didYouKnow: 'They divided his garments but cast lots for his seamless tunic.',
  },
  {
    id: 'fact_117',
    category: 'prophecies',
    title: 'Born of a Woman',
    description: 'Genesis 3:15, given right after the fall, prophesied that the womans offspring would crush the serpent.',
    icon: 'shield',
    tags: ['Genesis', 'Messiah'],
    didYouKnow: 'This is called the "protoevangelium" - the first gospel promise.',
  },
  {
    id: 'fact_118',
    category: 'prophecies',
    title: 'Silent for 400 Years',
    description: 'After Malachi, there were 400 "silent years" with no prophets until John the Baptist.',
    icon: 'volume_off',
    tags: ['History', 'Prophets'],
    didYouKnow: 'This period saw Greek conquest, Maccabean revolt, and Roman occupation.',
  },
  {
    id: 'fact_119',
    category: 'prophecies',
    title: 'Fig Tree Generation',
    description: 'Jesus said the generation that sees Israel become a nation again would not pass (Matthew 24:32-34).',
    icon: 'eco',
    tags: ['Jesus', 'Israel'],
    didYouKnow: 'Israel became a nation again on May 14, 1948, after 2,000 years.',
  },
  {
    id: 'fact_120',
    category: 'prophecies',
    title: 'Gog and Magog',
    description: 'Ezekiel 38-39 prophesies a future invasion of Israel by a northern coalition led by "Gog."',
    icon: 'crisis_alert',
    tags: ['Ezekiel', 'Future'],
    didYouKnow: 'Many scholars believe this refers to Russia and its allies.',
  },

  // MORE MIRACLES
  {
    id: 'fact_121',
    category: 'miracles',
    title: 'Manna from Heaven',
    description: 'God provided manna (bread) from heaven every morning for 40 years in the wilderness (Exodus 16).',
    icon: 'bakery_dining',
    tags: ['Exodus', 'Provision'],
    didYouKnow: 'Manna means "What is it?" - the Israelites question when they first saw it.',
  },
  {
    id: 'fact_122',
    category: 'miracles',
    title: 'Water from Rock',
    description: 'Moses struck a rock and water gushed out to supply millions of Israelites and their livestock (Exodus 17:6).',
    icon: 'water_drop',
    tags: ['Moses', 'Provision'],
    didYouKnow: 'Paul says this rock that followed them was Christ (1 Corinthians 10:4).',
  },
  {
    id: 'fact_123',
    category: 'miracles',
    title: 'Fire from Heaven',
    description: 'Elijah prayed and fire fell from heaven, consuming his sacrifice, stones, dust, and water (1 Kings 18).',
    icon: 'whatshot',
    tags: ['Elijah', 'Prayer'],
    didYouKnow: 'This defeated 450 prophets of Baal on Mount Carmel.',
  },
  {
    id: 'fact_124',
    category: 'miracles',
    title: 'Shadow Heals',
    description: 'Peters shadow passing over sick people healed them (Acts 5:15) - power flowed through the apostles.',
    icon: 'healing',
    tags: ['Peter', 'Apostles'],
    didYouKnow: 'Paul had similar power - even handkerchiefs that touched him healed the sick.',
  },
  {
    id: 'fact_125',
    category: 'miracles',
    title: 'Oil Multiplied',
    description: 'Elisha multiplied a widows small jar of oil until she filled every container in town (2 Kings 4).',
    icon: 'water',
    tags: ['Elisha', 'Provision'],
    didYouKnow: 'The oil stopped flowing only when she ran out of jars to fill.',
  },
  {
    id: 'fact_126',
    category: 'miracles',
    title: 'Blind Bartimaeus',
    description: 'Jesus healed blind Bartimaeus after he persistently cried out, "Jesus, Son of David, have mercy!" (Mark 10).',
    icon: 'remove_red_eye',
    tags: ['Jesus', 'Faith'],
    didYouKnow: 'Bartimaeus immediately followed Jesus after receiving his sight.',
  },
  {
    id: 'fact_127',
    category: 'miracles',
    title: 'Fig Tree Withered',
    description: 'Jesus cursed a barren fig tree and it withered overnight, teaching about faith and fruitfulness (Mark 11:12-25).',
    icon: 'park',
    tags: ['Jesus', 'Faith'],
    didYouKnow: 'This was Jesus only "destructive" miracle recorded in the Gospels.',
  },
  {
    id: 'fact_128',
    category: 'miracles',
    title: 'Ten Lepers Healed',
    description: 'Jesus healed ten lepers at once, but only one returned to thank him - a Samaritan (Luke 17:11-19).',
    icon: 'spa',
    tags: ['Jesus', 'Gratitude'],
    didYouKnow: 'Jesus asked, "Were not all ten cleansed? Where are the other nine?"',
  },

  // MORE UNIQUE FACTS
  {
    id: 'fact_129',
    category: 'unique',
    title: 'Bible and Science',
    description: 'Job 26:7 says God "hangs the earth on nothing" - written 3,500 years before space exploration.',
    icon: 'science',
    tags: ['Job', 'Science'],
    didYouKnow: 'The Bible also describes the water cycle (Ecclesiastes 1:7) and ocean currents (Psalm 8:8).',
  },
  {
    id: 'fact_130',
    category: 'unique',
    title: 'Golden Rule',
    description: 'Jesus Golden Rule (Matthew 7:12) appears in positive form, unlike similar sayings that state it negatively.',
    icon: 'balance',
    tags: ['Jesus', 'Ethics'],
    didYouKnow: '"Do unto others as you would have them do unto you" - proactive love.',
  },
  {
    id: 'fact_131',
    category: 'unique',
    title: 'Beatitudes Blessings',
    description: 'The Sermon on the Mount contains nine beatitudes - "blessed are" statements from Jesus (Matthew 5:3-11).',
    icon: 'favorite_border',
    tags: ['Jesus', 'Blessings'],
    didYouKnow: 'Each beatitude promises a specific reward for godly character.',
  },
  {
    id: 'fact_132',
    category: 'unique',
    title: 'Armor of God',
    description: 'Ephesians 6:10-18 describes spiritual armor with 6 pieces: belt, breastplate, shoes, shield, helmet, sword.',
    icon: 'shield',
    tags: ['Spiritual', 'Warfare'],
    didYouKnow: 'Only one piece is offensive - the sword of the Spirit, which is Gods Word.',
  },
  {
    id: 'fact_133',
    category: 'unique',
    title: 'Fruit of the Spirit',
    description: 'Galatians 5:22-23 lists nine fruit of the Spirit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
    icon: 'eco',
    tags: ['Spirit', 'Character'],
    didYouKnow: 'Its "fruit" (singular), not "fruits" - they come as a package.',
  },
  {
    id: 'fact_134',
    category: 'unique',
    title: 'Seven Last Words',
    description: 'Jesus spoke seven final statements from the cross, including "Father, forgive them" and "It is finished."',
    icon: 'format_quote',
    tags: ['Jesus', 'Cross'],
    didYouKnow: 'His words show concern for others even in his own agony.',
  },
  {
    id: 'fact_135',
    category: 'unique',
    title: 'Tribes of Israel',
    description: 'Jacobs 12 sons became the 12 tribes, but the list varies because Levi got no land and Joseph split into Ephraim/Manasseh.',
    icon: 'account_tree',
    tags: ['Israel', 'Tribes'],
    didYouKnow: 'Revelation lists 144,000 sealed - 12,000 from each tribe.',
  },
  {
    id: 'fact_136',
    category: 'unique',
    title: 'Proverbs for Every Day',
    description: 'Proverbs has 31 chapters - you can read one chapter per day for an entire month.',
    icon: 'calendar_today',
    tags: ['Proverbs', 'Wisdom'],
    didYouKnow: 'Solomon wrote most of Proverbs and was known as the wisest man.',
  },

  // Continue adding more facts to reach 400+...
  {
    id: 'fact_137',
    category: 'numbers',
    title: 'Judges Ruled 410 Years',
    description: 'The period of the Judges in Israel lasted approximately 410 years before the first king.',
    icon: 'gavel',
    tags: ['Judges', 'Timeline'],
    didYouKnow: 'This period is summed up by "everyone did what was right in their own eyes."',
  },
  {
    id: 'fact_138',
    category: 'historical',
    title: 'Hezekiahs Tunnel',
    description: 'King Hezekiahs water tunnel, mentioned in 2 Kings 20, was discovered in Jerusalem and can still be walked through today.',
    icon: 'explore',
    tags: ['Archaeology', 'Jerusalem'],
    didYouKnow: 'An inscription found in the tunnel matches the biblical account.',
  },
  {
    id: 'fact_139',
    category: 'people',
    title: 'Nimrod - Mighty Hunter',
    description: 'Nimrod was the first "mighty warrior" on earth and built several ancient cities including Nineveh (Genesis 10:8-12).',
    icon: 'sports_martial_arts',
    tags: ['Nimrod', 'Giants'],
    didYouKnow: 'He is described as "a mighty hunter before the Lord."',
  },
  {
    id: 'fact_140',
    category: 'languages',
    title: 'Quotation Marks Invented',
    description: 'The Bible helped establish the use of quotation marks in written language when translators needed to show speech.',
    icon: 'format_quote',
    tags: ['Translation', 'Writing'],
    didYouKnow: 'Ancient manuscripts had no punctuation, capitalization, or quotation marks.',
  },

  // Adding many more facts to reach 400+... Let me continue with comprehensive additions
  {
    id: 'fact_141',
    category: 'miracles',
    title: 'Jesuss Transfiguration',
    description: 'Jesus was transfigured on a mountain, his face shining like the sun, witnessed by Peter, James, and John.',
    icon: 'wb_twilight',
    tags: ['Jesus', 'Glory'],
    didYouKnow: 'Moses and Elijah appeared with Jesus, representing the Law and the Prophets.',
  },
  {
    id: 'fact_142',
    category: 'prophecies',
    title: 'Temple Destroyed',
    description: 'Jesus prophesied the Jerusalem temple would be destroyed - fulfilled in 70 AD when Romans demolished it.',
    icon: 'domain_disabled',
    tags: ['Jesus', 'Temple'],
    didYouKnow: 'Not one stone was left on another, exactly as Jesus predicted.',
  },
  {
    id: 'fact_143',
    category: 'unique',
    title: 'Lords Prayer',
    description: 'The Lords Prayer (Matthew 6:9-13) contains approximately 70 words and covers seven petitions.',
    icon: 'church',
    tags: ['Prayer', 'Jesus'],
    didYouKnow: 'Its the most famous prayer in Christianity, taught by Jesus himself.',
  },
  {
    id: 'fact_144',
    category: 'numbers',
    title: 'Ten Commandments',
    description: 'God gave Moses the Ten Commandments on Mount Sinai, written on two stone tablets.',
    icon: 'article',
    tags: ['Law', 'Moses'],
    didYouKnow: 'The first four commandments relate to God, the last six to fellow humans.',
  },

  // I'll add a significant batch to reach over 400 total facts
  {
    id: 'fact_145',
    category: 'people',
    title: 'Timothy - Young Pastor',
    description: 'Timothy was a young pastor mentored by Paul, likely in his early 30s when leading the Ephesian church.',
    icon: 'school',
    tags: ['Timothy', 'Leadership'],
    didYouKnow: 'Paul wrote two letters to Timothy with pastoral guidance.',
  },
  {
    id: 'fact_146',
    category: 'numbers',
    title: 'Noah Built Ark at 600',
    description: 'Noah was 600 years old when he entered the ark. He lived 950 years total, dying 350 years after the flood.',
    icon: 'sailing',
    tags: ['Noah', 'Flood'],
    didYouKnow: 'The ark was approximately 450 feet long, 75 feet wide, and 45 feet high.',
  },
  {
    id: 'fact_147',
    category: 'miracles',
    title: 'Widow of Zarephaths Son',
    description: 'Elijah raised a widows son from the dead (1 Kings 17:17-24), one of the first recorded resurrections.',
    icon: 'favorite',
    tags: ['Elijah', 'Resurrection'],
    didYouKnow: 'This widow had just shared her last meal with Elijah before her son died.',
  },
  {
    id: 'fact_148',
    category: 'historical',
    title: 'Council of Nicaea',
    description: 'The Council of Nicaea (325 AD) confirmed the New Testament canon and established the Nicene Creed.',
    icon: 'gavel',
    tags: ['Church History', 'Canon'],
    didYouKnow: 'Over 300 bishops attended this first ecumenical council.',
  },
  {
    id: 'fact_149',
    category: 'unique',
    title: 'Amen Means Agreement',
    description: 'The word "Amen" means "so be it" or "truly" and appears 30 times in the Gospels from Jesus lips.',
    icon: 'check_circle',
    tags: ['Words', 'Prayer'],
    didYouKnow: 'Jesus often said "Amen, amen" (truly, truly) to emphasize important truths.',
  },
  {
    id: 'fact_150',
    category: 'prophecies',
    title: 'Jewish Diaspora',
    description: 'Moses prophesied (Deuteronomy 28:64) that Jews would be scattered among all nations - fulfilled for 2,000 years.',
    icon: 'public',
    tags: ['Moses', 'Israel'],
    didYouKnow: 'This prophecy also predicted their eventual return to the land.',
  },
  {
    id: 'fact_151',
    category: 'people',
    title: 'Deborah - Only Female Judge',
    description: 'Deborah was the only female judge of Israel and led them to victory over Canaanite oppression (Judges 4-5).',
    icon: 'woman',
    tags: ['Deborah', 'Judges'],
    didYouKnow: 'She held court under a palm tree called "the Palm of Deborah."',
  },
  {
    id: 'fact_152',
    category: 'languages',
    title: 'Bible Chapter Divisions',
    description: 'Stephen Langton divided the Bible into chapters in 1227 AD. Verse divisions came later in the 1550s.',
    icon: 'format_list_numbered',
    tags: ['Formatting', 'History'],
    didYouKnow: 'Before this, people referenced Scripture by book and general location.',
  },
  {
    id: 'fact_153',
    category: 'numbers',
    title: 'Abrahams Covenant',
    description: 'God made His covenant with Abraham when he was 75, and Abraham had Isaac at age 100.',
    icon: 'handshake',
    tags: ['Abraham', 'Covenant'],
    didYouKnow: 'Sarah was 90 when she gave birth to Isaac, laughing at the impossibility.',
  },
  {
    id: 'fact_154',
    category: 'miracles',
    title: 'Daniels Lions Den',
    description: 'Daniel survived a night in a lions den because God sent an angel to shut the lions mouths (Daniel 6).',
    icon: 'pets',
    tags: ['Daniel', 'Protection'],
    didYouKnow: 'His accusers were thrown in next and immediately devoured.',
  },
  {
    id: 'fact_155',
    category: 'unique',
    title: 'Selah in Psalms',
    description: 'The word "Selah" appears 74 times in the Psalms, likely meaning "pause" or "reflect."',
    icon: 'pause',
    tags: ['Psalms', 'Music'],
    didYouKnow: 'Its exact meaning has been lost, but it may have been a musical instruction.',
  },
  {
    id: 'fact_156',
    category: 'historical',
    title: 'Martin Luther 95 Theses',
    description: 'Martin Luther posted 95 theses in 1517, sparking the Reformation and making Bible translation a priority.',
    icon: 'campaign',
    tags: ['Reformation', 'History'],
    didYouKnow: 'Luther translated the New Testament into German in just 11 weeks.',
  },
  {
    id: 'fact_157',
    category: 'people',
    title: 'Gideon and 300 Men',
    description: 'God reduced Gideons army from 32,000 to 300 men to defeat the Midianites, showing His power (Judges 7).',
    icon: 'shield',
    tags: ['Gideon', 'Victory'],
    didYouKnow: 'They won using only torches, jars, and trumpets - no traditional weapons.',
  },
  {
    id: 'fact_158',
    category: 'prophecies',
    title: 'Tyre Destruction',
    description: 'Ezekiel 26 prophesied Tyres complete destruction - fulfilled when Alexander scraped the ruins into the sea.',
    icon: 'delete_forever',
    tags: ['Ezekiel', 'Fulfilled'],
    didYouKnow: 'Alexander used the rubble to build a causeway to the island city.',
  },
  {
    id: 'fact_159',
    category: 'numbers',
    title: 'Three Temptations',
    description: 'Satan tempted Jesus three times in the wilderness, and Jesus answered each with Scripture (Matthew 4).',
    icon: 'filter_3',
    tags: ['Jesus', 'Temptation'],
    didYouKnow: 'Each answer came from Deuteronomy, the book about Gods Word.',
  },
  {
    id: 'fact_160',
    category: 'miracles',
    title: 'Shadrach, Meshach, Abednego',
    description: 'Three Hebrews survived a fiery furnace heated 7 times hotter, with a fourth figure appearing (Daniel 3).',
    icon: 'local_fire_department',
    tags: ['Daniel', 'Protection'],
    didYouKnow: 'They came out without even smelling like smoke.',
  },
  {
    id: 'fact_161',
    category: 'unique',
    title: 'Sword of the Spirit',
    description: 'The Bible is called "the sword of the Spirit" in Ephesians 6:17, the only offensive weapon in Gods armor.',
    icon: 'military_tech',
    tags: ['Spiritual', 'Armor'],
    didYouKnow: 'Its described as "sharper than any two-edged sword" in Hebrews 4:12.',
  },
  {
    id: 'fact_162',
    category: 'languages',
    title: 'Jesus Spoke Four Languages',
    description: 'Jesus likely spoke Aramaic (daily), Hebrew (Scripture), Greek (commerce), and possibly Latin.',
    icon: 'language',
    tags: ['Jesus', 'Languages'],
    didYouKnow: 'His words on the cross in Aramaic were "Eloi, Eloi, lema sabachthani?"',
  },
  {
    id: 'fact_163',
    category: 'historical',
    title: 'Pontius Pilate Stone',
    description: 'A stone inscription mentioning Pilate was discovered in 1961, confirming his historical existence.',
    icon: 'history',
    tags: ['Archaeology', 'Evidence'],
    didYouKnow: 'It was found in a theater in Caesarea Maritima.',
  },
  {
    id: 'fact_164',
    category: 'people',
    title: 'Josiah - Boy King',
    description: 'Josiah became king at age 8 and led great reforms, discovering the lost Book of the Law at 18 (2 Kings 22).',
    icon: 'child_care',
    tags: ['Kings', 'Reform'],
    didYouKnow: 'He tore down idols and restored temple worship throughout Judah.',
  },
  {
    id: 'fact_165',
    category: 'numbers',
    title: 'Jesus 40-Day Appearances',
    description: 'Jesus appeared to His disciples over 40 days after resurrection before ascending to heaven (Acts 1:3).',
    icon: 'event',
    tags: ['Jesus', 'Resurrection'],
    didYouKnow: 'He appeared to over 500 people at once (1 Corinthians 15:6).',
  },
  {
    id: 'fact_166',
    category: 'prophecies',
    title: 'Israel Reborn in One Day',
    description: 'Isaiah 66:8 asked "Can a nation be born in a day?" - fulfilled May 14, 1948 when Israel was reestablished.',
    icon: 'flag',
    tags: ['Isaiah', 'Israel'],
    didYouKnow: 'This happened after 2,000 years of diaspora, exactly as prophesied.',
  },
  {
    id: 'fact_167',
    category: 'miracles',
    title: 'Joshuas Long Day',
    description: 'The sun stood still for about a full day during battle so Israel could complete their victory (Joshua 10:13).',
    icon: 'wb_sunny',
    tags: ['Joshua', 'Battle'],
    didYouKnow: 'This is the longest day in human history according to the Bible.',
  },
  {
    id: 'fact_168',
    category: 'unique',
    title: 'Greatest Commandment',
    description: 'Jesus said the greatest commandment is to love God with all your heart, soul, and mind (Matthew 22:37-38).',
    icon: 'favorite',
    tags: ['Jesus', 'Law'],
    didYouKnow: 'The second is like it: "Love your neighbor as yourself."',
  },
  {
    id: 'fact_169',
    category: 'people',
    title: 'Samson and Delilah',
    description: 'Samsons strength came from his uncut hair, a Nazirite vow. Delilah betrayed him to the Philistines (Judges 16).',
    icon: 'fitness_center',
    tags: ['Samson', 'Judges'],
    didYouKnow: 'His final act killed more enemies in death than in his entire life.',
  },
  {
    id: 'fact_170',
    category: 'languages',
    title: 'Oldest Bible Still Used',
    description: 'The Ethiopian Orthodox Church uses the oldest complete Bible, including books not in other canons.',
    icon: 'book',
    tags: ['Ethiopia', 'Canon'],
    didYouKnow: 'Their Bible has 81 books, more than any other Christian tradition.',
  },
  {
    id: 'fact_171',
    category: 'historical',
    title: 'Caiaphas Bone Box',
    description: 'An ossuary (bone box) inscribed "Joseph son of Caiaphas" was found in 1990, confirming the high priest.',
    icon: 'inventory_2',
    tags: ['Archaeology', 'New Testament'],
    didYouKnow: 'Caiaphas presided over Jesus trial before Pilate.',
  },
  {
    id: 'fact_172',
    category: 'numbers',
    title: 'Five Smooth Stones',
    description: 'David chose five smooth stones to fight Goliath but needed only one (1 Samuel 17).',
    icon: 'filter_5',
    tags: ['David', 'Faith'],
    didYouKnow: 'Goliath had four brothers, so David may have prepared for all five.',
  },
  {
    id: 'fact_173',
    category: 'miracles',
    title: 'Peters Mother-in-Law',
    description: 'Jesus healed Peters mother-in-law of a fever by simply touching her hand (Matthew 8:14-15).',
    icon: 'healing',
    tags: ['Jesus', 'Healing'],
    didYouKnow: 'She immediately got up and began serving them.',
  },
  {
    id: 'fact_174',
    category: 'prophecies',
    title: 'Darkness at Crucifixion',
    description: 'Amos 8:9 prophesied darkness at noon - fulfilled when darkness covered the land during Jesus crucifixion.',
    icon: 'nightlight',
    tags: ['Amos', 'Crucifixion'],
    didYouKnow: 'The darkness lasted three hours, from noon to 3 PM.',
  },
  {
    id: 'fact_175',
    category: 'unique',
    title: 'Parable of Prodigal Son',
    description: 'Jesus parable of the prodigal son (Luke 15) illustrates Gods unconditional love and forgiveness.',
    icon: 'family_restroom',
    tags: ['Parables', 'Grace'],
    didYouKnow: 'The father saw his son from far off, meaning he was watching for him daily.',
  },
  {
    id: 'fact_176',
    category: 'people',
    title: 'Queen of Sheba',
    description: 'The Queen of Sheba traveled 1,200 miles to test Solomons wisdom with hard questions (1 Kings 10).',
    icon: 'woman',
    tags: ['Solomon', 'Wisdom'],
    didYouKnow: 'She left breathless, saying the half had not been told to her.',
  },
  {
    id: 'fact_177',
    category: 'numbers',
    title: 'Peter Denied Three Times',
    description: 'Peter denied knowing Jesus three times before the rooster crowed, as Jesus predicted (Matthew 26:34).',
    icon: 'block',
    tags: ['Peter', 'Prophecy'],
    didYouKnow: 'Jesus later asked Peter "Do you love me?" three times, restoring him.',
  },
  {
    id: 'fact_178',
    category: 'historical',
    title: 'Coptic Christians',
    description: 'Egyptian Coptic Christians trace their church to Mark the Evangelist in 42 AD.',
    icon: 'church',
    tags: ['Church', 'Egypt'],
    didYouKnow: 'They still use the Coptic language, descended from ancient Egyptian, in liturgy.',
  },
  {
    id: 'fact_179',
    category: 'miracles',
    title: 'Malchus Ear Healed',
    description: 'Jesus healed the ear of Malchus, the high priests servant, after Peter cut it off (Luke 22:51).',
    icon: 'hearing',
    tags: ['Jesus', 'Healing'],
    didYouKnow: 'This was Jesus last recorded miracle before His crucifixion.',
  },
  {
    id: 'fact_180',
    category: 'languages',
    title: 'Wycliffe Bible Translators',
    description: 'Wycliffe Bible Translators has helped translate Scripture into over 700 languages since 1942.',
    icon: 'translate',
    tags: ['Translation', 'Modern'],
    didYouKnow: 'They aim to have Bible translation started in every language by 2025.',
  },
  {
    id: 'fact_181',
    category: 'prophecies',
    title: 'Rebuilt in Three Days',
    description: 'Jesus said "Destroy this temple, and in three days I will raise it up" - referring to His resurrection (John 2:19).',
    icon: 'domain',
    tags: ['Jesus', 'Temple'],
    didYouKnow: 'His accusers twisted these words at His trial.',
  },
  {
    id: 'fact_182',
    category: 'unique',
    title: 'Good Samaritan',
    description: 'Jesus parable of the Good Samaritan (Luke 10) redefined "neighbor" to include cultural enemies.',
    icon: 'volunteer_activism',
    tags: ['Parables', 'Love'],
    didYouKnow: 'Jews and Samaritans had mutual hatred, making this parable shocking.',
  },
  {
    id: 'fact_183',
    category: 'people',
    title: 'Hezekiah Extended Life',
    description: 'God added 15 years to Hezekiahs life after he prayed, shown by making the sun go backward (2 Kings 20).',
    icon: 'update',
    tags: ['Hezekiah', 'Prayer'],
    didYouKnow: 'Isaiah had just told him to set his house in order because he would die.',
  },
  {
    id: 'fact_184',
    category: 'numbers',
    title: 'Two Copper Coins',
    description: 'Jesus praised a widow who gave two small copper coins - all she had - more than the rich (Mark 12:42).',
    icon: 'paid',
    tags: ['Giving', 'Heart'],
    didYouKnow: 'He said she gave more because she gave everything, trusting God.',
  },
  {
    id: 'fact_185',
    category: 'miracles',
    title: 'Pool of Bethesda',
    description: 'Jesus healed a man at the Pool of Bethesda who had been disabled for 38 years (John 5:1-9).',
    icon: 'pool',
    tags: ['Jesus', 'Healing'],
    didYouKnow: 'This pool was discovered by archaeologists, confirming Johns detailed description.',
  },
  {
    id: 'fact_186',
    category: 'historical',
    title: 'Bible in Every Hotel',
    description: 'The practice of placing Bibles in hotel rooms started with the Gideons in 1908 in Montana.',
    icon: 'hotel',
    tags: ['Modern', 'Gideons'],
    didYouKnow: 'The first hotel to receive Gideon Bibles was the Superior Hotel in Montana.',
  },
  {
    id: 'fact_187',
    category: 'unique',
    title: 'Mustard Seed Faith',
    description: 'Jesus said faith as small as a mustard seed can move mountains (Matthew 17:20).',
    icon: 'grass',
    tags: ['Faith', 'Parables'],
    didYouKnow: 'Mustard seeds are tiny, about 1-2 millimeters in diameter.',
  },
  {
    id: 'fact_188',
    category: 'people',
    title: 'Esther Saved Jews',
    description: 'Queen Esther risked her life to save the Jewish people from genocide in Persia (Book of Esther).',
    icon: 'woman',
    tags: ['Esther', 'Courage'],
    didYouKnow: 'Her uncle Mordecai said "Who knows if you were made queen for such a time as this?"',
  },
  {
    id: 'fact_189',
    category: 'languages',
    title: 'Jesus Name Meaning',
    description: 'The name "Jesus" is Greek for Hebrew "Yeshua," meaning "The Lord is Salvation."',
    icon: 'label',
    tags: ['Names', 'Jesus'],
    didYouKnow: 'The angel specifically told Joseph to name him Jesus because He would save people from sin.',
  },
  {
    id: 'fact_190',
    category: 'prophecies',
    title: 'Scatter My Sheep',
    description: 'Zechariah 13:7 prophesied "Strike the shepherd, the sheep will scatter" - fulfilled when disciples fled at arrest.',
    icon: 'pets',
    tags: ['Zechariah', 'Disciples'],
    didYouKnow: 'Jesus quoted this verse at the Last Supper (Matthew 26:31).',
  },
  {
    id: 'fact_191',
    category: 'numbers',
    title: 'Seventy Elders',
    description: 'Moses appointed 70 elders to help lead Israel. Jesus later sent out 70 disciples (Luke 10:1).',
    icon: 'groups',
    tags: ['Numbers', 'Leadership'],
    didYouKnow: 'The number 70 often represents completeness or fullness in Scripture.',
  },
  {
    id: 'fact_192',
    category: 'miracles',
    title: 'Coin in Fish',
    description: 'Jesus told Peter to catch a fish with a coin in its mouth to pay their temple tax (Matthew 17:27).',
    icon: 'savings',
    tags: ['Jesus', 'Provision'],
    didYouKnow: 'This showed Jesus authority over both nature and finances.',
  },
  {
    id: 'fact_193',
    category: 'unique',
    title: 'Love Chapter',
    description: '1 Corinthians 13 is the famous "Love Chapter," defining true biblical love with 15 characteristics.',
    icon: 'favorite',
    tags: ['Love', 'Paul'],
    didYouKnow: 'It says love never fails, outlasting all spiritual gifts.',
  },
  {
    id: 'fact_194',
    category: 'historical',
    title: 'Nero Persecuted Christians',
    description: 'Roman Emperor Nero blamed Christians for the fire of Rome in 64 AD, beginning severe persecution.',
    icon: 'whatshot',
    tags: ['Persecution', 'Rome'],
    didYouKnow: 'Peter and Paul were likely martyred during Neros reign.',
  },
  {
    id: 'fact_195',
    category: 'people',
    title: 'John the Baptist',
    description: 'John the Baptist was Jesus cousin, six months older, and prepared the way for Jesus ministry.',
    icon: 'person',
    tags: ['John', 'Prophet'],
    didYouKnow: 'He was the last Old Testament prophet and first New Testament prophet.',
  },
  {
    id: 'fact_196',
    category: 'numbers',
    title: 'Solomons Wisdom',
    description: 'God gave Solomon wisdom. He wrote 3,000 proverbs and 1,005 songs (1 Kings 4:32).',
    icon: 'psychology',
    tags: ['Solomon', 'Wisdom'],
    didYouKnow: 'People came from all nations to hear Solomons wisdom.',
  },
  {
    id: 'fact_197',
    category: 'miracles',
    title: 'Woman with Issue of Blood',
    description: 'A woman who suffered bleeding for 12 years was healed instantly by touching Jesus garment (Mark 5:25-34).',
    icon: 'healing',
    tags: ['Jesus', 'Faith'],
    didYouKnow: 'She had spent all her money on doctors with no improvement.',
  },
  {
    id: 'fact_198',
    category: 'prophecies',
    title: 'Out of Egypt',
    description: 'Hosea 11:1 "Out of Egypt I called my son" - fulfilled when Joseph brought Jesus back from Egypt (Matthew 2:15).',
    icon: 'flight',
    tags: ['Hosea', 'Jesus'],
    didYouKnow: 'This echoed Israel coming out of Egypt in the Exodus.',
  },
  {
    id: 'fact_199',
    category: 'unique',
    title: 'Faith Hall of Fame',
    description: 'Hebrews 11 lists heroes of faith including Abel, Enoch, Noah, Abraham, Moses, and many others.',
    icon: 'emoji_events',
    tags: ['Faith', 'Heroes'],
    didYouKnow: 'It says "without faith it is impossible to please God" (Hebrews 11:6).',
  },
  {
    id: 'fact_200',
    category: 'languages',
    title: 'Jesus Titles',
    description: 'Jesus has over 200 names and titles in the Bible including Emmanuel, Prince of Peace, Good Shepherd, and Lamb of God.',
    icon: 'star',
    tags: ['Jesus', 'Names'],
    didYouKnow: 'Revelation 19:16 calls Him "King of kings and Lord of lords."',
  },
];

const BibleFastFacts = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFact, setSelectedFact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal animation refs for detail view
  const detailSlideAnim = useRef(new Animated.Value(0)).current;
  const detailFadeAnim = useRef(new Animated.Value(0)).current;
  const detailPanY = useRef(new Animated.Value(0)).current;

  // Load favorites from storage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fade in animation
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Reset pan value when modal closes
  useEffect(() => {
    if (!selectedFact) {
      detailPanY.setValue(0);
    }
  }, [selectedFact]);

  // Pan gesture handler for fact detail modal
  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          detailPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          hapticFeedback.success();
          Animated.parallel([
            Animated.timing(detailSlideAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(detailFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setSelectedFact(null);
          });
        } else {
          hapticFeedback.light();
          Animated.spring(detailPanY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate fact detail modal in/out
  useEffect(() => {
    if (selectedFact) {
      detailSlideAnim.setValue(0);
      detailFadeAnim.setValue(0);
      
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(detailSlideAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(detailFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      detailSlideAnim.setValue(0);
      detailFadeAnim.setValue(0);
    }
  }, [selectedFact]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('bible_fast_facts_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('bible_fast_facts_favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = (factId) => {
    hapticFeedback.light();
    const newFavorites = favorites.includes(factId)
      ? favorites.filter(id => id !== factId)
      : [...favorites, factId];
    saveFavorites(newFavorites);
  };

  const handleShare = async (fact) => {
    hapticFeedback.light();
    try {
      await Share.share({
        message: `📖 Bible Fast Fact\n\n${fact.title}\n\n${fact.description}\n\n💡 Did You Know? ${fact.didYouKnow}`,
        title: fact.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getFilteredFacts = () => {
    let filtered = fastFacts;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(fact => fact.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fact =>
        fact.title.toLowerCase().includes(query) ||
        fact.description.toLowerCase().includes(query) ||
        fact.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const handleFactPress = (fact) => {
    hapticFeedback.light();
    setSelectedFact(fact);
  };

  const renderCategoryFilters = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => {
                hapticFeedback.light();
                setSelectedCategory(category.id);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected
                    ? `${category.color}20`
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.05)',
                  borderColor: isSelected ? category.color : theme.border,
                },
              ]}
            >
              <MaterialIcons
                name={category.icon}
                size={18}
                color={isSelected ? category.color : theme.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: isSelected ? category.color : theme.textSecondary,
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderFactCard = (fact, index) => {
    const category = categories.find(c => c.id === fact.category);
    const isFavorite = favorites.includes(fact.id);

    return (
      <Animated.View
        key={fact.id}
        style={[
          styles.factCard,
          viewMode === 'list' && styles.factCardList,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleFactPress(fact)}
        >
          <LinearGradient
            colors={category?.gradient || [theme.primary, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.factCardGradient}
          >
            <View style={styles.factCardHeader}>
              <View style={[styles.factIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <MaterialIcons name={fact.icon} size={28} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(fact.id)}
                style={styles.favoriteButton}
              >
                <MaterialIcons
                  name={isFavorite ? 'favorite' : 'favorite-border'}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.factTitle} numberOfLines={2}>
              {fact.title}
            </Text>

            <Text style={styles.factDescription} numberOfLines={3}>
              {fact.description}
            </Text>

            <View style={styles.factFooter}>
              <View style={styles.factTags}>
                {fact.tags.slice(0, 2).map((tag, idx) => (
                  <View key={idx} style={styles.factTag}>
                    <Text style={styles.factTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFactDetail = () => {
    if (!selectedFact) return null;

    const category = categories.find(c => c.id === selectedFact.category);
    const isFavorite = favorites.includes(selectedFact.id);

    const modalTranslateY = detailSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1000, 0],
    });

    const combinedTranslateY = Animated.add(modalTranslateY, detailPanY);

    const handleBackdropClose = () => {
      Animated.parallel([
        Animated.timing(detailSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(detailFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedFact(null);
      });
    };

    return (
      <Modal
        visible={!!selectedFact}
        transparent={true}
        animationType="none"
        onRequestClose={handleBackdropClose}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          {/* Backdrop */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: detailFadeAnim }}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={handleBackdropClose}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: combinedTranslateY }],
                opacity: detailFadeAnim,
                backgroundColor: theme.background,
                maxHeight: '85%',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 10,
              },
            ]}
          >
            <View style={styles.detailSafeArea}>
              {/* Drag Handle */}
              <View
                style={[styles.modalHandle, { paddingTop: 12, paddingBottom: 4 }]}
                {...detailPanResponder.panHandlers}
              >
                <View
                  style={[
                    styles.handleBar,
                    {
                      width: 40,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
                    },
                  ]}
                />
              </View>

              {/* Header */}
              <View
                style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
                {...detailPanResponder.panHandlers}
              >
                <View style={{ width: 40 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  Fast Fact
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                style={styles.detailContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Fact Hero with Gradient */}
                <LinearGradient
                  colors={category?.gradient || [theme.primary, theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.factHero}
                >
                  <View style={styles.factHeroContent}>
                    <View style={[styles.factHeroIconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <MaterialIcons name={selectedFact.icon} size={48} color="#FFFFFF" />
                    </View>

                    <Text style={styles.factHeroTitle}>{selectedFact.title}</Text>

                    <View style={styles.factHeroBadge}>
                      <MaterialIcons name={category?.icon} size={16} color="#FFFFFF" />
                      <Text style={styles.factHeroBadgeText}>{category?.name}</Text>
                    </View>

                    <View style={styles.factHeroActions}>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(selectedFact.id)}
                        style={[styles.factHeroActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      >
                        <MaterialIcons
                          name={isFavorite ? 'favorite' : 'favorite-border'}
                          size={24}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShare(selectedFact)}
                        style={[styles.factHeroActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      >
                        <MaterialIcons name="share" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>

                {/* Did You Know Section */}
                <View style={styles.detailContentContainer}>
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="lightbulb" size={24} color={category?.color} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        Did You Know?
                      </Text>
                    </View>
                    <Text style={[styles.detailDescription, { color: theme.text }]}>
                      {selectedFact.description}
                    </Text>
                  </View>

                  {/* The Fact Section */}
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="info" size={24} color={theme.primary} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        The Fact
                      </Text>
                    </View>
                    <Text style={[styles.detailDidYouKnow, { color: theme.text }]}>
                      {selectedFact.didYouKnow}
                    </Text>
                  </View>

                  {/* Tags Section */}
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="label" size={24} color={theme.textSecondary} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        Tags
                      </Text>
                    </View>
                    <View style={styles.detailTagsContainer}>
                      {selectedFact.tags.map((tag, idx) => (
                        <View
                          key={idx}
                          style={[styles.detailTag, { backgroundColor: `${category?.color}20` }]}
                        >
                          <Text style={[styles.detailTagText, { color: category?.color }]}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const filteredFacts = getFilteredFacts();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Transparent Blurred Header */}
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              style={styles.backButton}
            >
              <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Fast Facts</Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              }}
              style={styles.viewModeButton}
            >
              <MaterialIcons
                name={viewMode === 'grid' ? 'view-list' : 'grid-view'}
                size={24}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search facts..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          {renderCategoryFilters()}

          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredFacts.length} {filteredFacts.length === 1 ? 'fact' : 'facts'}
            </Text>
            {favorites.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setSearchQuery('');
                  setSelectedCategory('all');
                  // Could add favorites filter here
                }}
              >
                <Text style={[styles.favoritesLink, { color: theme.primary }]}>
                  {favorites.length} {favorites.length === 1 ? 'favorite' : 'favorites'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Facts Grid/List */}
          <View style={[styles.factsContainer, viewMode === 'list' && styles.factsContainerList]}>
            {filteredFacts.length > 0 ? (
              filteredFacts.map((fact, index) => renderFactCard(fact, index))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={64} color={theme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No facts found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fact Detail Modal */}
        {renderFactDetail()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  viewModeButton: {
    width: 48,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'ios' ? 110 : 80,
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  favoritesLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  factsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  factsContainerList: {
    flexDirection: 'column',
  },
  factCard: {
    width: (width - 56) / 2,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  factCardList: {
    width: '100%',
  },
  factCardGradient: {
    padding: 16,
    minHeight: 220,
  },
  factCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  factIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    padding: 4,
  },
  factTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  factDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
    lineHeight: 20,
    flex: 1,
  },
  factFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  factTags: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  factTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  factTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  // Detail Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
  },
  detailSafeArea: {
    flex: 1,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  factHero: {
    padding: 30,
  },
  factHeroContent: {
    alignItems: 'center',
  },
  factHeroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  factHeroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 32,
    textAlign: 'center',
  },
  factHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 20,
  },
  factHeroBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  factHeroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  factHeroActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailCloseButton: {
    padding: 4,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  detailActionButton: {
    padding: 4,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 34,
  },
  detailCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  detailCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailContent: {
    flex: 1,
  },
  detailContentContainer: {
    padding: 20,
  },
  detailSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailDidYouKnow: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  detailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BibleFastFacts;

