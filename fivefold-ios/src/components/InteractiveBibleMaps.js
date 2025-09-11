import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_APPLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const InteractiveBibleMaps = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showJourneyRoutes, setShowJourneyRoutes] = useState(false);
  const [activeEra, setActiveEra] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [bookmarkedLocations, setBookmarkedLocations] = useState([]);
  const [animatedRouteIndex, setAnimatedRouteIndex] = useState(0);
  const [isPlayingJourney, setIsPlayingJourney] = useState(false);
  const routeAnimation = useRef(new Animated.Value(0)).current;
  const journeyTimeouts = useRef([]);
  const isPlayingRef = useRef(false);

  // Function to stop journey and clear all timeouts
  const stopJourney = () => {
    setIsPlayingJourney(false);
    isPlayingRef.current = false;
    setShowJourneyRoutes(false); // Hide the route path when stopping
    // Clear all pending timeouts
    journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    journeyTimeouts.current = [];
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
      journeyTimeouts.current = [];
    };
  }, []);

  // Comprehensive Biblical Locations Data - From Abraham to Paul
  const biblicalLocations = [
    // ABRAHAM'S JOURNEY LOCATIONS
    {
      id: 'ur',
      name: 'Ur of the Chaldeans',
      coordinate: { latitude: 30.9625, longitude: 46.1030 },
      era: ['patriarchs'],
      type: 'city',
      icon: 'account-balance',
      description: 'Abraham\'s birthplace in Mesopotamia where God first called him to leave everything',
      significance: 'Starting point of faith journey, where God called Abraham to leave everything',
      characters: ['Abraham', 'Sarah', 'Terah'],
      verses: ['Genesis 11:31', 'Genesis 15:7', 'Nehemiah 9:7'],
      events: ['God\'s call to Abraham', 'Beginning of faith journey', 'Departure from homeland'],
      category: 'divine_encounter',
      journeyRole: 'abraham_start'
    },
    {
      id: 'haran',
      name: 'Haran',
      coordinate: { latitude: 36.8644, longitude: 39.0306 },
      era: ['patriarchs'],
      type: 'city',
      icon: 'star',
      description: 'Trading outpost where Abraham received God\'s promise of descendants as numerous as stars',
      significance: 'Where God renewed His covenant promise to Abraham',
      characters: ['Abraham', 'Sarah', 'Lot'],
      verses: ['Genesis 12:1-3', 'Genesis 11:32', 'Acts 7:2-4'],
      events: ['God\'s covenant promise', 'Death of Terah', 'Journey to Canaan begins'],
      category: 'covenant_moment',
      journeyRole: 'abraham_covenant'
    },
    {
      id: 'shechem',
      name: 'Shechem',
      coordinate: { latitude: 32.2140, longitude: 35.2777 },
      era: ['patriarchs', 'nt'],
      type: 'city',
      icon: 'park',
      description: 'First stop in Canaan where Abraham built altar under sacred oak, Jacob\'s well location',
      significance: 'First altar in Promised Land, Jacob\'s well, Joseph\'s burial place',
      characters: ['Abraham', 'Jacob', 'Joseph', 'Jesus', 'Samaritan Woman'],
      verses: ['Genesis 12:6-7', 'Genesis 33:18-20', 'Joshua 24:32', 'John 4:5-6'],
      events: ['Abraham\'s first altar', 'Jacob purchases land', 'Joseph\'s burial', 'Jesus meets Samaritan woman'],
      category: 'altar_worship',
      journeyRole: 'abraham_first_altar'
    },
    {
      id: 'bethel',
      name: 'Bethel (House of God)',
      coordinate: { latitude: 31.9308, longitude: 35.2203 },
      era: ['patriarchs'],
      type: 'city',
      icon: 'stairs',
      description: 'Where Jacob saw the ladder to heaven and Abraham built altars',
      significance: 'Jacob\'s ladder vision, multiple altars, house of God',
      characters: ['Abraham', 'Jacob'],
      verses: ['Genesis 28:10-22', 'Genesis 12:8', 'Genesis 35:1-7'],
      events: ['Jacob\'s ladder dream', 'Abraham\'s altar', 'Angels ascending/descending', 'Jacob\'s return'],
      category: 'divine_encounter',
      journeyRole: 'jacob_ladder'
    },
    {
      id: 'hebron',
      name: 'Hebron (Mamre)',
      coordinate: { latitude: 31.5326, longitude: 35.0998 },
      era: ['patriarchs', 'kingdom'],
      type: 'city',
      icon: 'home',
      description: 'Abraham\'s home under the oaks of Mamre, site of Cave of Machpelah',
      significance: 'Abraham\'s dwelling place, burial cave, David\'s first capital',
      characters: ['Abraham', 'Sarah', 'Isaac', 'Jacob', 'David'],
      verses: ['Genesis 18:1-15', 'Genesis 23:1-20', '2 Samuel 2:1-4'],
      events: ['Three visitors promise Isaac', 'Purchase of burial cave', 'Patriarchs\' burial', 'David anointed king'],
      category: 'covenant_moment',
      journeyRole: 'abraham_home'
    },
    {
      id: 'mount_moriah',
      name: 'Mount Moriah',
      coordinate: { latitude: 31.7780, longitude: 35.2354 },
      era: ['patriarchs', 'kingdom'],
      type: 'mountain',
      icon: 'local-fire-department',
      description: 'Where Abraham offered Isaac and God provided ram - future Temple site',
      significance: 'Ultimate test of faith, foreshadowing of Christ\'s sacrifice',
      characters: ['Abraham', 'Isaac', 'Solomon'],
      verses: ['Genesis 22:1-19', '2 Chronicles 3:1'],
      events: ['Binding of Isaac', 'God provides sacrifice', 'The Lord will provide', 'Temple built here'],
      category: 'prophecy_foreshadowing',
      journeyRole: 'abraham_test'
    },

    // JACOB'S JOURNEY LOCATIONS  
    {
      id: 'beersheba',
      name: 'Beersheba',
      coordinate: { latitude: 31.2518, longitude: 34.7915 },
      era: ['patriarchs', 'prophets'],
      type: 'city',
      icon: 'water-drop',
      description: 'Southern boundary where Jacob fled from Esau and Elijah despaired',
      significance: 'Well of the oath, southern limit of Israel, place of desperation and new beginnings',
      characters: ['Jacob', 'Elijah', 'Abraham', 'Isaac'],
      verses: ['Genesis 28:10', '1 Kings 19:3', 'Genesis 21:31'],
      events: ['Jacob\'s flight begins', 'Elijah\'s despair', 'Abraham\'s covenant', 'Isaac\'s wells'],
      category: 'journey_start',
      journeyRole: 'jacob_flight'
    },
    {
      id: 'peniel',
      name: 'Peniel (Face of God)',
      coordinate: { latitude: 32.1981, longitude: 35.6117 },
      era: ['patriarchs'],
      type: 'location',
      icon: 'sports-mma',
      description: 'Where Jacob wrestled with God all night and was renamed Israel',
      significance: 'Wrestling with God, name change, seeing God face to face',
      characters: ['Jacob/Israel'],
      verses: ['Genesis 32:22-32'],
      events: ['Wrestling with God', 'Name change to Israel', 'Blessing received', 'Limping away'],
      category: 'divine_encounter',
      journeyRole: 'jacob_wrestling'
    },

    // EXODUS JOURNEY LOCATIONS
    {
      id: 'rameses',
      name: 'Rameses',
      coordinate: { latitude: 30.8418, longitude: 31.8897 },
      era: ['exodus'],
      type: 'city',
      icon: 'construction',
      description: 'Store city where Israelites were enslaved and the Exodus began',
      significance: 'Bondage in Egypt, ten plagues, Passover night, liberation begins',
      characters: ['Moses', 'Aaron', 'Israelites', 'Pharaoh'],
      verses: ['Exodus 1:11', 'Exodus 12:37'],
      events: ['Israelite slavery', 'Ten plagues', 'Passover night', 'Exodus begins'],
      category: 'liberation',
      journeyRole: 'exodus_start'
    },
    {
      id: 'red_sea',
      name: 'Red Sea Crossing',
      coordinate: { latitude: 29.9668, longitude: 32.5498 },
      era: ['exodus'],
      type: 'water',
      icon: 'waves',
      description: 'Where God parted the waters for Israel to escape Pharaoh\'s army',
      significance: 'Greatest deliverance miracle, salvation through water',
      characters: ['Moses', 'Israelites', 'Pharaoh'],
      verses: ['Exodus 14:21-31'],
      events: ['Parting of Red Sea', 'Israelites cross dry ground', 'Egyptian army drowns', 'Song of Moses'],
      category: 'miracle',
      journeyRole: 'exodus_deliverance'
    },
    {
      id: 'mount_sinai',
      name: 'Mount Sinai (Horeb)',
      coordinate: { latitude: 28.5392, longitude: 33.9734 },
      era: ['exodus', 'prophets'],
      type: 'mountain',
      icon: 'terrain',
      description: 'Sacred mountain where Moses received Law and Elijah heard God\'s whisper',
      significance: 'Ten Commandments, covenant ceremony, Elijah\'s encounter',
      characters: ['Moses', 'Elijah', 'Aaron', 'Joshua'],
      verses: ['Exodus 19-20', '1 Kings 19:8-13'],
      events: ['Ten Commandments', 'Golden Calf', 'Tabernacle instructions', 'Elijah\'s still small voice'],
      category: 'divine_encounter',
      journeyRole: 'exodus_law'
    },
    {
      id: 'rephidim',
      name: 'Rephidim',
      coordinate: { latitude: 29.1167, longitude: 33.4833 },
      era: ['exodus'],
      type: 'location',
      icon: 'sports-martial-arts',
      description: 'Where Moses struck rock for water and held hands up for victory over Amalekites',
      significance: 'Water from rock, victory over Amalekites, power of intercession',
      characters: ['Moses', 'Joshua', 'Aaron', 'Hur'],
      verses: ['Exodus 17:1-16'],
      events: ['Water from rock', 'Battle with Amalekites', 'Moses\' raised hands', 'Victory through intercession'],
      category: 'battle_miracle',
      journeyRole: 'exodus_provision'
    },

    // JOSHUA'S CONQUEST LOCATIONS
    {
      id: 'jordan_crossing',
      name: 'Jordan River Crossing',
      coordinate: { latitude: 31.8500, longitude: 35.5597 },
      era: ['conquest', 'nt'],
      type: 'water',
      icon: 'waves',
      description: 'Where Joshua led Israel across on dry ground and Jesus was baptized',
      significance: 'Entry into Promised Land, miracle like Red Sea crossing, Jesus\' baptism',
      characters: ['Joshua', 'Priests with Ark', 'Jesus', 'John Baptist'],
      verses: ['Joshua 3:14-17', 'Matthew 3:13-17'],
      events: ['Jordan waters stop', 'Twelve memorial stones', 'Entry into Promised Land', 'Jesus\' baptism'],
      category: 'miracle',
      journeyRole: 'conquest_entry'
    },
    {
      id: 'jericho',
      name: 'Jericho',
      coordinate: { latitude: 31.8700, longitude: 35.4444 },
      era: ['conquest', 'nt'],
      type: 'city',
      icon: 'music-note',
      description: 'First city conquered with walls falling after seven days marching',
      significance: 'Walls fell flat, first conquest victory, Rahab saved, Jesus\' ministry',
      characters: ['Joshua', 'Rahab', 'Jesus', 'Zacchaeus', 'Bartimaeus'],
      verses: ['Joshua 6:1-27', 'Luke 19:1-10', 'Mark 10:46-52'],
      events: ['Walls fall flat', 'Seven days marching', 'Rahab saved', 'Jesus meets Zacchaeus', 'Blind man healed'],
      category: 'miracle_battle',
      journeyRole: 'conquest_first'
    },
    {
      id: 'gibeon',
      name: 'Gibeon',
      coordinate: { latitude: 31.8500, longitude: 35.1833 },
      era: ['conquest'],
      type: 'city',
      icon: 'wb-sunny',
      description: 'Where the sun stood still during Joshua\'s battle to defend Gibeonites',
      significance: 'Sun stands still, hailstones from heaven, longest day in history',
      characters: ['Joshua', 'Gibeonites'],
      verses: ['Joshua 10:6-15'],
      events: ['Sun stands still', 'Hailstones from heaven', 'Defeat of five kings', 'Longest day in history'],
      category: 'miracle_battle',
      journeyRole: 'conquest_miracle'
    },

    // DAVID'S JOURNEY LOCATIONS
    {
      id: 'adullam',
      name: 'Cave of Adullam',
      coordinate: { latitude: 31.6333, longitude: 34.9667 },
      era: ['kingdom'],
      type: 'cave',
      icon: 'landscape',
      description: 'Cave where David\'s mighty men gathered and his leadership began',
      significance: '400 men gather, David\'s leadership emerges, psalms written',
      characters: ['David', 'Mighty Men', 'David\'s family'],
      verses: ['1 Samuel 22:1-2', 'Psalm 57'],
      events: ['400 men gather', 'David\'s leadership emerges', 'Psalms written', 'Refuge from Saul'],
      category: 'refuge',
      journeyRole: 'david_leadership'
    },
    {
      id: 'en_gedi',
      name: 'En-gedi',
      coordinate: { latitude: 31.4619, longitude: 35.3897 },
      era: ['kingdom'],
      type: 'oasis',
      icon: 'water-drop',
      description: 'Desert oasis where David spared Saul\'s life in a cave',
      significance: 'David shows mercy, cuts Saul\'s robe, righteousness acknowledged',
      characters: ['David', 'Saul'],
      verses: ['1 Samuel 24:1-22'],
      events: ['David cuts Saul\'s robe', 'Mercy shown to enemy', 'Saul acknowledges David\'s righteousness'],
      category: 'mercy_forgiveness',
      journeyRole: 'david_mercy'
    },

    // ELIJAH'S JOURNEY LOCATIONS
    {
      id: 'cherith_brook',
      name: 'Brook Cherith',
      coordinate: { latitude: 32.0500, longitude: 35.6000 },
      era: ['prophets'],
      type: 'water',
      icon: 'pets',
      description: 'Hidden brook where ravens fed Elijah during the drought',
      significance: 'Ravens bring food, hidden during drought, miraculous provision',
      characters: ['Elijah'],
      verses: ['1 Kings 17:2-7'],
      events: ['Ravens bring food', 'Hidden during drought', 'Brook dries up', 'Divine provision'],
      category: 'miracle_provision',
      journeyRole: 'elijah_provision'
    },
    {
      id: 'zarephath',
      name: 'Zarephath',
      coordinate: { latitude: 33.2708, longitude: 35.2014 },
      era: ['prophets'],
      type: 'city',
      icon: 'restaurant',
      description: 'Phoenician town where Elijah stayed with widow and raised her son',
      significance: 'Flour and oil never run out, widow\'s son raised from dead',
      characters: ['Elijah', 'Widow of Zarephath'],
      verses: ['1 Kings 17:8-24'],
      events: ['Flour and oil never run out', 'Widow\'s son raised from dead', 'Grace to Gentiles'],
      category: 'miracle',
      journeyRole: 'elijah_gentiles'
    },
    {
      id: 'mount_carmel',
      name: 'Mount Carmel',
      coordinate: { latitude: 32.7322, longitude: 35.0478 },
      era: ['prophets'],
      type: 'mountain',
      icon: 'local-fire-department',
      description: 'Where Elijah defeated 450 prophets of Baal with fire from heaven',
      significance: 'Fire from heaven, altar consumed, rain returns, Baal defeated',
      characters: ['Elijah', 'Prophets of Baal', 'Ahab'],
      verses: ['1 Kings 18:16-46'],
      events: ['Fire from heaven', 'Altar consumed', 'Rain returns', 'Prophets of Baal killed'],
      category: 'miracle_battle',
      journeyRole: 'elijah_victory'
    },

    // JESUS' LIFE LOCATIONS
    {
      id: 'bethlehem',
      name: 'Bethlehem',
      coordinate: { latitude: 31.7054, longitude: 35.2024 },
      era: ['patriarchs', 'kingdom', 'nt'],
      type: 'city',
      icon: 'star',
      description: 'City of David and birthplace of Jesus Christ, fulfilling Micah\'s prophecy',
      significance: 'David\'s birthplace, Jesus\' birth, Micah\'s prophecy fulfilled',
      characters: ['David', 'Ruth', 'Jesus', 'Mary', 'Joseph', 'Shepherds', 'Magi'],
      verses: ['1 Samuel 16:1', 'Micah 5:2', 'Luke 2:4-7', 'Matthew 2:1-12'],
      events: ['David anointed king', 'Jesus\' birth', 'Angels to shepherds', 'Visit of Magi'],
      category: 'prophecy_fulfilled',
      journeyRole: 'jesus_birth'
    },
    {
      id: 'nazareth',
      name: 'Nazareth',
      coordinate: { latitude: 32.7009, longitude: 35.2035 },
      era: ['nt'],
      type: 'city',
      icon: 'home',
      description: 'Jesus\' hometown where He grew up and was rejected at the synagogue',
      significance: 'Annunciation, Jesus\' childhood, rejection at synagogue',
      characters: ['Jesus', 'Mary', 'Joseph'],
      verses: ['Luke 1:26-38', 'Luke 4:16-30'],
      events: ['Annunciation to Mary', 'Jesus\' childhood', 'Rejection at synagogue', 'Attempted murder'],
      category: 'ministry_base',
      journeyRole: 'jesus_home'
    },
    {
      id: 'capernaum',
      name: 'Capernaum',
      coordinate: { latitude: 32.8792, longitude: 35.5750 },
      era: ['nt'],
      type: 'city',
      icon: 'waves',
      description: 'Jesus\' ministry headquarters by the Sea of Galilee',
      significance: 'Ministry base, disciples called, many miracles performed',
      characters: ['Jesus', 'Peter', 'Andrew', 'James', 'John', 'Matthew'],
      verses: ['Matthew 4:13-17', 'Mark 1:21-34', 'Matthew 9:9'],
      events: ['Jesus makes it home', 'Disciples called', 'Many healings', 'Teaching in synagogue'],
      category: 'ministry_center',
      journeyRole: 'jesus_ministry'
    },
    {
      id: 'jerusalem',
      name: 'Jerusalem',
      coordinate: { latitude: 31.7683, longitude: 35.2137 },
      era: ['patriarchs', 'kingdom', 'nt', 'apostolic'],
      type: 'city',
      icon: 'location-city',
      description: 'The Holy City where Jesus was crucified, buried, and rose again',
      significance: 'Temple city, crucifixion, resurrection, Pentecost, church birth',
      characters: ['David', 'Solomon', 'Jesus', 'Disciples', 'Paul'],
      verses: ['2 Chronicles 6:6', 'Matthew 21:10', 'Luke 24:47', 'Acts 2:1-4'],
      events: ['Temple built', 'Triumphal Entry', 'Crucifixion', 'Resurrection', 'Pentecost'],
      category: 'passion_resurrection',
      journeyRole: 'jesus_passion'
    },
    {
      id: 'gethsemane',
      name: 'Garden of Gethsemane',
      coordinate: { latitude: 31.7794, longitude: 35.2397 },
      era: ['nt'],
      type: 'garden',
      icon: 'eco',
      description: 'Olive grove where Jesus prayed in agony before His arrest',
      significance: 'Agony in prayer, sweat like blood, surrender to Father\'s will',
      characters: ['Jesus', 'Peter', 'James', 'John'],
      verses: ['Matthew 26:36-46', 'Luke 22:39-46'],
      events: ['Agony in prayer', 'Sweat like blood', 'Not my will but yours', 'Arrest by soldiers'],
      category: 'passion',
      journeyRole: 'jesus_surrender'
    },
    {
      id: 'golgotha',
      name: 'Golgotha (Calvary)',
      coordinate: { latitude: 31.7781, longitude: 35.2298 },
      era: ['nt'],
      type: 'hill',
      icon: 'add',
      description: 'Place of the Skull where Jesus was crucified for the sins of the world',
      significance: 'Crucifixion, seven last words, darkness, temple veil torn',
      characters: ['Jesus', 'Two thieves', 'Mary', 'John', 'Centurion'],
      verses: ['Matthew 27:32-56', 'Luke 23:26-49', 'John 19:16-37'],
      events: ['Crucifixion', 'Seven last words', 'Darkness over land', 'Temple veil torn', 'Jesus dies'],
      category: 'passion',
      journeyRole: 'jesus_sacrifice'
    },
    {
      id: 'garden_tomb',
      name: 'Garden Tomb',
      coordinate: { latitude: 31.7786, longitude: 35.2303 },
      era: ['nt'],
      type: 'tomb',
      icon: 'brightness-7',
      description: 'New tomb where Jesus was buried and rose again on the third day',
      significance: 'Burial, stone rolled away, resurrection, empty tomb, He is risen!',
      characters: ['Jesus', 'Joseph of Arimathea', 'Mary Magdalene', 'Angels'],
      verses: ['Matthew 27:57-28:10', 'Luke 23:50-24:12', 'John 19:38-20:20'],
      events: ['Jesus buried', 'Stone rolled away', 'Resurrection', 'Empty tomb', 'He is risen!'],
      category: 'resurrection',
      journeyRole: 'jesus_victory'
    },

    // PAUL'S MISSIONARY JOURNEY LOCATIONS
    {
      id: 'damascus',
      name: 'Damascus',
      coordinate: { latitude: 33.5138, longitude: 36.2765 },
      era: ['nt', 'apostolic'],
      type: 'city',
      icon: 'flash-on',
      description: 'Where Paul was converted on the road and his ministry began',
      significance: 'Paul\'s conversion, blinded by light, scales fall, ministry begins',
      characters: ['Paul', 'Ananias', 'Jesus'],
      verses: ['Acts 9:1-19', 'Acts 22:6-16', 'Acts 26:12-18'],
      events: ['Paul\'s conversion', 'Blinded by light', 'Scales fall from eyes', 'Baptism and ministry begins'],
      category: 'conversion',
      journeyRole: 'paul_conversion'
    },
    {
      id: 'antioch_syria',
      name: 'Antioch (Syria)',
      coordinate: { latitude: 36.2021, longitude: 36.1604 },
      era: ['apostolic'],
      type: 'city',
      icon: 'church',
      description: 'Missionary sending church where believers were first called Christians',
      significance: 'First called Christians, missionary journeys begin, Gentile center',
      characters: ['Paul', 'Barnabas', 'Peter', 'Silas'],
      verses: ['Acts 11:19-26', 'Acts 13:1-3'],
      events: ['First called Christians', 'Missionary journeys begin', 'Gentile church center', 'Paul and Barnabas sent'],
      category: 'church_center',
      journeyRole: 'paul_base'
    },
    {
      id: 'philippi',
      name: 'Philippi',
      coordinate: { latitude: 41.0136, longitude: 24.2872 },
      era: ['apostolic'],
      type: 'city',
      icon: 'euro',
      description: 'First European city evangelized where Paul and Silas were imprisoned',
      significance: 'Gospel enters Europe, Lydia converted, earthquake opens prison',
      characters: ['Paul', 'Silas', 'Lydia', 'Philippian jailer'],
      verses: ['Acts 16:11-40'],
      events: ['Lydia\'s conversion', 'Earthquake opens prison', 'Jailer\'s conversion', 'Gospel in Europe'],
      category: 'second_journey',
      journeyRole: 'paul_europe'
    },
    {
      id: 'athens',
      name: 'Athens',
      coordinate: { latitude: 37.9755, longitude: 23.7348 },
      era: ['apostolic'],
      type: 'city',
      icon: 'account-balance',
      description: 'Where Paul preached about the "Unknown God" at the Areopagus',
      significance: 'Mars Hill sermon, Unknown God revealed, philosophical ministry',
      characters: ['Paul', 'Philosophers', 'Dionysius'],
      verses: ['Acts 17:16-34'],
      events: ['Mars Hill sermon', 'Unknown God revealed', 'Philosophical debate', 'Some believe'],
      category: 'intellectual_ministry',
      journeyRole: 'paul_philosophy'
    },
    {
      id: 'corinth',
      name: 'Corinth',
      coordinate: { latitude: 37.9061, longitude: 22.8781 },
      era: ['apostolic'],
      type: 'city',
      icon: 'business',
      description: 'Where Paul stayed 18 months and wrote letters to the Thessalonians',
      significance: '18 months ministry, tentmaking, vision from Jesus, letters written',
      characters: ['Paul', 'Aquila', 'Priscilla', 'Gallio'],
      verses: ['Acts 18:1-17', '1 Thessalonians', '2 Thessalonians'],
      events: ['18 months ministry', 'Tentmaking with Aquila', 'Vision from Jesus', 'Gallio\'s judgment'],
      category: 'extended_ministry',
      journeyRole: 'paul_letters'
    },
    {
      id: 'ephesus',
      name: 'Ephesus',
      coordinate: { latitude: 37.9495, longitude: 27.3639 },
      era: ['apostolic'],
      type: 'city',
      icon: 'account-balance',
      description: 'Where Paul ministered for over 2 years and confronted the silversmiths',
      significance: 'Longest ministry, unusual miracles, books burned, all Asia hears gospel',
      characters: ['Paul', 'Aquila', 'Priscilla', 'Demetrius', 'Seven sons of Sceva'],
      verses: ['Acts 19:1-41', '1 Corinthians', 'Ephesians'],
      events: ['2+ years ministry', 'Unusual miracles', 'Books burned', 'Artemis riot', 'All Asia hears gospel'],
      category: 'third_journey',
      journeyRole: 'paul_power'
    },
    {
      id: 'rome',
      name: 'Rome',
      coordinate: { latitude: 41.9028, longitude: 12.4964 },
      era: ['apostolic'],
      type: 'city',
      icon: 'account-balance',
      description: 'Capital of Roman Empire where Paul was imprisoned and wrote prison letters',
      significance: 'House arrest, preaching to all, prison letters, gospel reaches capital',
      characters: ['Paul', 'Luke', 'Roman Christians'],
      verses: ['Acts 28:11-31', 'Ephesians', 'Philippians', 'Colossians', 'Philemon'],
      events: ['House arrest ministry', 'Preaching to all who came', 'Prison letters written', 'Gospel reaches empire center'],
      category: 'imprisonment_ministry',
      journeyRole: 'paul_culmination'
    },

    // BABYLONIAN EXILE LOCATIONS
    {
      id: 'babylon',
      name: 'Babylon',
      coordinate: { latitude: 32.5355, longitude: 44.4275 },
      era: ['exile'],
      type: 'city',
      icon: 'account-balance',
      description: 'Ancient city where the Israelites were exiled and Daniel served',
      significance: 'Babylonian exile, Daniel\'s miracles, by the rivers of Babylon',
      characters: ['Daniel', 'Ezekiel', 'Nebuchadnezzar', 'Shadrach', 'Meshach', 'Abednego'],
      verses: ['2 Kings 25:1-21', 'Daniel 1-6', 'Ezekiel 1:1-3', 'Psalm 137:1'],
      events: ['Babylonian Exile begins', 'Daniel in lions\' den', 'Fiery furnace', 'Writing on wall', 'Ezekiel\'s visions'],
      category: 'exile_miracles',
      journeyRole: 'exile_main'
    }
  ];

  // Enhanced Biblical Journey Routes with Comprehensive Data
  const biblicalJourneys = [
    {
      id: 'abraham_journey',
      name: 'Abraham\'s Journey of Faith',
      description: 'From Ur to the Promised Land - the father of faith\'s epic journey spanning 1,200 miles',
      era: 'patriarchs',
      color: '#FFD700',
      coordinates: [
        { latitude: 30.9625, longitude: 46.1030 }, // Ur
        { latitude: 36.8644, longitude: 39.0306 }, // Haran
        { latitude: 32.2140, longitude: 35.2777 }, // Shechem
        { latitude: 31.9308, longitude: 35.2203 }, // Bethel
        { latitude: 31.5326, longitude: 35.0998 }, // Hebron
        { latitude: 31.7780, longitude: 35.2354 }, // Mount Moriah
      ],
      waypoints: [
        { 
          name: 'Ur of Chaldeans', 
          description: 'God\'s call begins - "Leave your country, your people and your father\'s household"', 
          verse: 'Genesis 12:1',
          significance: 'Starting point of faith journey',
          modernLocation: 'Southern Iraq'
        },
        { 
          name: 'Haran', 
          description: 'Promise of descendants as numerous as stars - covenant established', 
          verse: 'Genesis 12:2-3',
          significance: 'God\'s covenant promise renewed',
          modernLocation: 'Southeast Turkey'
        },
        { 
          name: 'Shechem', 
          description: 'First altar in Promised Land under the great tree of Moreh', 
          verse: 'Genesis 12:6-7',
          significance: 'First worship in the land of promise',
          modernLocation: 'Nablus, West Bank'
        },
        { 
          name: 'Bethel', 
          description: 'Altar between Bethel and Ai - "House of God"', 
          verse: 'Genesis 12:8',
          significance: 'Place of worship and divine encounter',
          modernLocation: 'Beitin, West Bank'
        },
        { 
          name: 'Hebron', 
          description: 'Home under the oaks of Mamre - Cave of Machpelah purchased', 
          verse: 'Genesis 13:18',
          significance: 'Abraham\'s dwelling place and burial site',
          modernLocation: 'Al-Khalil, West Bank'
        },
        { 
          name: 'Mount Moriah', 
          description: 'Ultimate test - "Take your son, your only son Isaac, whom you love"', 
          verse: 'Genesis 22:2',
          significance: 'Supreme test of faith, foreshadowing of Christ\'s sacrifice',
          modernLocation: 'Temple Mount, Jerusalem'
        },
      ],
      totalDistance: '1,200 miles',
      duration: 'Lifetime journey (c. 2100-1900 BC)',
      significance: 'Foundation of faith, covenant promises, foreshadowing of Christ',
      keyThemes: ['Faith', 'Obedience', 'Covenant', 'Promise', 'Sacrifice'],
      miracleCount: 3,
      propheticElements: ['Seed promise', 'Land promise', 'Blessing promise', 'Isaac sacrifice foreshadowing']
    },
    {
      id: 'jacob_journey',
      name: 'Jacob\'s Journey of Transformation',
      description: 'From fleeing brother to wrestling with God - becoming Israel',
      era: 'patriarchs',
      color: '#8B4513',
      coordinates: [
        { latitude: 31.2518, longitude: 34.7915 }, // Beersheba
        { latitude: 31.9308, longitude: 35.2203 }, // Bethel
        { latitude: 36.8644, longitude: 39.0306 }, // Haran
        { latitude: 32.1981, longitude: 35.6117 }, // Peniel
        { latitude: 32.2140, longitude: 35.2777 }, // Shechem
      ],
      waypoints: [
        { 
          name: 'Beersheba', 
          description: 'Flight begins - fleeing Esau\'s wrath after stealing blessing', 
          verse: 'Genesis 28:10',
          significance: 'Journey of transformation begins',
          modernLocation: 'Be\'er Sheva, Israel'
        },
        { 
          name: 'Bethel', 
          description: 'Ladder to heaven - "Surely the LORD is in this place"', 
          verse: 'Genesis 28:16',
          significance: 'Divine encounter, God\'s presence confirmed',
          modernLocation: 'Beitin, West Bank'
        },
        { 
          name: 'Haran', 
          description: '20 years of service - marriages, children, prosperity', 
          verse: 'Genesis 29:20',
          significance: 'Character development through trials',
          modernLocation: 'Southeast Turkey'
        },
        { 
          name: 'Peniel', 
          description: 'Wrestling with God - "I have seen God face to face"', 
          verse: 'Genesis 32:30',
          significance: 'Name changed to Israel, transformation complete',
          modernLocation: 'Jordan Valley'
        },
        { 
          name: 'Shechem', 
          description: 'Return to the land - altar to El-Elohe-Israel', 
          verse: 'Genesis 33:20',
          significance: 'Homecoming and worship',
          modernLocation: 'Nablus, West Bank'
        },
      ],
      totalDistance: '800 miles',
      duration: '20+ years',
      significance: 'Transformation from deceiver to Israel, wrestling with God',
      keyThemes: ['Transformation', 'Wrestling', 'Perseverance', 'Divine Encounter', 'Identity'],
      miracleCount: 2,
      propheticElements: ['Israel nation foreshadowed', 'Twelve tribes through sons']
    },
    {
      id: 'exodus_journey',
      name: 'The Great Exodus',
      description: 'Israel\'s miraculous liberation from 430 years of Egyptian bondage to the Promised Land',
      era: 'exodus',
      color: '#FF6B6B',
      coordinates: [
        { latitude: 30.8418, longitude: 31.8897 }, // Rameses
        { latitude: 30.0000, longitude: 32.0000 }, // Succoth
        { latitude: 29.9668, longitude: 32.5498 }, // Red Sea
        { latitude: 29.8667, longitude: 33.1000 }, // Marah
        { latitude: 29.7833, longitude: 33.2167 }, // Elim
        { latitude: 29.1167, longitude: 33.4833 }, // Rephidim
        { latitude: 28.5392, longitude: 33.9734 }, // Mount Sinai
        { latitude: 30.7000, longitude: 34.8000 }, // Kadesh Barnea
        { latitude: 31.7690, longitude: 35.7236 }, // Mount Nebo
      ],
      waypoints: [
        { 
          name: 'Rameses', 
          description: 'Exodus begins - 600,000 men plus families depart after Passover night', 
          verse: 'Exodus 12:37',
          significance: 'Liberation from 430 years of bondage begins',
          modernLocation: 'Nile Delta, Egypt',
          miracle: 'Ten plagues, Passover protection'
        },
        { 
          name: 'Succoth', 
          description: 'First stop - pillar of cloud by day, fire by night appears', 
          verse: 'Exodus 13:20-22',
          significance: 'Divine guidance begins',
          modernLocation: 'Eastern Egypt',
          miracle: 'Pillar of cloud and fire'
        },
        { 
          name: 'Red Sea', 
          description: 'Waters part - "The LORD will fight for you; you need only to be still"', 
          verse: 'Exodus 14:14',
          significance: 'Greatest deliverance miracle in history',
          modernLocation: 'Gulf of Suez or Gulf of Aqaba',
          miracle: 'Sea parts, Israelites cross on dry ground, Egyptian army drowns'
        },
        { 
          name: 'Marah', 
          description: 'Bitter waters made sweet - "I am the LORD, who heals you"', 
          verse: 'Exodus 15:26',
          significance: 'God\'s provision and healing revealed',
          modernLocation: 'Sinai Peninsula',
          miracle: 'Bitter water made sweet'
        },
        { 
          name: 'Elim', 
          description: '12 springs and 70 palm trees - oasis of rest and refreshment', 
          verse: 'Exodus 15:27',
          significance: 'God\'s abundant provision after testing',
          modernLocation: 'Sinai Peninsula',
          miracle: 'Perfect oasis provided'
        },
        { 
          name: 'Rephidim', 
          description: 'Water from rock, victory over Amalekites through Moses\' raised hands', 
          verse: 'Exodus 17:11',
          significance: 'Intercession and divine provision',
          modernLocation: 'Sinai Peninsula',
          miracle: 'Water from rock, victory through intercession'
        },
        { 
          name: 'Mount Sinai', 
          description: 'Ten Commandments given - "I am the LORD your God who brought you out of Egypt"', 
          verse: 'Exodus 20:2',
          significance: 'Law given, covenant established with Israel',
          modernLocation: 'Jebel Musa, Sinai Peninsula',
          miracle: 'God speaks from mountain in fire and smoke'
        },
        { 
          name: 'Kadesh Barnea', 
          description: 'Spies sent, unbelief leads to 40 years wandering', 
          verse: 'Numbers 13:26',
          significance: 'Consequences of unbelief',
          modernLocation: 'Negev Desert',
          miracle: 'Sustained in wilderness for 40 years'
        },
        { 
          name: 'Mount Nebo', 
          description: 'Moses views Promised Land - "This is the land I promised on oath"', 
          verse: 'Deuteronomy 34:4',
          significance: 'End of wilderness journey, Moses\' death',
          modernLocation: 'Jordan',
          miracle: 'Moses\' strength preserved to age 120'
        },
      ],
      totalDistance: '400+ miles',
      duration: '40 years (1446-1406 BC)',
      significance: 'Liberation, Law given, covenant established, wilderness wandering, nation formed',
      keyThemes: ['Liberation', 'Divine Provision', 'Law', 'Covenant', 'Testing', 'Faithfulness'],
      miracleCount: 15,
      propheticElements: ['Passover lamb foreshadows Christ', 'Manna from heaven', 'Water from rock', 'Bronze serpent']
    },
    {
      id: 'ruth_naomi_journey',
      name: 'Ruth & Naomi\'s Journey of Love',
      description: 'A heartwarming 50-mile trek of loyalty and redemption from Moab to Bethlehem',
      era: 'kingdom',
      color: '#FF69B4',
      coordinates: [
        { latitude: 31.5000, longitude: 35.7000 }, // Moab
        { latitude: 31.7054, longitude: 35.2024 }, // Bethlehem
      ],
      waypoints: [
        { 
          name: 'Moab', 
          description: 'Tragedy and decision - "Where you go I will go, your God my God"', 
          verse: 'Ruth 1:16',
          significance: 'Ultimate loyalty and love demonstrated',
          modernLocation: 'Jordan',
          miracle: 'Ruth\'s devotion transforms two lives'
        },
        { 
          name: 'Bethlehem', 
          description: 'Harvest time arrival - from emptiness to fullness through God\'s providence', 
          verse: 'Ruth 1:22',
          significance: 'Redemption, restoration, and royal lineage',
          modernLocation: 'West Bank',
          miracle: 'Boaz redeems Ruth, lineage to David and Christ'
        },
      ],
      totalDistance: '50 miles',
      duration: '1 week journey',
      significance: 'Love, loyalty, redemption, Messianic lineage through Gentile woman',
      keyThemes: ['Loyalty', 'Love', 'Redemption', 'Providence', 'Inclusion'],
      miracleCount: 1,
      propheticElements: ['Gentile inclusion', 'Kinsman redeemer', 'Messianic lineage']
    },
    {
      id: 'david_flight_journey',
      name: 'David\'s Flight from Saul',
      description: 'From shepherd to fugitive to king - God\'s protection through wilderness years',
      era: 'kingdom',
      color: '#8B4513',
      coordinates: [
        { latitude: 31.8333, longitude: 35.2167 }, // Gibeah
        { latitude: 31.8000, longitude: 35.2333 }, // Nob
        { latitude: 31.6333, longitude: 34.9667 }, // Adullam
        { latitude: 31.4619, longitude: 35.3897 }, // En-gedi
        { latitude: 31.2500, longitude: 35.0000 }, // Wilderness of Ziph
        { latitude: 31.5326, longitude: 35.0998 }, // Hebron
      ],
      waypoints: [
        { 
          name: 'Gibeah', 
          description: 'Flight begins - Saul\'s jealousy after David\'s victories', 
          verse: '1 Samuel 19:10',
          significance: 'Journey from court to cave begins',
          modernLocation: 'Tell el-Ful, West Bank',
          miracle: 'Jonathan\'s friendship and protection'
        },
        { 
          name: 'Nob', 
          description: 'Holy bread and Goliath\'s sword - priestly provision', 
          verse: '1 Samuel 21:6',
          significance: 'God provides through His servants',
          modernLocation: 'Near Jerusalem',
          miracle: 'Divine provision in desperate need'
        },
        { 
          name: 'Cave of Adullam', 
          description: '400 distressed men gather - leadership emerges from hiding', 
          verse: '1 Samuel 22:2',
          significance: 'Mighty men formed, psalms written',
          modernLocation: 'Judean hills',
          miracle: 'God builds army from outcasts'
        },
        { 
          name: 'En-gedi', 
          description: 'David spares Saul\'s life - "I will not lift my hand against my lord"', 
          verse: '1 Samuel 24:10',
          significance: 'Mercy triumphs over revenge',
          modernLocation: 'Dead Sea oasis',
          miracle: 'Heart of mercy in moment of opportunity'
        },
        { 
          name: 'Wilderness of Ziph', 
          description: 'Final meeting with Jonathan - "You will be king over Israel"', 
          verse: '1 Samuel 23:17',
          significance: 'Friendship and faith in God\'s promises',
          modernLocation: 'Judean wilderness',
          miracle: 'Friendship transcends family loyalty'
        },
        { 
          name: 'Hebron', 
          description: 'Anointed king of Judah - from fugitive to ruler', 
          verse: '2 Samuel 2:4',
          significance: 'God\'s promises fulfilled',
          modernLocation: 'Al-Khalil, West Bank',
          miracle: 'Shepherd becomes king as promised'
        },
      ],
      totalDistance: '200+ miles of wandering',
      duration: '7+ years on the run',
      significance: 'God\'s protection, character formation, preparation for kingship',
      keyThemes: ['Protection', 'Character', 'Mercy', 'Friendship', 'Divine Timing'],
      miracleCount: 6,
      propheticElements: ['Shepherd-king foreshadows Christ', 'Suffering before glory', 'Anointed but not yet crowned']
    },
    {
      id: 'elijah_journey',
      name: 'Elijah\'s Prophetic Journeys',
      description: 'Fire from heaven to still small voice - a prophet\'s dramatic encounters with God',
      era: 'prophets',
      color: '#FF4500',
      coordinates: [
        { latitude: 32.0500, longitude: 35.6000 }, // Brook Cherith
        { latitude: 33.2708, longitude: 35.2014 }, // Zarephath
        { latitude: 32.7322, longitude: 35.0478 }, // Mount Carmel
        { latitude: 32.5556, longitude: 35.3306 }, // Jezreel
        { latitude: 31.2518, longitude: 34.7915 }, // Beersheba
        { latitude: 28.5392, longitude: 33.9734 }, // Mount Horeb/Sinai
      ],
      waypoints: [
        { 
          name: 'Brook Cherith', 
          description: 'Ravens bring food - hidden during drought by God\'s command', 
          verse: '1 Kings 17:4',
          significance: 'God\'s miraculous provision in hiding',
          modernLocation: 'Jordan Valley',
          miracle: 'Ravens feed prophet daily'
        },
        { 
          name: 'Zarephath', 
          description: 'Widow\'s flour and oil never run out, son raised from dead', 
          verse: '1 Kings 17:16',
          significance: 'Grace to Gentiles, power over death',
          modernLocation: 'Lebanon coast',
          miracle: 'Endless provision, resurrection from dead'
        },
        { 
          name: 'Mount Carmel', 
          description: 'Fire from heaven consumes sacrifice - "The LORD, He is God!"', 
          verse: '1 Kings 18:39',
          significance: 'Greatest public miracle, Baal defeated',
          modernLocation: 'Northern Israel',
          miracle: 'Fire from heaven, rain after 3.5 years drought'
        },
        { 
          name: 'Jezreel', 
          description: 'Outrun Ahab\'s chariot in supernatural strength', 
          verse: '1 Kings 18:46',
          significance: 'Divine empowerment for service',
          modernLocation: 'Jezreel Valley',
          miracle: 'Supernatural speed and endurance'
        },
        { 
          name: 'Beersheba', 
          description: 'Despair under broom tree - "I have had enough, LORD"', 
          verse: '1 Kings 19:4',
          significance: 'Human frailty after spiritual victory',
          modernLocation: 'Southern Israel',
          miracle: 'Angel provides supernatural food for 40-day journey'
        },
        { 
          name: 'Mount Horeb', 
          description: 'Still small voice - "What are you doing here, Elijah?"', 
          verse: '1 Kings 19:12',
          significance: 'God speaks in whisper, not wind/earthquake/fire',
          modernLocation: 'Sinai Peninsula',
          miracle: 'God\'s gentle voice after dramatic displays'
        },
      ],
      totalDistance: '500+ miles',
      duration: 'Prophetic ministry years',
      significance: 'Power of prayer, God\'s provision, victory over false gods, divine encounters',
      keyThemes: ['Divine Power', 'Provision', 'Victory', 'Despair', 'Gentle Voice', 'Commissioning'],
      miracleCount: 8,
      propheticElements: ['Drought and rain', 'Fire from heaven', 'Resurrection', 'Translation to heaven']
    },
    {
      id: 'jesus_ministry',
      name: 'Jesus\' Ministry Journey',
      description: 'From Bethlehem\'s manger to Jerusalem\'s cross - the Messiah\'s earthly ministry and ultimate sacrifice',
      era: 'nt',
      color: '#4ECDC4',
      coordinates: [
        { latitude: 31.7054, longitude: 35.2024 }, // Bethlehem
        { latitude: 32.7009, longitude: 35.2035 }, // Nazareth
        { latitude: 31.8361, longitude: 35.5531 }, // Jordan River (Baptism)
        { latitude: 32.8792, longitude: 35.5750 }, // Capernaum
        { latitude: 32.7500, longitude: 35.3397 }, // Cana
        { latitude: 32.2140, longitude: 35.2777 }, // Sychar (Samaritan Woman)
        { latitude: 33.2486, longitude: 35.6944 }, // Caesarea Philippi
        { latitude: 31.8700, longitude: 35.4444 }, // Jericho
        { latitude: 31.7717, longitude: 35.2594 }, // Bethany
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem
        { latitude: 31.7794, longitude: 35.2397 }, // Gethsemane
        { latitude: 31.7781, longitude: 35.2298 }, // Golgotha
        { latitude: 31.7786, longitude: 35.2303 }, // Garden Tomb
      ],
      waypoints: [
        { 
          name: 'Bethlehem', 
          description: 'Birth of Messiah - "For unto you is born this day a Savior"', 
          verse: 'Luke 2:11',
          significance: 'Incarnation, God becomes man, prophecy fulfilled',
          modernLocation: 'West Bank',
          miracle: 'Virgin birth, angels announce to shepherds'
        },
        { 
          name: 'Nazareth', 
          description: 'Hometown and childhood - "Can anything good come from Nazareth?"', 
          verse: 'John 1:46',
          significance: 'Hidden years, growth in wisdom and stature',
          modernLocation: 'Northern Israel',
          miracle: 'Sinless life, perfect obedience'
        },
        { 
          name: 'Jordan River', 
          description: 'Baptism - "This is my beloved Son, in whom I am well pleased"', 
          verse: 'Matthew 3:17',
          significance: 'Ministry begins, Trinity revealed, Spirit descends',
          modernLocation: 'Jordan Valley',
          miracle: 'Heaven opens, Spirit descends as dove, Father\'s voice'
        },
        { 
          name: 'Capernaum', 
          description: 'Ministry headquarters - "His own city" by Sea of Galilee', 
          verse: 'Matthew 9:1',
          significance: 'Base of operations, many miracles and teachings',
          modernLocation: 'Sea of Galilee',
          miracle: 'Countless healings, teachings, disciples called'
        },
        { 
          name: 'Cana', 
          description: 'First miracle - water turned to wine at wedding feast', 
          verse: 'John 2:11',
          significance: 'First sign, glory revealed, disciples believe',
          modernLocation: 'Galilee',
          miracle: 'Water becomes wine, better than the first'
        },
        { 
          name: 'Sychar', 
          description: 'Samaritan woman - "I who speak to you am he" (the Messiah)', 
          verse: 'John 4:26',
          significance: 'Gospel to Samaritans, living water offered',
          modernLocation: 'West Bank',
          miracle: 'Knows woman\'s life history, many Samaritans believe'
        },
        { 
          name: 'Caesarea Philippi', 
          description: 'Peter\'s confession - "You are the Christ, the Son of the living God"', 
          verse: 'Matthew 16:16',
          significance: 'Identity revealed, church foundation, keys of kingdom',
          modernLocation: 'Northern Israel',
          miracle: 'Divine revelation to Peter, transfiguration follows'
        },
        { 
          name: 'Jericho', 
          description: 'Zacchaeus and blind Bartimaeus - "Son of David, have mercy!"', 
          verse: 'Mark 10:47',
          significance: 'Salvation comes to tax collector, sight to blind',
          modernLocation: 'West Bank',
          miracle: 'Blind man sees, heart of tax collector transformed'
        },
        { 
          name: 'Bethany', 
          description: 'Lazarus raised - "I am the resurrection and the life"', 
          verse: 'John 11:25',
          significance: 'Power over death demonstrated, final sign',
          modernLocation: 'West Bank',
          miracle: 'Four-day-dead Lazarus raised to life'
        },
        { 
          name: 'Jerusalem', 
          description: 'Triumphal Entry - "Blessed is he who comes in the name of the Lord!"', 
          verse: 'Matthew 21:9',
          significance: 'Messianic claim, Passion Week begins',
          modernLocation: 'Jerusalem',
          miracle: 'Prophecy fulfilled, crowds worship, temple cleansed'
        },
        { 
          name: 'Gethsemane', 
          description: 'Agony in prayer - "Not my will, but yours be done"', 
          verse: 'Luke 22:42',
          significance: 'Ultimate surrender, sweat like blood, arrest',
          modernLocation: 'Mount of Olives',
          miracle: 'Angel strengthens, perfect submission to Father\'s will'
        },
        { 
          name: 'Golgotha', 
          description: 'Crucifixion - "It is finished!" Darkness covers land', 
          verse: 'John 19:30',
          significance: 'Atonement accomplished, sin paid for, salvation provided',
          modernLocation: 'Jerusalem',
          miracle: 'Darkness at noon, temple veil torn, earth shakes, dead raised'
        },
        { 
          name: 'Garden Tomb', 
          description: 'Resurrection - "He is not here; he has risen, just as he said!"', 
          verse: 'Matthew 28:6',
          significance: 'Death defeated, resurrection power, victory complete',
          modernLocation: 'Jerusalem',
          miracle: 'Resurrection from dead, stone rolled away, grave clothes left behind'
        },
      ],
      totalDistance: '300+ miles of ministry',
      duration: '33 years life, 3.5 years ministry',
      significance: 'Incarnation, perfect life, atoning death, victorious resurrection, salvation accomplished',
      keyThemes: ['Incarnation', 'Ministry', 'Miracles', 'Teaching', 'Sacrifice', 'Resurrection', 'Salvation'],
      miracleCount: 35,
      propheticElements: ['Virgin birth', 'Bethlehem birth', 'Nazareth upbringing', 'Triumphal entry', 'Crucifixion', 'Resurrection']
    },
    {
      id: 'babylonian_exile',
      name: 'Babylonian Exile Journey',
      description: 'By the rivers of Babylon - 70 years of captivity and God\'s faithfulness in foreign land',
      era: 'exile',
      color: '#8B4513',
      coordinates: [
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem (destruction)
        { latitude: 34.8021, longitude: 38.9968 }, // Riblah (Zedekiah blinded)
        { latitude: 32.5355, longitude: 44.4275 }, // Babylon
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem (return)
      ],
      waypoints: [
        { 
          name: 'Jerusalem Destroyed', 
          description: 'Temple burned, walls broken, people exiled - "How deserted lies the city"', 
          verse: 'Lamentations 1:1',
          significance: 'Judgment for disobedience, end of kingdom',
          modernLocation: 'Jerusalem',
          miracle: 'Jeremiah\'s prophecies fulfilled exactly'
        },
        { 
          name: 'Riblah', 
          description: 'Zedekiah\'s sons killed before his eyes, then he is blinded', 
          verse: '2 Kings 25:7',
          significance: 'Consequences of rebellion against God',
          modernLocation: 'Syria',
          miracle: 'Ezekiel\'s prophecy fulfilled - sees but doesn\'t see Babylon'
        },
        { 
          name: 'Babylon', 
          description: 'By rivers of Babylon - "How can we sing the LORD\'s song in a foreign land?"', 
          verse: 'Psalm 137:4',
          significance: '70 years exile, Daniel\'s ministry, God\'s presence in foreign land',
          modernLocation: 'Iraq',
          miracle: 'Daniel in lions\' den, fiery furnace, dreams interpreted'
        },
        { 
          name: 'Jerusalem Restored', 
          description: 'Return after 70 years - "When the LORD brought back the captives"', 
          verse: 'Psalm 126:1',
          significance: 'God\'s faithfulness, temple rebuilt, promises kept',
          modernLocation: 'Jerusalem',
          miracle: 'Cyrus decree exactly as prophesied, temple rebuilt'
        },
      ],
      totalDistance: '600 miles each way',
      duration: '70 years (586-516 BC)',
      significance: 'Judgment, exile, God\'s faithfulness, return, temple rebuilt',
      keyThemes: ['Judgment', 'Exile', 'Faithfulness', 'Prophecy', 'Return', 'Restoration'],
      miracleCount: 8,
      propheticElements: ['70 years prophesied', 'Cyrus named 150 years early', 'Temple destruction and rebuilding']
    },
    {
      id: 'paul_first_journey',
      name: 'Paul\'s First Missionary Journey',
      description: 'Taking the Gospel to the Gentiles - Cyprus and Asia Minor, 1,400 miles of pioneering evangelism',
      era: 'apostolic',
      color: '#9B59B6',
      coordinates: [
        { latitude: 36.2021, longitude: 36.1604 }, // Antioch Syria
        { latitude: 35.1264, longitude: 33.4299 }, // Seleucia (port)
        { latitude: 35.1856, longitude: 33.3823 }, // Salamis, Cyprus
        { latitude: 34.7667, longitude: 32.4167 }, // Paphos, Cyprus
        { latitude: 36.9167, longitude: 30.8500 }, // Perga
        { latitude: 38.3167, longitude: 31.1833 }, // Antioch Pisidia
        { latitude: 37.8667, longitude: 32.4833 }, // Iconium
        { latitude: 37.6167, longitude: 32.4833 }, // Lystra
        { latitude: 37.7500, longitude: 33.2500 }, // Derbe
      ],
      waypoints: [
        { 
          name: 'Antioch Syria', 
          description: 'Missionary sending church - "Set apart for me Barnabas and Saul"', 
          verse: 'Acts 13:2',
          significance: 'First organized missionary journey begins',
          modernLocation: 'Antakya, Turkey',
          miracle: 'Holy Spirit calls and sends missionaries'
        },
        { 
          name: 'Seleucia', 
          description: 'Port city departure - sailed to Cyprus', 
          verse: 'Acts 13:4',
          significance: 'Journey by sea begins',
          modernLocation: 'Turkey coast',
          miracle: 'Safe sea voyage'
        },
        { 
          name: 'Salamis', 
          description: 'Preached in Jewish synagogues with John Mark as helper', 
          verse: 'Acts 13:5',
          significance: 'Ministry to Jews first, then Gentiles',
          modernLocation: 'Cyprus',
          miracle: 'Word of God proclaimed'
        },
        { 
          name: 'Paphos', 
          description: 'Sergius Paulus believes, Elymas struck blind, Saul becomes Paul', 
          verse: 'Acts 13:9-12',
          significance: 'First Gentile official converted, Paul\'s name change',
          modernLocation: 'Cyprus',
          miracle: 'Sorcerer struck blind, proconsul believes'
        },
        { 
          name: 'Perga', 
          description: 'John Mark departs and returns to Jerusalem', 
          verse: 'Acts 13:13',
          significance: 'Team faces first defection and challenge',
          modernLocation: 'Turkey',
          miracle: 'Paul and Barnabas continue despite setback'
        },
        { 
          name: 'Antioch Pisidia', 
          description: 'Paul\'s great sermon - "Through Jesus forgiveness of sins is proclaimed"', 
          verse: 'Acts 13:38',
          significance: 'Gospel clearly preached, Jews reject, Gentiles receive',
          modernLocation: 'Turkey',
          miracle: 'Many Gentiles believe, word spreads through region'
        },
        { 
          name: 'Iconium', 
          description: 'Signs and wonders, city divided, plot to stone them', 
          verse: 'Acts 14:3',
          significance: 'Miraculous confirmation of gospel message',
          modernLocation: 'Konya, Turkey',
          miracle: 'Signs and wonders confirm the message'
        },
        { 
          name: 'Lystra', 
          description: 'Lame man healed, called gods, Paul stoned and raised up', 
          verse: 'Acts 14:19-20',
          significance: 'Greatest persecution and miraculous recovery',
          modernLocation: 'Turkey',
          miracle: 'Lame man walks, Paul survives stoning'
        },
        { 
          name: 'Derbe', 
          description: 'Many disciples made, then retraced steps strengthening churches', 
          verse: 'Acts 14:21',
          significance: 'Successful evangelism, church strengthening begins',
          modernLocation: 'Turkey',
          miracle: 'Many converted, churches established and strengthened'
        },
      ],
      totalDistance: '1,400 miles',
      duration: '2 years (AD 46-48)',
      significance: 'First systematic Gentile evangelism, church planting methodology established',
      keyThemes: ['Pioneering', 'Gentile Inclusion', 'Persecution', 'Church Planting', 'Signs and Wonders'],
      miracleCount: 6,
      propheticElements: ['Gentile inclusion prophesied', 'Gospel to ends of earth begins']
    },
    {
      id: 'paul_second_journey',
      name: 'Paul\'s Second Missionary Journey',
      description: 'Gospel enters Europe - Macedonia and Greece, 2,800 miles crossing continents',
      era: 'apostolic',
      color: '#E74C3C',
      coordinates: [
        { latitude: 36.2021, longitude: 36.1604 }, // Antioch Syria
        { latitude: 37.6167, longitude: 32.4833 }, // Lystra (Timothy joins)
        { latitude: 37.8667, longitude: 32.4833 }, // Iconium
        { latitude: 38.3167, longitude: 31.1833 }, // Antioch Pisidia
        { latitude: 39.7667, longitude: 26.0667 }, // Troas
        { latitude: 40.9394, longitude: 24.4069 }, // Neapolis
        { latitude: 41.0136, longitude: 24.2872 }, // Philippi
        { latitude: 40.6401, longitude: 22.9444 }, // Thessalonica
        { latitude: 40.5167, longitude: 22.5167 }, // Berea
        { latitude: 37.9755, longitude: 23.7348 }, // Athens
        { latitude: 37.9061, longitude: 22.8781 }, // Corinth
        { latitude: 37.9495, longitude: 27.3639 }, // Ephesus (brief visit)
      ],
      waypoints: [
        { 
          name: 'Antioch Syria', 
          description: 'Second journey begins after Jerusalem Council decision', 
          verse: 'Acts 15:36',
          significance: 'Gentile inclusion officially confirmed',
          modernLocation: 'Antakya, Turkey',
          miracle: 'Church unity maintained despite disagreement'
        },
        { 
          name: 'Lystra', 
          description: 'Timothy joins team - "well spoken of by believers"', 
          verse: 'Acts 16:2',
          significance: 'Next generation leader recruited',
          modernLocation: 'Turkey',
          miracle: 'Young leader prepared by God'
        },
        { 
          name: 'Troas', 
          description: 'Macedonian vision - "Come over to Macedonia and help us"', 
          verse: 'Acts 16:9',
          significance: 'Divine direction to Europe, Luke joins',
          modernLocation: 'Turkey',
          miracle: 'Vision redirects mission to Europe'
        },
        { 
          name: 'Neapolis', 
          description: 'First European port - gateway to Macedonia', 
          verse: 'Acts 16:11',
          significance: 'Gospel enters Europe',
          modernLocation: 'Kavala, Greece',
          miracle: 'Favorable winds for historic crossing'
        },
        { 
          name: 'Philippi', 
          description: 'Lydia converted, earthquake opens prison, jailer saved', 
          verse: 'Acts 16:14',
          significance: 'First European converts, miraculous deliverance',
          modernLocation: 'Greece',
          miracle: 'Hearts opened, earthquake, chains broken, jailer converted'
        },
        { 
          name: 'Thessalonica', 
          description: 'Synagogue ministry, some Jews and many Greeks believe', 
          verse: 'Acts 17:4',
          significance: 'Strong church planted despite persecution',
          modernLocation: 'Thessaloniki, Greece',
          miracle: 'Gospel spreads despite opposition'
        },
        { 
          name: 'Berea', 
          description: 'Noble Bereans examine Scriptures daily', 
          verse: 'Acts 17:11',
          significance: 'Model of Scripture study and verification',
          modernLocation: 'Veria, Greece',
          miracle: 'Hearts prepared to receive and test truth'
        },
        { 
          name: 'Athens', 
          description: 'Areopagus sermon - "Unknown God" revealed as Creator', 
          verse: 'Acts 17:23',
          significance: 'Gospel to intellectual elite, philosophical engagement',
          modernLocation: 'Athens, Greece',
          miracle: 'Wisdom to address philosophers, some believe including Dionysius'
        },
        { 
          name: 'Corinth', 
          description: '18 months ministry, vision from Jesus, letters to Thessalonians written', 
          verse: 'Acts 18:9-10',
          significance: 'Extended ministry, divine encouragement, letter writing begins',
          modernLocation: 'Greece',
          miracle: 'Jesus appears in vision, Gallio dismisses charges, church grows'
        },
        { 
          name: 'Ephesus', 
          description: 'Brief visit, promise to return, Aquila and Priscilla left', 
          verse: 'Acts 18:19-21',
          significance: 'Strategic positioning for future ministry',
          modernLocation: 'Turkey',
          miracle: 'Divine timing and preparation for future work'
        },
      ],
      totalDistance: '2,800 miles',
      duration: '3 years (AD 49-52)',
      significance: 'Gospel enters Europe, major churches planted, letters written, missionary methodology refined',
      keyThemes: ['European Expansion', 'Divine Guidance', 'Church Planting', 'Persecution and Deliverance', 'Letter Writing'],
      miracleCount: 8,
      propheticElements: ['Gospel to ends of earth', 'Gentile church established', 'Letters to churches begin']
    },
    {
      id: 'paul_third_journey',
      name: 'Paul\'s Third Missionary Journey',
      description: 'Ephesian ministry and farewell - 2+ years in Asia\'s capital, all Asia hears the gospel',
      era: 'apostolic',
      color: '#00BCD4',
      coordinates: [
        { latitude: 36.2021, longitude: 36.1604 }, // Antioch Syria
        { latitude: 37.6167, longitude: 32.4833 }, // Lystra
        { latitude: 37.8667, longitude: 32.4833 }, // Iconium
        { latitude: 37.9495, longitude: 27.3639 }, // Ephesus
        { latitude: 41.0136, longitude: 24.2872 }, // Philippi (via Macedonia)
        { latitude: 40.6401, longitude: 22.9444 }, // Thessalonica
        { latitude: 37.9061, longitude: 22.8781 }, // Corinth
        { latitude: 39.7667, longitude: 26.0667 }, // Troas
        { latitude: 39.2667, longitude: 27.1833 }, // Miletus
        { latitude: 33.2708, longitude: 35.2014 }, // Tyre
        { latitude: 32.4922, longitude: 34.8889 }, // Caesarea
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem
      ],
      waypoints: [
        { 
          name: 'Antioch Syria', 
          description: 'Third journey begins - strengthening disciples', 
          verse: 'Acts 18:23',
          significance: 'Systematic strengthening of established churches',
          modernLocation: 'Antakya, Turkey',
          miracle: 'Continued church growth and maturity'
        },
        { 
          name: 'Galatian Region', 
          description: 'Strengthening all disciples in order', 
          verse: 'Acts 18:23',
          significance: 'Pastoral care and discipleship',
          modernLocation: 'Central Turkey',
          miracle: 'Churches strengthened and established'
        },
        { 
          name: 'Ephesus', 
          description: '2+ years ministry, unusual miracles, books burned, all Asia hears gospel', 
          verse: 'Acts 19:10',
          significance: 'Greatest single location ministry, regional impact',
          modernLocation: 'Turkey',
          miracle: 'Handkerchiefs heal, demons flee, books worth 50,000 silver pieces burned'
        },
        { 
          name: 'Macedonia', 
          description: 'Revisiting Philippi and Thessalonica, much encouragement', 
          verse: 'Acts 20:1-2',
          significance: 'Pastoral follow-up and encouragement',
          modernLocation: 'Northern Greece',
          miracle: 'Churches encouraged and strengthened'
        },
        { 
          name: 'Corinth', 
          description: '3 months, Romans written, plot discovered', 
          verse: 'Acts 20:3',
          significance: 'Major theological letter written, plot thwarted',
          modernLocation: 'Greece',
          miracle: 'Plot revealed, Romans epistle inspired'
        },
        { 
          name: 'Troas', 
          description: 'Eutychus falls from window, raised by Paul', 
          verse: 'Acts 20:9-10',
          significance: 'Power over death demonstrated',
          modernLocation: 'Turkey',
          miracle: 'Young man raised from dead after falling from third story'
        },
        { 
          name: 'Miletus', 
          description: 'Ephesian elders farewell - "You will see my face no more"', 
          verse: 'Acts 20:25',
          significance: 'Pastoral farewell, leadership transition',
          modernLocation: 'Turkey',
          miracle: 'Prophetic insight, emotional farewell, tears and prayers'
        },
        { 
          name: 'Tyre', 
          description: 'Disciples warn through Spirit not to go to Jerusalem', 
          verse: 'Acts 21:4',
          significance: 'Prophetic warnings of coming imprisonment',
          modernLocation: 'Lebanon',
          miracle: 'Spirit reveals future through disciples'
        },
        { 
          name: 'Caesarea', 
          description: 'Agabus prophesies with Paul\'s belt - binding in Jerusalem', 
          verse: 'Acts 21:11',
          significance: 'Dramatic prophecy of arrest and suffering',
          modernLocation: 'Israel',
          miracle: 'Prophetic demonstration with Paul\'s belt'
        },
        { 
          name: 'Jerusalem', 
          description: 'Arrest in temple, beginning of imprisonment journey', 
          verse: 'Acts 21:27',
          significance: 'Ministry phase ends, suffering phase begins',
          modernLocation: 'Jerusalem',
          miracle: 'Roman protection from mob, opportunity to testify'
        },
      ],
      totalDistance: '2,700 miles',
      duration: '4 years (AD 53-57)',
      significance: 'Regional evangelization, church maturation, major letters written, preparation for Rome',
      keyThemes: ['Regional Impact', 'Unusual Miracles', 'Church Maturation', 'Letter Writing', 'Prophetic Warnings'],
      miracleCount: 12,
      propheticElements: ['All Asia hears gospel', 'Imprisonment prophesied', 'Journey to Rome foreshadowed']
    },
    {
      id: 'paul_journey_to_rome',
      name: 'Paul\'s Journey to Rome',
      description: 'Shipwreck and arrival - from prisoner to preacher in the empire\'s heart',
      era: 'apostolic',
      color: '#FF5722',
      coordinates: [
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem (arrest)
        { latitude: 32.4922, longitude: 34.8889 }, // Caesarea (2 years imprisonment)
        { latitude: 33.2708, longitude: 35.2014 }, // Sidon
        { latitude: 36.2021, longitude: 36.1604 }, // Under Cyprus
        { latitude: 36.4500, longitude: 30.1167 }, // Myra
        { latitude: 35.2401, longitude: 25.1289 }, // Fair Havens, Crete
        { latitude: 35.8997, longitude: 14.5147 }, // Malta (shipwreck)
        { latitude: 37.0755, longitude: 15.2866 }, // Syracuse
        { latitude: 38.1157, longitude: 15.6516 }, // Rhegium
        { latitude: 40.8260, longitude: 14.1925 }, // Puteoli
        { latitude: 41.9028, longitude: 12.4964 }, // Rome
      ],
      waypoints: [
        { 
          name: 'Jerusalem', 
          description: 'Arrest in temple - "I am ready to die at Jerusalem"', 
          verse: 'Acts 21:13',
          significance: 'Willing suffering for gospel, Roman protection',
          modernLocation: 'Jerusalem',
          miracle: 'Roman tribune rescues from mob'
        },
        { 
          name: 'Caesarea', 
          description: '2 years imprisonment, testimonies to Felix, Festus, Agrippa', 
          verse: 'Acts 24:27',
          significance: 'Gospel to highest officials, appeal to Caesar',
          modernLocation: 'Israel',
          miracle: 'Opportunities to testify to governors and kings'
        },
        { 
          name: 'Sidon', 
          description: 'Julius the centurion shows kindness, visits friends', 
          verse: 'Acts 27:3',
          significance: 'Favor with guards, friendship maintained',
          modernLocation: 'Lebanon',
          miracle: 'Kindness from Roman centurion'
        },
        { 
          name: 'Myra', 
          description: 'Transfer to Alexandrian grain ship bound for Italy', 
          verse: 'Acts 27:5-6',
          significance: 'Divine providence in travel arrangements',
          modernLocation: 'Turkey',
          miracle: 'Right ship found for journey to Rome'
        },
        { 
          name: 'Fair Havens', 
          description: 'Paul warns against sailing, advice rejected', 
          verse: 'Acts 27:10',
          significance: 'Prophetic insight ignored, storm coming',
          modernLocation: 'Crete',
          miracle: 'Prophetic warning of coming disaster'
        },
        { 
          name: 'Mediterranean Storm', 
          description: 'Northeaster storm, angel appears to Paul with promise', 
          verse: 'Acts 27:23-24',
          significance: 'Divine assurance in life-threatening storm',
          modernLocation: 'Mediterranean Sea',
          miracle: 'Angel appears, promises all 276 lives will be saved'
        },
        { 
          name: 'Malta Shipwreck', 
          description: 'Viper bite, no harm, many healings on island', 
          verse: 'Acts 28:5',
          significance: 'Miraculous protection and healing ministry',
          modernLocation: 'Malta',
          miracle: 'Viper bite causes no harm, Publius\' father healed, many others healed'
        },
        { 
          name: 'Syracuse', 
          description: 'Three days rest in Sicily', 
          verse: 'Acts 28:12',
          significance: 'Continued journey toward Rome',
          modernLocation: 'Sicily, Italy',
          miracle: 'Safe passage continues'
        },
        { 
          name: 'Puteoli', 
          description: 'Christians found, stayed seven days', 
          verse: 'Acts 28:14',
          significance: 'Christian fellowship even in distant places',
          modernLocation: 'Bay of Naples, Italy',
          miracle: 'Christians already established in distant port'
        },
        { 
          name: 'Rome', 
          description: 'House arrest, preaching to all who came for 2 years', 
          verse: 'Acts 28:30-31',
          significance: 'Gospel reaches empire\'s heart, letters written',
          modernLocation: 'Rome, Italy',
          miracle: 'Freedom to preach in capital, prison epistles written'
        },
      ],
      totalDistance: '2,250 miles',
      duration: '4+ years (AD 57-61)',
      significance: 'Gospel reaches Rome, miraculous protection, prison epistles written, empire evangelization',
      keyThemes: ['Divine Protection', 'Miraculous Deliverance', 'Witness to Officials', 'Prison Ministry', 'Empire Evangelization'],
      miracleCount: 10,
      propheticElements: ['Must testify in Rome', 'All lives saved in shipwreck', 'Gospel to ends of earth']
    }
  ];

  // Thematic Filter Categories
  const filterCategories = [
    { id: 'all', name: 'All Locations', icon: 'map', color: theme.primary },
    { id: 'divine_encounter', name: 'Divine Encounters', icon: 'flash-on', color: '#FFD700' },
    { id: 'miracle', name: 'Miracles', icon: 'auto-fix-high', color: '#FF6B6B' },
    { id: 'covenant_moment', name: 'Covenant Moments', icon: 'handshake', color: '#4ECDC4' },
    { id: 'battle_miracle', name: 'Battles & Miracles', icon: 'sports-martial-arts', color: '#E74C3C' },
    { id: 'prophecy_foreshadowing', name: 'Prophecies', icon: 'visibility', color: '#9B59B6' },
    { id: 'passion_resurrection', name: 'Passion & Resurrection', icon: 'favorite', color: '#FF1744' },
    { id: 'conversion', name: 'Conversions', icon: 'refresh', color: '#00E676' },
    { id: 'mercy_forgiveness', name: 'Mercy & Forgiveness', icon: 'healing', color: '#00BCD4' }
  ];

  // Era Filter Options  
  const eraFilters = [
    { id: 'all', name: 'All Eras', icon: 'history', color: theme.primary },
    { id: 'patriarchs', name: 'Patriarchs', icon: 'family-restroom', color: '#8D6E63' },
    { id: 'exodus', name: 'Exodus', icon: 'directions-walk', color: '#FF5722' },
    { id: 'conquest', name: 'Conquest', icon: 'flag', color: '#795548' },
    { id: 'kingdom', name: 'Kingdom', icon: 'castle', color: '#673AB7' },
    { id: 'prophets', name: 'Prophets', icon: 'record-voice-over', color: '#3F51B5' },
    { id: 'exile', name: 'Exile', icon: 'sentiment-very-dissatisfied', color: '#607D8B' },
    { id: 'nt', name: 'New Testament', icon: 'auto-stories', color: '#2196F3' },
    { id: 'apostolic', name: 'Apostolic', icon: 'groups', color: '#009688' }
  ];

  // Initial map region (centered on Holy Land)
  const initialRegion = {
    latitude: 31.7683,
    longitude: 35.2137,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
  };

  // Get filtered locations based on active era and filter
  const getFilteredLocations = () => {
    let filtered = biblicalLocations;
    
    // Filter by era
    if (activeEra !== 'all') {
      filtered = filtered.filter(location => location.era.includes(activeEra));
    }
    
    // Filter by category
    if (activeFilter !== 'all') {
      filtered = filtered.filter(location => location.category === activeFilter);
    }
    
    return filtered;
  };

  // Get filtered journeys based on active era
  const getFilteredJourneys = () => {
    if (activeEra === 'all') return biblicalJourneys;
    return biblicalJourneys.filter(journey => journey.era === activeEra);
  };

  // Handle location marker press with enhanced details
  const handleLocationPress = (location) => {
    hapticFeedback.light();
    setSelectedLocation(location);
    
    // Animate to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...location.coordinate,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  };

  // Handle journey selection with animation
  const handleJourneyPress = (journey) => {
    hapticFeedback.light();
    setSelectedJourney(journey);
    // Don't show route path for "View Route" - only for "Play Journey"
    
    // Animate to journey bounds
    if (mapRef.current && journey.coordinates.length > 0) {
      mapRef.current.fitToCoordinates(journey.coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Enhanced journey route animation with waypoint details
  const animateJourneyRoute = (journey) => {
    if (!journey || !journey.coordinates) return;
    
    hapticFeedback.light();
    // Clear any existing timeouts first
    journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    journeyTimeouts.current = [];
    
    setIsPlayingJourney(true);
    isPlayingRef.current = true;
    setSelectedJourney(journey);
    setShowJourneyRoutes(true); // Show the route path when playing
    setAnimatedRouteIndex(0);
    
    // Animate to each coordinate (which represents points of interest)
    const animateToNextPoint = (coordinateIndex) => {
      if (!isPlayingRef.current || !journey.coordinates || coordinateIndex >= journey.coordinates.length) {
        setIsPlayingJourney(false);
        isPlayingRef.current = false;
        setShowJourneyRoutes(false); // Hide route path when journey completes
        journeyTimeouts.current = [];
        return;
      }
      
      const coordinate = journey.coordinates[coordinateIndex];
      
      // Animate to coordinate location (point of interest)
      if (mapRef.current && coordinate) {
        mapRef.current.animateToRegion({
          ...coordinate,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }, 2000);
      }
      
      setAnimatedRouteIndex(coordinateIndex);
      
      // Continue to next point after delay
      const timeoutId = setTimeout(() => {
        // Check if journey is still playing before continuing
        if (isPlayingRef.current) {
          animateToNextPoint(coordinateIndex + 1);
        }
      }, 3500);
      
      journeyTimeouts.current.push(timeoutId);
    };
    
    animateToNextPoint(0);
  };

  // Show journey details modal
  const showJourneyDetails = (journey) => {
    Alert.alert(
      `${journey.name}`,
      `${journey.description}\n\nDistance: ${journey.totalDistance}\nDuration: ${journey.duration}\nSignificance: ${journey.significance}\n\nMiracles: ${journey.miracleCount || 0}\nThemes: ${journey.keyThemes ? journey.keyThemes.join(', ') : 'Various'}`,
      [
        { text: 'Play Journey', onPress: () => animateJourneyRoute(journey) },
        { text: 'View Route', onPress: () => handleJourneyPress(journey) },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  // Enhanced location details with more context
  const showLocationDetails = (location) => {
    // Directly show the detailed view instead of the alert popup
    handleLocationPress(location);
  };

  // Get statistics for current filter
  const getFilterStats = () => {
    const locations = getFilteredLocations();
    const journeys = getFilteredJourneys();
    
    return {
      locationCount: locations.length,
      journeyCount: journeys.length,
      miracleCount: locations.reduce((sum, loc) => sum + (loc.miracleCount || 0), 0) + 
                   journeys.reduce((sum, journey) => sum + (journey.miracleCount || 0), 0),
      totalDistance: journeys.reduce((sum, journey) => {
        const distance = parseInt(journey.totalDistance?.replace(/[^\d]/g, '') || '0');
        return sum + distance;
      }, 0)
    };
  };

  // Toggle bookmark for location
  const toggleBookmark = (locationId) => {
    hapticFeedback.light();
    setBookmarkedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Get marker color based on category
  const getMarkerColor = (location) => {
    const categoryColors = {
      divine_encounter: '#FFD700',
      miracle: '#FF6B6B', 
      covenant_moment: '#4ECDC4',
      battle_miracle: '#E74C3C',
      prophecy_foreshadowing: '#9B59B6',
      passion_resurrection: '#FF1744',
      conversion: '#00E676',
      mercy_forgiveness: '#00BCD4',
      altar_worship: '#FF9800',
      liberation: '#8BC34A',
      journey_start: '#795548',
      ministry_center: '#2196F3',
      church_center: '#009688',
      exile_miracles: '#607D8B'
    };
    
    return categoryColors[location.category] || theme.primary;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.background }]}>
        {/* Full Screen Map Background */}
        <View style={styles.fullScreenMapContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullScreenMap}
            initialRegion={initialRegion}
            provider={Platform.OS === 'ios' ? PROVIDER_APPLE : PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            {/* Enhanced Location Markers */}
            {getFilteredLocations().map((location) => (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                title={location.name}
                description={location.description}
                onPress={() => showLocationDetails(location)}
                pinColor={getMarkerColor(location)}
              >
                <View style={[
                  styles.customMarker,
                  { 
                    backgroundColor: getMarkerColor(location),
                    borderColor: theme.surface,
                    transform: [{ scale: selectedLocation?.id === location.id ? 1.3 : bookmarkedLocations.includes(location.id) ? 1.1 : 1.0 }],
                    shadowColor: getMarkerColor(location),
                    shadowOpacity: selectedLocation?.id === location.id ? 0.6 : 0.3,
                    shadowRadius: selectedLocation?.id === location.id ? 8 : 4,
                  }
                ]}>
                  <MaterialIcons 
                    name={location.icon} 
                    size={selectedLocation?.id === location.id ? 24 : 20} 
                    color="white" 
                  />
                  {/* Bookmark indicator removed */}
                  {location.miracleCount && location.miracleCount > 0 && (
                    <View style={[styles.miracleIndicator, { backgroundColor: getMarkerColor(location) }]}>
                      <Text style={styles.miracleIndicatorText}>{location.miracleCount}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            ))}

            {/* Journey Routes */}
            {showJourneyRoutes && getFilteredJourneys().map((journey) => (
              <Polyline
                key={journey.id}
                coordinates={journey.coordinates}
                strokeColor={journey.color}
                strokeWidth={selectedJourney?.id === journey.id ? 4 : 2}
                strokePattern={selectedJourney?.id === journey.id ? [10, 5] : undefined}
              />
            ))}
          </MapView>
        </View>

        {/* Overlay UI Elements */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <SafeAreaView style={styles.safeAreaContainer} pointerEvents="box-none">
            {/* Header */}
            <BlurView intensity={isDark ? 80 : 40} style={[styles.headerBlur, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { 
                  color: '#FFFFFF',
                  fontWeight: '700'
                }]}>
                  Interactive Bible Maps
                </Text>
                {/* Bookmark removed */}
                <View style={styles.bookmarkButton} />
              </View>
            </BlurView>

            {/* Era Filters */}
            <BlurView intensity={isDark ? 60 : 30} style={[styles.eraFiltersBlur, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eraFiltersContent}
              >
                {eraFilters.map((era) => (
                  <TouchableOpacity
                    key={era.id}
                    style={[
                      styles.eraTab,
                      {
                        backgroundColor: activeEra === era.id ? era.color + '20' : 'transparent',
                        borderColor: activeEra === era.id ? era.color : theme.border,
                      }
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      setActiveEra(era.id);
                    }}
                  >
                    <MaterialIcons 
                      name={era.icon} 
                      size={16} 
                      color={activeEra === era.id ? era.color : '#FFFFFF'} 
                    />
                    <Text style={[
                      styles.eraTabText,
                      { 
                        color: activeEra === era.id ? era.color : '#FFFFFF',
                        fontWeight: '600'
                      }
                    ]}>
                      {era.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>

            {/* Thematic Filters */}
            <BlurView intensity={isDark ? 60 : 30} style={[styles.thematicFiltersBlur, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
              >
                {filterCategories.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: activeFilter === filter.id ? filter.color + '20' : 'transparent',
                        borderColor: activeFilter === filter.id ? filter.color : theme.border,
                      }
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      setActiveFilter(filter.id);
                    }}
                  >
                    <MaterialIcons 
                      name={filter.icon} 
                      size={14} 
                      color={activeFilter === filter.id ? filter.color : '#FFFFFF'} 
                    />
                    <Text style={[
                      styles.filterTabText,
                      { 
                        color: activeFilter === filter.id ? filter.color : '#FFFFFF',
                        fontWeight: '600'
                      }
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Statistics Display */}
              <View style={styles.statsContainer}>
                {(() => {
                  const stats = getFilterStats();
                  return (
                    <>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.locationCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Locations</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.success }]}>{stats.journeyCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Journeys</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.warning }]}>{stats.miracleCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Miracles</Text>
                      </View>
                      {stats.totalDistance > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statNumber, { color: theme.info }]}>{stats.totalDistance.toLocaleString()}</Text>
                          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Miles</Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            </BlurView>

            {/* Journey Controls */}
            <BlurView intensity={isDark ? 80 : 40} style={[styles.journeyControlsBlur, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              <View style={styles.journeyControlsContent}>
                <View style={styles.journeyHeaderRow}>
                  <Text style={[
                    styles.journeyTitle,
                    { 
                      color: '#FFFFFF',
                      fontWeight: '700'
                    }
                  ]}>
                    Biblical Journeys
                  </Text>
                  {isPlayingJourney && (
                    <TouchableOpacity
                      style={[styles.stopJourneyButton, { backgroundColor: theme.error }]}
                      onPress={stopJourney}
                    >
                      <MaterialIcons name="stop" size={16} color="white" />
                      <Text style={styles.stopJourneyText}>Stop Journey</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.journeyButtonsContainer}
                >
                  {getFilteredJourneys().map((journey) => (
                    <TouchableOpacity
                      key={journey.id}
                      style={[
                        styles.journeyButton,
                        {
                          backgroundColor: selectedJourney?.id === journey.id ? journey.color + '20' : 'rgba(255,255,255,0.1)',
                          borderColor: selectedJourney?.id === journey.id ? journey.color : 'rgba(255,255,255,0.3)',
                        }
                      ]}
                      onPress={() => showJourneyDetails(journey)}
                      onLongPress={() => animateJourneyRoute(journey)}
                    >
                      <View style={styles.journeyButtonContent}>
                        <Text style={[
                          styles.journeyButtonText,
                          { 
                            color: selectedJourney?.id === journey.id ? journey.color : '#FFFFFF',
                            fontWeight: '600'
                          }
                        ]}>
                          {journey.name}
                        </Text>
                        {journey.miracleCount && (
                          <View style={[styles.miracleBadge, { backgroundColor: journey.color }]}>
                            <Text style={styles.miracleBadgeText}>{journey.miracleCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.journeyDistance,
                        { 
                          color: selectedJourney?.id === journey.id ? journey.color : 'rgba(255,255,255,0.8)',
                          fontWeight: '500'
                        }
                      ]}>
                        {journey.totalDistance}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </BlurView>
          </SafeAreaView>
        </View>

        {/* Location Detail Modal */}
        {selectedLocation && (
          <Modal
            visible={!!selectedLocation}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedLocation(null)}
          >
            <SafeAreaView style={[styles.detailContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.detailCloseButton}>
                  <MaterialIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedLocation.name}
                </Text>
                {/* Bookmark removed */}
                <View style={styles.detailBookmarkButton} />
              </View>

              <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                {/* Location Info Card */}
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                  <View style={styles.detailCardHeader}>
                    <View style={[styles.detailIcon, { backgroundColor: getMarkerColor(selectedLocation) + '20' }]}>
                      <MaterialIcons 
                        name={selectedLocation.icon} 
                        size={24} 
                        color={getMarkerColor(selectedLocation)} 
                      />
                    </View>
                    <View style={styles.detailCardTitle}>
                      <Text style={[styles.detailCardName, { color: theme.text }]}>
                        {selectedLocation.name}
                      </Text>
                      <Text style={[styles.detailCardType, { color: theme.textSecondary }]}>
                        {selectedLocation.type} • {selectedLocation.era.join(', ')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                    {selectedLocation.description}
                  </Text>
                  
                  <Text style={[styles.detailSignificance, { color: theme.text }]}>
                    {selectedLocation.significance}
                  </Text>
                </View>

                {/* Characters Card */}
                {selectedLocation.characters && selectedLocation.characters.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Key Biblical Figures
                    </Text>
                    <View style={styles.charactersContainer}>
                      {selectedLocation.characters.map((character, index) => (
                        <View key={index} style={[styles.characterTag, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.characterText, { color: theme.primary }]}>
                            {character}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Events Card */}
                {selectedLocation.events && selectedLocation.events.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Major Events
                    </Text>
                    {selectedLocation.events.map((event, index) => (
                      <View key={index} style={styles.eventItem}>
                        <View style={[styles.eventDot, { backgroundColor: getMarkerColor(selectedLocation) }]} />
                        <Text style={[styles.eventText, { color: theme.text }]}>
                          {event}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Scripture References Card */}
                {selectedLocation.verses && selectedLocation.verses.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Scripture References
                    </Text>
                    <View style={styles.versesContainer}>
                      {selectedLocation.verses.map((verse, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={[styles.verseTag, { backgroundColor: theme.success + '20' }]}
                          onPress={() => {
                            hapticFeedback.light();
                            // Future: Open Bible app or verse lookup
                          }}
                        >
                          <MaterialIcons name="auto-stories" size={14} color={theme.success} />
                          <Text style={[styles.verseText, { color: theme.success }]}>
                            {verse}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenMapContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  fullScreenMap: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  headerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  eraFiltersBlur: {
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  eraFiltersContent: {
    paddingHorizontal: 15,
  },
  eraTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
  },
  eraTabText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  thematicFiltersBlur: {
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filtersContent: {
    paddingHorizontal: 15,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  journeyControlsBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  journeyControlsContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stopJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stopJourneyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  journeyButtonsContainer: {
    paddingRight: 20,
    flexDirection: 'row',
  },
  journeyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 200,
    alignSelf: 'flex-start',
  },
  journeyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailCardTitle: {
    flex: 1,
  },
  detailCardName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailCardType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  detailSignificance: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  charactersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  characterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 12,
  },
  eventText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verseText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Enhanced Journey Button Styles
  journeyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  journeyDistance: {
    fontSize: 10,
    fontWeight: '400',
    opacity: 0.8,
  },
  miracleBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  miracleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  
  // Enhanced Marker Styles
  bookmarkIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miracleIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  miracleIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  
  // Statistics Display Styles
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default InteractiveBibleMaps;
