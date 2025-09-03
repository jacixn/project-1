import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const BibleTimeline = ({ visible, onClose, onNavigateToVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedEra, setSelectedEra] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = millennia, 2 = centuries, 3 = decades, 4 = years
  const [activeFilters, setActiveFilters] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const scrollViewRef = useRef(null);

  // Bible Timeline Eras with engaging descriptions for 15-year-olds
  const timelineEras = [
    {
      id: 'primeval',
      title: 'The Beginning',
      subtitle: 'Creation & First Humans',
      period: '? - 2000 BC',
      color: '#9C27B0',
      icon: '🌱',
      description: 'God creates the world, Adam & Eve live in paradise, but sin enters through the forbidden fruit. The first murder happens, and eventually God floods the earth, saving only Noah\'s family.',
      keyEvents: ['Creation', 'Garden of Eden', 'The Fall', 'Cain & Abel', 'Noah\'s Flood', 'Tower of Babel']
    },
    {
      id: 'patriarchs',
      title: 'The Patriarchs',
      subtitle: 'God\'s Chosen Family',
      period: '2000 - 1800 BC',
      color: '#FF9800',
      icon: '⭐',
      description: 'God calls Abraham to leave everything and follow Him, promising to make his family into a great nation. Isaac, Jacob (Israel), and Joseph\'s amazing story of dreams and becoming ruler of Egypt!',
      keyEvents: ['Abraham\'s Call', 'Isaac\'s Birth', 'Jacob\'s Ladder', 'Joseph\'s Dreams', 'Move to Egypt']
    },
    {
      id: 'exodus',
      title: 'The Great Escape',
      subtitle: 'Freedom from Egypt',
      period: '1800 - 1400 BC',
      color: '#F44336',
      icon: '📜',
      description: 'After 400 years as slaves, Moses leads the Israelites out of Egypt with incredible miracles! The Red Sea parts, God gives the Ten Commandments, and they wander in the desert for 40 years.',
      keyEvents: ['Moses & Burning Bush', '10 Plagues', 'Red Sea Crossing', 'Mount Sinai', '40 Years Wandering']
    },
    {
      id: 'conquest',
      title: 'Conquering Heroes',
      subtitle: 'Taking the Promised Land',
      period: '1400 - 1100 BC',
      color: '#4CAF50',
      icon: '⚔️',
      description: 'Joshua leads epic battles to conquer the Promised Land! Walls of Jericho fall, the sun stands still, and amazing judges like Deborah, Gideon, and super-strong Samson defend Israel.',
      keyEvents: ['Joshua & Jericho', 'Deborah the Judge', 'Gideon\'s 300', 'Samson\'s Strength', 'Ruth\'s Love Story']
    },
    {
      id: 'united_kingdom',
      title: 'Kings & Glory',
      subtitle: 'Israel\'s Golden Age',
      period: '1100 - 930 BC',
      color: '#2196F3',
      icon: '👑',
      description: 'Israel gets its first king! Saul starts strong but fails, David slays Goliath and becomes the greatest king ever, and Solomon builds the magnificent Temple with incredible wisdom.',
      keyEvents: ['Saul Anointed', 'David vs Goliath', 'David\'s Reign', 'Solomon\'s Temple', 'Queen of Sheba']
    },
    {
      id: 'divided_kingdom',
      title: 'Split & Struggle',
      subtitle: 'Two Kingdoms Fight',
      period: '930 - 586 BC',
      color: '#FF5722',
      icon: '⚡',
      description: 'The kingdom splits into Israel (north) and Judah (south). Amazing prophets like Elijah call down fire from heaven, but the people keep turning away from God. It\'s a time of miracles and rebellion.',
      keyEvents: ['Kingdom Splits', 'Elijah vs Baal', 'Elisha\'s Miracles', 'Isaiah\'s Prophecies', 'Assyrian Invasion']
    },
    {
      id: 'exile',
      title: 'Babylon Captivity',
      subtitle: 'Punishment & Hope',
      period: '586 - 538 BC',
      color: '#795548',
      icon: '🏺',
      description: 'Jerusalem falls! The people are taken to Babylon as prisoners. But God is still with them - Daniel survives the lion\'s den, and his friends walk out of a fiery furnace unburned!',
      keyEvents: ['Jerusalem Falls', 'Daniel & Lions', 'Fiery Furnace', 'Ezekiel\'s Visions', 'Handwriting on Wall']
    },
    {
      id: 'return',
      title: 'Coming Home',
      subtitle: 'Rebuilding Jerusalem',
      period: '538 - 400 BC',
      color: '#607D8B',
      icon: '🏠',
      description: 'Freedom at last! The Jews return home and rebuild the Temple and walls of Jerusalem. Ezra teaches God\'s law again, and brave Queen Esther saves her people from destruction.',
      keyEvents: ['Cyrus\' Decree', 'Temple Rebuilt', 'Ezra\'s Reforms', 'Nehemiah\'s Wall', 'Esther Saves Jews']
    },
    {
      id: 'intertestamental',
      title: 'Silent Years',
      subtitle: 'Waiting for Messiah',
      period: '400 BC - 4 BC',
      color: '#9E9E9E',
      icon: '⏳',
      description: 'God seems quiet for 400 years, but He\'s preparing! Greeks and Romans rule, the Maccabees fight for freedom, and everyone waits for the promised Messiah to come.',
      keyEvents: ['Alexander\'s Empire', 'Maccabean Revolt', 'Roman Rule', 'Herod\'s Temple', 'Messianic Hope']
    },
    {
      id: 'jesus',
      title: 'The Messiah',
      subtitle: 'God Becomes Human',
      period: '4 BC - 30 AD',
      color: '#E91E63',
      icon: '✝️',
      description: 'Jesus is born! The Son of God walks on earth, performs incredible miracles, teaches with amazing stories, dies for our sins, and rises from the dead! The most important moment in history!',
      keyEvents: ['Jesus\' Birth', 'Baptism & Ministry', 'Miracles & Teaching', 'Crucifixion', 'Resurrection']
    },
    {
      id: 'early_church',
      title: 'Church Explosion',
      subtitle: 'Spreading the Good News',
      period: '30 - 70 AD',
      color: '#00BCD4',
      icon: '🔥',
      description: 'The Holy Spirit comes at Pentecost and the church explodes! Peter preaches, Stephen is martyred, Paul travels the world planting churches, and the Gospel spreads everywhere!',
      keyEvents: ['Pentecost', 'Stephen\'s Martyrdom', 'Paul\'s Conversion', 'Missionary Journeys', 'Jerusalem Council']
    },
    {
      id: 'apostolic',
      title: 'Letters & Vision',
      subtitle: 'Building the Church',
      period: '70 - 100 AD',
      color: '#673AB7',
      icon: '📝',
      description: 'The apostles write letters to encourage churches, John receives an incredible vision of the end times, and Christianity spreads throughout the Roman Empire despite persecution.',
      keyEvents: ['Paul\'s Letters', 'Gospel Writing', 'John\'s Revelation', 'Temple Destroyed', 'Church Growth']
    }
  ];

  // Major Bible Events with engaging descriptions
  const majorEvents = [
    // Creation Era
    {
      id: 'creation',
      title: 'God Creates Everything',
      era: 'primeval',
      date: '? BC',
      precision: 'uncertain',
      summary: 'In 6 days, God creates the entire universe, earth, animals, and humans!',
      verses: ['Genesis 1:1', 'Genesis 1:27'],
      people: ['God', 'Adam', 'Eve'],
      location: 'Garden of Eden',
      significance: 'The beginning of everything! God shows His incredible power and love.',
      funFact: 'Did you know God created light before the sun? That\'s some serious power!'
    },
    {
      id: 'fall',
      title: 'The Forbidden Fruit',
      era: 'primeval',
      date: '? BC',
      precision: 'uncertain',
      summary: 'Adam and Eve disobey God and eat the forbidden fruit, bringing sin into the world.',
      verses: ['Genesis 3:6', 'Genesis 3:15'],
      people: ['Adam', 'Eve', 'Serpent'],
      location: 'Garden of Eden',
      significance: 'This changes everything - but God promises a Savior will come!',
      funFact: 'The Bible never says it was an apple - it just says "fruit"!'
    },
    {
      id: 'cain_abel',
      title: 'First Murder',
      era: 'primeval',
      date: '? BC',
      precision: 'uncertain',
      summary: 'Cain kills his brother Abel out of jealousy over their offerings to God.',
      verses: ['Genesis 4:8', 'Genesis 4:10'],
      people: ['Cain', 'Abel', 'Adam', 'Eve'],
      location: 'Outside Eden',
      significance: 'Shows how quickly sin spreads, but also God\'s protection and mercy.',
      funFact: 'Abel\'s blood "cried out" from the ground - pretty intense!'
    },
    {
      id: 'noah_flood',
      title: 'The Great Flood',
      era: 'primeval',
      date: '? BC',
      precision: 'uncertain',
      summary: 'God floods the earth but saves Noah, his family, and two of every animal in a massive ark!',
      verses: ['Genesis 7:17', 'Genesis 8:20'],
      people: ['Noah', 'Noah\'s Family', 'Animals'],
      location: 'Worldwide',
      significance: 'God judges sin but provides salvation - a picture of Jesus saving us!',
      funFact: 'The ark was HUGE - about 1.5 football fields long!'
    },
    // Patriarchs Era
    {
      id: 'abraham_call',
      title: 'Abraham\'s Epic Journey',
      era: 'patriarchs',
      date: 'c. 2000 BC',
      precision: 'approximate',
      summary: 'God tells Abraham to leave everything and go to a new land, promising to make him father of many nations.',
      verses: ['Genesis 12:1', 'Genesis 12:7'],
      people: ['Abraham', 'Sarah', 'Lot'],
      location: 'Ur to Canaan',
      significance: 'The beginning of God\'s special relationship with His chosen people.',
      funFact: 'Abraham was 75 years old when he started this adventure!'
    },
    {
      id: 'isaac_birth',
      title: 'Miracle Baby Isaac',
      era: 'patriarchs',
      date: 'c. 1900 BC',
      precision: 'approximate',
      summary: 'God gives Abraham and Sarah a son when they\'re super old - Sarah was 90!',
      verses: ['Genesis 21:2', 'Genesis 21:6'],
      people: ['Abraham', 'Sarah', 'Isaac'],
      location: 'Canaan',
      significance: 'God keeps His promises, even when it seems impossible!',
      funFact: 'Sarah laughed when God said she\'d have a baby - that\'s why they named him Isaac (laughter)!'
    },
    {
      id: 'jacobs_ladder',
      title: 'Jacob\'s Dream Ladder',
      era: 'patriarchs',
      date: 'c. 1800 BC',
      precision: 'approximate',
      summary: 'Jacob dreams of a ladder to heaven with angels going up and down, and God promises to bless him.',
      verses: ['Genesis 28:12', 'Genesis 28:15'],
      people: ['Jacob', 'Angels', 'God'],
      location: 'Bethel',
      significance: 'God shows He\'s always with us, even when we mess up!',
      funFact: 'This is where the song "We are climbing Jacob\'s ladder" comes from!'
    },
    // Exodus Era
    {
      id: 'burning_bush',
      title: 'Moses & the Burning Bush',
      era: 'exodus',
      date: 'c. 1446 BC',
      precision: 'approximate',
      summary: 'God speaks to Moses from a bush that burns but doesn\'t burn up, calling him to free the Israelites.',
      verses: ['Exodus 3:2', 'Exodus 3:10'],
      people: ['Moses', 'God'],
      location: 'Mount Horeb',
      significance: 'God sees His people\'s suffering and acts to save them.',
      funFact: 'Moses had to take off his shoes because he was on holy ground!'
    },
    {
      id: 'ten_plagues',
      title: 'Epic Plagues vs Pharaoh',
      era: 'exodus',
      date: 'c. 1446 BC',
      precision: 'approximate',
      summary: 'God sends 10 incredible plagues to force Pharaoh to let the Israelites go free from slavery.',
      verses: ['Exodus 7:14', 'Exodus 12:29'],
      people: ['Moses', 'Aaron', 'Pharaoh'],
      location: 'Egypt',
      significance: 'God\'s power defeats the world\'s greatest empire!',
      funFact: 'The plagues included frogs everywhere, gnats, flies, boils, hail, locusts, and darkness!'
    },
    {
      id: 'red_sea',
      title: 'Red Sea Parts!',
      era: 'exodus',
      date: 'c. 1446 BC',
      precision: 'approximate',
      summary: 'Moses stretches out his hand and the Red Sea splits in two! 2 million Israelites walk through on dry ground.',
      verses: ['Exodus 14:21', 'Exodus 14:29'],
      people: ['Moses', 'Israelites', 'Pharaoh\'s Army'],
      location: 'Red Sea',
      significance: 'The most epic rescue in history! God saves His people in an impossible way.',
      funFact: 'The walls of water were probably hundreds of feet tall!'
    },
    {
      id: 'ten_commandments',
      title: 'The Ten Commandments',
      era: 'exodus',
      date: 'c. 1446 BC',
      precision: 'approximate',
      summary: 'God writes His laws on stone tablets with His own finger! Moses comes down the mountain glowing.',
      verses: ['Exodus 20:1-17', 'Exodus 34:28'],
      people: ['Moses', 'God', 'Israelites'],
      location: 'Mount Sinai',
      significance: 'God gives us the perfect rules for living and loving each other.',
      funFact: 'Moses\' face glowed so bright he had to wear a veil so people could look at him!'
    },
    {
      id: 'golden_calf',
      title: 'The Golden Calf Disaster',
      era: 'exodus',
      date: 'c. 1446 BC',
      precision: 'approximate',
      summary: 'While Moses is getting the commandments, the people make a golden calf to worship. Big mistake!',
      verses: ['Exodus 32:4', 'Exodus 32:19'],
      people: ['Aaron', 'Israelites', 'Moses'],
      location: 'Mount Sinai',
      significance: 'Shows how easily we can turn away from God, but also His forgiveness.',
      funFact: 'Moses was so angry he threw the stone tablets and broke them!'
    },
    // Conquest Era
    {
      id: 'jericho',
      title: 'Walls Come Tumbling Down',
      era: 'conquest',
      date: 'c. 1406 BC',
      precision: 'approximate',
      summary: 'The Israelites march around Jericho for 7 days, shout, and the walls collapse! First victory in the Promised Land.',
      verses: ['Joshua 6:20', 'Joshua 6:27'],
      people: ['Joshua', 'Israelites', 'Rahab'],
      location: 'Jericho',
      significance: 'God fights for His people in the most creative way ever!',
      funFact: 'They marched around the city 13 times total - imagine how tired they were!'
    },
    {
      id: 'sun_stands_still',
      title: 'The Day the Sun Stopped',
      era: 'conquest',
      date: 'c. 1400 BC',
      precision: 'approximate',
      summary: 'Joshua prays and God makes the sun stand still for a whole day so they can win the battle!',
      verses: ['Joshua 10:13', 'Joshua 10:14'],
      people: ['Joshua', 'Israelites'],
      location: 'Gibeon',
      significance: 'God controls even time itself to help His people!',
      funFact: 'This is the only time in history the sun stopped moving!'
    },
    {
      id: 'gideon_300',
      title: 'Gideon\'s Impossible Victory',
      era: 'conquest',
      date: 'c. 1200 BC',
      precision: 'approximate',
      summary: 'Gideon defeats a huge army with only 300 men using trumpets, torches, and jars! No swords needed.',
      verses: ['Judges 7:20', 'Judges 7:22'],
      people: ['Gideon', '300 Warriors'],
      location: 'Valley of Jezreel',
      significance: 'God shows He doesn\'t need big armies - just faithful people!',
      funFact: 'The enemy was so confused they started fighting each other!'
    },
    {
      id: 'samson_strength',
      title: 'Samson the Super Strong',
      era: 'conquest',
      date: 'c. 1100 BC',
      precision: 'approximate',
      summary: 'Samson has supernatural strength as long as he doesn\'t cut his hair! He fights lions and armies.',
      verses: ['Judges 14:6', 'Judges 16:30'],
      people: ['Samson', 'Delilah', 'Philistines'],
      location: 'Israel',
      significance: 'God gives us special gifts to serve Him, but we must stay faithful.',
      funFact: 'Samson killed 1,000 men with a donkey\'s jawbone!'
    },
    // United Kingdom Era
    {
      id: 'david_goliath',
      title: 'David vs Goliath',
      era: 'united_kingdom',
      date: 'c. 1025 BC',
      precision: 'approximate',
      summary: 'Teenage David defeats the giant Goliath with just a sling and stone, trusting in God\'s power!',
      verses: ['1 Samuel 17:49', '1 Samuel 17:50'],
      people: ['David', 'Goliath', 'Saul', 'Israelites'],
      location: 'Valley of Elah',
      significance: 'God uses the smallest person to do the biggest things!',
      funFact: 'Goliath was over 9 feet tall - that\'s taller than a basketball hoop!'
    },
    {
      id: 'solomon_temple',
      title: 'Solomon\'s Magnificent Temple',
      era: 'united_kingdom',
      date: 'c. 960 BC',
      precision: 'approximate',
      summary: 'Solomon builds the most beautiful temple ever! Gold everywhere, and God\'s presence fills it with glory.',
      verses: ['1 Kings 6:14', '1 Kings 8:11'],
      people: ['Solomon', 'Hiram', 'Workers'],
      location: 'Jerusalem',
      significance: 'God\'s house on earth - a place where heaven and earth meet!',
      funFact: 'It took 7 years to build and used 25 tons of gold!'
    },
    // Jesus Era Events
    {
      id: 'jesus_birth',
      title: 'Jesus is Born!',
      era: 'jesus',
      date: 'c. 4 BC',
      precision: 'approximate',
      summary: 'The Son of God is born as a baby in Bethlehem! Angels announce it to shepherds, and wise men follow a star.',
      verses: ['Luke 2:7', 'Matthew 2:2'],
      people: ['Jesus', 'Mary', 'Joseph', 'Shepherds', 'Wise Men'],
      location: 'Bethlehem',
      significance: 'God becomes human to save us! The most important birth ever.',
      funFact: 'Jesus was probably born in a cave, not a wooden stable!'
    },
    {
      id: 'jesus_baptism',
      title: 'Jesus\' Baptism & Ministry Begins',
      era: 'jesus',
      date: 'c. 27 AD',
      precision: 'approximate',
      summary: 'Jesus is baptized by John the Baptist, the Holy Spirit comes like a dove, and God says "This is my beloved Son!"',
      verses: ['Matthew 3:16-17', 'Mark 1:10-11'],
      people: ['Jesus', 'John the Baptist', 'Holy Spirit'],
      location: 'Jordan River',
      significance: 'Jesus\' public ministry begins - the most important 3 years ever!',
      funFact: 'The heavens literally opened up - what an amazing sight!'
    },
    {
      id: 'feeding_5000',
      title: 'Jesus Feeds 5,000 People',
      era: 'jesus',
      date: 'c. 29 AD',
      precision: 'approximate',
      summary: 'Jesus takes a boy\'s lunch of 5 loaves and 2 fish and feeds thousands of people with leftovers!',
      verses: ['Matthew 14:19-20', 'John 6:11-13'],
      people: ['Jesus', 'Disciples', '5,000 People', 'Boy with Lunch'],
      location: 'Sea of Galilee',
      significance: 'Jesus cares about our physical needs too, not just spiritual ones!',
      funFact: 'They collected 12 baskets of leftovers - more than they started with!'
    },
    {
      id: 'walking_on_water',
      title: 'Jesus Walks on Water',
      era: 'jesus',
      date: 'c. 29 AD',
      precision: 'approximate',
      summary: 'Jesus walks across the Sea of Galilee like it\'s solid ground! Peter tries it too but starts to sink.',
      verses: ['Matthew 14:25', 'Matthew 14:29'],
      people: ['Jesus', 'Peter', 'Disciples'],
      location: 'Sea of Galilee',
      significance: 'Jesus has power over nature itself - He\'s truly God!',
      funFact: 'Peter actually walked on water too, until he got scared!'
    },
    {
      id: 'transfiguration',
      title: 'Jesus Glows Like the Sun',
      era: 'jesus',
      date: 'c. 29 AD',
      precision: 'approximate',
      summary: 'Jesus\' appearance changes and He glows with heavenly light! Moses and Elijah appear to talk with Him.',
      verses: ['Matthew 17:2', 'Luke 9:29'],
      people: ['Jesus', 'Peter', 'James', 'John', 'Moses', 'Elijah'],
      location: 'Mount of Transfiguration',
      significance: 'A preview of Jesus\' heavenly glory - absolutely mind-blowing!',
      funFact: 'Peter wanted to build camping tents to stay there forever!'
    },
    {
      id: 'crucifixion',
      title: 'Jesus Dies for Our Sins',
      era: 'jesus',
      date: '30 AD',
      precision: 'precise',
      summary: 'Jesus is crucified on a cross, taking the punishment for all our sins. The earth shakes and the temple curtain tears!',
      verses: ['Matthew 27:50', 'Mark 15:38'],
      people: ['Jesus', 'Pilate', 'Centurion', 'Mary'],
      location: 'Golgotha (Calvary)',
      significance: 'Jesus pays the price for our sins so we can be forgiven and live with God forever.',
      funFact: 'The temple curtain that tore was 60 feet high and 4 inches thick!'
    },
    {
      id: 'resurrection',
      title: 'Jesus Rises from the Dead!',
      era: 'jesus',
      date: '30 AD',
      precision: 'precise',
      summary: 'After dying on the cross, Jesus comes back to life! Death is defeated and we can live forever with God.',
      verses: ['Matthew 28:6', 'Luke 24:6'],
      people: ['Jesus', 'Mary Magdalene', 'Disciples'],
      location: 'Jerusalem',
      significance: 'The most important moment in history! Jesus conquers death and sin.',
      funFact: 'The stone covering the tomb weighed about 4,000 pounds!'
    },
    // Early Church Era
    {
      id: 'pentecost',
      title: 'Holy Spirit Comes!',
      era: 'early_church',
      date: '30 AD',
      precision: 'precise',
      summary: 'The Holy Spirit comes like wind and fire! The disciples speak in different languages and 3,000 people believe in Jesus.',
      verses: ['Acts 2:4', 'Acts 2:41'],
      people: ['Peter', 'Disciples', '3,000 New Believers'],
      location: 'Jerusalem',
      significance: 'The church is born! God\'s power spreads to all nations.',
      funFact: 'They spoke in languages they never learned - instant translation!'
    },
    {
      id: 'paul_conversion',
      title: 'Paul\'s Amazing Conversion',
      era: 'early_church',
      date: 'c. 34 AD',
      precision: 'approximate',
      summary: 'Saul (later Paul) is persecuting Christians when Jesus appears to him in a blinding light and changes his life!',
      verses: ['Acts 9:4-5', 'Acts 9:18'],
      people: ['Paul (Saul)', 'Jesus', 'Ananias'],
      location: 'Road to Damascus',
      significance: 'God can change anyone\'s heart, even His biggest enemy!',
      funFact: 'Paul was blind for 3 days until Ananias prayed for him!'
    }
  ];

  // Filter options
  const filterOptions = [
    { id: 'prophets', label: 'Prophets', icon: 'campaign', color: '#9C27B0' },
    { id: 'kings', label: 'Kings', icon: 'crown', color: '#FF9800' },
    { id: 'miracles', label: 'Miracles', icon: 'auto-fix-high', color: '#4CAF50' },
    { id: 'covenants', label: 'Covenants', icon: 'handshake', color: '#2196F3' },
    { id: 'temples', label: 'Temples', icon: 'temple', color: '#795548' },
    { id: 'battles', label: 'Battles', icon: 'gavel', color: '#F44336' }
  ];

  const handleEraPress = (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);
    setSelectedEvent(null);
  };

  const handleEventPress = (event) => {
    hapticFeedback.light();
    setSelectedEvent(event);
  };

  const handleVersePress = (verse) => {
    hapticFeedback.light();
    if (onNavigateToVerse) {
      onNavigateToVerse(verse);
    }
  };

  const toggleFilter = (filterId) => {
    hapticFeedback.light();
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const renderTimelineRail = () => (
    <View style={styles.timelineRail}>
      {timelineEras.map((era, index) => (
        <TouchableOpacity
          key={era.id}
          style={[
            styles.eraNode,
            { backgroundColor: era.color },
            selectedEra?.id === era.id && styles.selectedEraNode
          ]}
          onPress={() => handleEraPress(era)}
          activeOpacity={0.7}
        >
          <Text style={styles.eraIcon}>{era.icon}</Text>
          <Text style={styles.eraYear}>{era.period}</Text>
        </TouchableOpacity>
      ))}
      <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
    </View>
  );

  const renderEraCard = (era) => (
    <View style={[styles.eraCard, { backgroundColor: theme.card }]}>
      <LinearGradient
        colors={[`${era.color}20`, `${era.color}10`, 'transparent']}
        style={styles.eraCardGradient}
      >
        <View style={styles.eraCardHeader}>
          <View style={[styles.eraIconContainer, { backgroundColor: `${era.color}20` }]}>
            <Text style={styles.eraCardIcon}>{era.icon}</Text>
          </View>
          <View style={styles.eraCardTitleContainer}>
            <Text style={[styles.eraCardTitle, { color: theme.text }]}>
              {era.title}
            </Text>
            <Text style={[styles.eraCardSubtitle, { color: era.color }]}>
              {era.subtitle}
            </Text>
            <Text style={[styles.eraCardPeriod, { color: theme.textSecondary }]}>
              {era.period}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.eraDescription, { color: theme.text }]}>
          {era.description}
        </Text>
        
        <View style={styles.keyEventsContainer}>
          <Text style={[styles.keyEventsTitle, { color: era.color }]}>
            🎯 Key Events
          </Text>
          <View style={styles.keyEventsGrid}>
            {era.keyEvents.map((event, index) => (
              <View key={index} style={[styles.keyEventChip, { backgroundColor: `${era.color}15`, borderColor: `${era.color}30` }]}>
                <Text style={[styles.keyEventText, { color: era.color }]}>
                  {event}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderEventDetail = (event) => (
    <View style={[styles.eventDetailCard, { backgroundColor: theme.card }]}>
      <LinearGradient
        colors={[`${timelineEras.find(e => e.id === event.era)?.color}15`, 'transparent']}
        style={styles.eventDetailGradient}
      >
        <View style={styles.eventDetailHeader}>
          <Text style={[styles.eventDetailTitle, { color: theme.text }]}>
            {event.title}
          </Text>
          <View style={[styles.eventDateBadge, { backgroundColor: `${timelineEras.find(e => e.id === event.era)?.color}20` }]}>
            <Text style={[styles.eventDateText, { color: timelineEras.find(e => e.id === event.era)?.color }]}>
              {event.date}
            </Text>
            {event.precision === 'uncertain' && (
              <MaterialIcons name="help" size={12} color={timelineEras.find(e => e.id === event.era)?.color} />
            )}
          </View>
        </View>
        
        <Text style={[styles.eventSummary, { color: theme.text }]}>
          {event.summary}
        </Text>
        
        <Text style={[styles.eventSignificance, { color: theme.textSecondary }]}>
          💡 {event.significance}
        </Text>
        
        <Text style={[styles.eventFunFact, { color: timelineEras.find(e => e.id === event.era)?.color }]}>
          🤯 {event.funFact}
        </Text>
        
        {/* Verses */}
        <View style={styles.eventVersesContainer}>
          <Text style={[styles.eventVersesTitle, { color: theme.text }]}>
            📖 Read More:
          </Text>
          <View style={styles.eventVersesGrid}>
            {event.verses.map((verse, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.verseChip, { backgroundColor: `${timelineEras.find(e => e.id === event.era)?.color}12` }]}
                onPress={() => handleVersePress(verse)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="book" size={14} color={timelineEras.find(e => e.id === event.era)?.color} />
                <Text style={[styles.verseChipText, { color: timelineEras.find(e => e.id === event.era)?.color }]}>
                  {verse}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* People */}
        <View style={styles.eventPeopleContainer}>
          <Text style={[styles.eventPeopleTitle, { color: theme.text }]}>
            👥 Key People:
          </Text>
          <View style={styles.eventPeopleGrid}>
            {event.people.map((person, index) => (
              <View key={index} style={[styles.personChip, { backgroundColor: `${timelineEras.find(e => e.id === event.era)?.color}10` }]}>
                <MaterialIcons name="person" size={14} color={timelineEras.find(e => e.id === event.era)?.color} />
                <Text style={[styles.personChipText, { color: timelineEras.find(e => e.id === event.era)?.color }]}>
                  {person}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Text style={[styles.filtersTitle, { color: theme.text }]}>
        🔍 Explore by Theme
      </Text>
      <View style={styles.filtersGrid}>
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: activeFilters.includes(filter.id) ? `${filter.color}20` : `${filter.color}10`,
                borderColor: activeFilters.includes(filter.id) ? filter.color : `${filter.color}30`
              }
            ]}
            onPress={() => toggleFilter(filter.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={filter.icon} 
              size={16} 
              color={activeFilters.includes(filter.id) ? filter.color : `${filter.color}80`} 
            />
            <Text style={[
              styles.filterText,
              { color: activeFilters.includes(filter.id) ? filter.color : `${filter.color}80` }
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Timeline</Text>
        <TouchableOpacity onPress={() => setShowMap(!showMap)} style={styles.mapButton}>
          <MaterialIcons name={showMap ? "timeline" : "map"} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        {renderFilters()}
        
        {/* Timeline Rail */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📅 Journey Through Time
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderTimelineRail()}
          </ScrollView>
        </View>

        {/* Era Details */}
        {selectedEra && (
          <View style={styles.eraDetailSection}>
            {renderEraCard(selectedEra)}
            
            {/* Events in this era */}
            <View style={styles.eventsInEraContainer}>
              <Text style={[styles.eventsInEraTitle, { color: theme.text }]}>
                🎬 Major Events in {selectedEra.title}
              </Text>
              {majorEvents
                .filter(event => event.era === selectedEra.id)
                .map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: theme.card }]}
                    onPress={() => handleEventPress(event)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[`${selectedEra.color}12`, 'transparent']}
                      style={styles.eventCardGradient}
                    >
                      <View style={styles.eventCardHeader}>
                        <Text style={[styles.eventCardTitle, { color: theme.text }]}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventCardDate, { color: selectedEra.color }]}>
                          {event.date}
                        </Text>
                      </View>
                      <Text style={[styles.eventCardSummary, { color: theme.textSecondary }]}>
                        {event.summary}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              }
            </View>
          </View>
        )}

        {/* Event Detail */}
        {selectedEvent && renderEventDetail(selectedEvent)}

        {/* Coming Soon */}
        <View style={styles.comingSoonContainer}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <MaterialIcons name="construction" size={32} color={theme.warning} />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              More Timeline Features Coming Soon!
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              Interactive maps, genealogy trees, prophecy connections, and much more are being built!
            </Text>
          </BlurView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  mapButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  
  // Filters
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Timeline Rail
  timelineSection: {
    paddingVertical: 20,
  },
  timelineRail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    height: 3,
    left: 20,
    right: 20,
    top: 35,
    borderRadius: 1.5,
  },
  eraNode: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  selectedEraNode: {
    transform: [{ scale: 1.1 }],
    elevation: 8,
    shadowOpacity: 0.3,
  },
  eraIcon: {
    fontSize: 24,
  },
  eraYear: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  
  // Era Cards
  eraDetailSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  eraCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  eraCardGradient: {
    padding: 20,
  },
  eraCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eraIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  eraCardIcon: {
    fontSize: 28,
  },
  eraCardTitleContainer: {
    flex: 1,
  },
  eraCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  eraCardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eraCardPeriod: {
    fontSize: 14,
    fontWeight: '500',
  },
  eraDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  keyEventsContainer: {
    marginTop: 8,
  },
  keyEventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  keyEventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyEventChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  keyEventText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Events in Era
  eventsInEraContainer: {
    marginTop: 20,
  },
  eventsInEraTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventCardGradient: {
    padding: 16,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  eventCardDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventCardSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Event Detail
  eventDetailCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  eventDetailGradient: {
    padding: 20,
  },
  eventDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  eventDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventSummary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  eventSignificance: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  eventFunFact: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  eventVersesContainer: {
    marginBottom: 16,
  },
  eventVersesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventVersesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  verseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  verseChipText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  eventPeopleContainer: {
    marginBottom: 8,
  },
  eventPeopleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventPeopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  personChipText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Coming Soon
  comingSoonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BibleTimeline;
