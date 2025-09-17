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
      description: 'From Ur to the Promised Land - the father of faith\'s epic journey',
      era: 'patriarchs',
      color: '#FFD700',
      coordinates: [
        { latitude: 30.9625, longitude: 46.1030 }, // Ur
        { latitude: 36.8644, longitude: 39.0306 }, // Haran
        { latitude: 32.2140, longitude: 35.2777 }, // Shechem
        { latitude: 31.9308, longitude: 35.2203 }, // Bethel
        { latitude: 31.5326, longitude: 35.0998 }, // Hebron
      ],
      waypoints: [
        { name: 'Ur of Chaldeans', description: 'God\'s call begins', verse: 'Genesis 12:1' },
        { name: 'Haran', description: 'Promise of descendants', verse: 'Genesis 12:2-3' },
        { name: 'Shechem', description: 'First altar in Promised Land', verse: 'Genesis 12:6-7' },
        { name: 'Bethel', description: 'Altar between Bethel and Ai', verse: 'Genesis 12:8' },
        { name: 'Hebron', description: 'Home under the oaks', verse: 'Genesis 13:18' },
      ],
      totalDistance: '1,200 miles',
      duration: 'Lifetime journey',
      significance: 'Foundation of faith, covenant promises, foreshadowing of Christ'
    },
    {
      id: 'exodus_journey',
      name: 'The Great Exodus',
      description: 'Israel\'s liberation from Egypt to the Promised Land',
      era: 'exodus',
      color: '#FF6B6B',
      coordinates: [
        { latitude: 30.8418, longitude: 31.8897 }, // Rameses
        { latitude: 29.9668, longitude: 32.5498 }, // Red Sea
        { latitude: 29.8667, longitude: 33.1000 }, // Marah
        { latitude: 28.5392, longitude: 33.9734 }, // Mount Sinai
        { latitude: 31.7690, longitude: 35.7236 }, // Mount Nebo
      ],
      waypoints: [
        { name: 'Rameses', description: 'Exodus begins', verse: 'Exodus 12:37' },
        { name: 'Red Sea', description: 'Waters part', verse: 'Exodus 14:21-22' },
        { name: 'Marah', description: 'Bitter waters made sweet', verse: 'Exodus 15:23-25' },
        { name: 'Mount Sinai', description: 'Ten Commandments', verse: 'Exodus 20:1-17' },
        { name: 'Mount Nebo', description: 'Moses views Promised Land', verse: 'Deuteronomy 34:1-4' },
      ],
      totalDistance: '400+ miles',
      duration: '40 years',
      significance: 'Liberation, Law given, covenant established, wilderness wandering'
    },
    {
      id: 'jesus_ministry',
      name: 'Jesus\' Ministry Journey',
      description: 'From Galilee to Jerusalem - the Messiah\'s earthly ministry',
      era: 'nt',
      color: '#4ECDC4',
      coordinates: [
        { latitude: 31.7054, longitude: 35.2024 }, // Bethlehem
        { latitude: 32.7009, longitude: 35.2035 }, // Nazareth
        { latitude: 32.8792, longitude: 35.5750 }, // Capernaum
        { latitude: 32.2140, longitude: 35.2777 }, // Shechem (Sychar)
        { latitude: 31.8700, longitude: 35.4444 }, // Jericho
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem
      ],
      waypoints: [
        { name: 'Bethlehem', description: 'Birth of the Messiah', verse: 'Luke 2:4-7' },
        { name: 'Nazareth', description: 'Hometown and childhood', verse: 'Luke 2:39-40' },
        { name: 'Capernaum', description: 'Ministry headquarters', verse: 'Matthew 4:13' },
        { name: 'Sychar', description: 'Woman at the well', verse: 'John 4:7-26' },
        { name: 'Jericho', description: 'Zacchaeus and Bartimaeus', verse: 'Luke 19:1-10' },
        { name: 'Jerusalem', description: 'Passion, death, resurrection', verse: 'Luke 24:46-47' },
      ],
      totalDistance: '300+ miles',
      duration: '3.5 years ministry',
      significance: 'Incarnation, ministry, sacrifice, resurrection, salvation accomplished'
    },
    {
      id: 'paul_first_journey',
      name: 'Paul\'s First Missionary Journey',
      description: 'Taking the Gospel to the Gentiles - Cyprus and Asia Minor',
      era: 'apostolic',
      color: '#9B59B6',
      coordinates: [
        { latitude: 36.2021, longitude: 36.1604 }, // Antioch Syria
        { latitude: 34.7667, longitude: 32.4167 }, // Cyprus
        { latitude: 36.9167, longitude: 30.8500 }, // Perga
        { latitude: 38.3167, longitude: 31.1833 }, // Antioch Pisidia
        { latitude: 37.8667, longitude: 32.4833 }, // Iconium
        { latitude: 37.6167, longitude: 32.4833 }, // Lystra
        { latitude: 37.7500, longitude: 33.2500 }, // Derbe
      ],
      waypoints: [
        { name: 'Antioch Syria', description: 'Missionary sending church', verse: 'Acts 13:1-3' },
        { name: 'Cyprus', description: 'Sergius Paulus believes', verse: 'Acts 13:6-12' },
        { name: 'Perga', description: 'John Mark departs', verse: 'Acts 13:13' },
        { name: 'Antioch Pisidia', description: 'Paul\'s great sermon', verse: 'Acts 13:16-41' },
        { name: 'Iconium', description: 'Signs and wonders', verse: 'Acts 14:1-7' },
        { name: 'Lystra', description: 'Paul stoned and raised', verse: 'Acts 14:8-20' },
        { name: 'Derbe', description: 'Many disciples made', verse: 'Acts 14:20-21' },
      ],
      totalDistance: '1,400 miles',
      duration: '2 years (AD 46-48)',
      significance: 'First systematic Gentile evangelism, church planting begins'
    },
    {
      id: 'paul_second_journey',
      name: 'Paul\'s Second Missionary Journey',
      description: 'Gospel enters Europe - Macedonia and Greece',
      era: 'apostolic',
      color: '#E74C3C',
      coordinates: [
        { latitude: 36.2021, longitude: 36.1604 }, // Antioch Syria
        { latitude: 37.6167, longitude: 32.4833 }, // Lystra (Timothy joins)
        { latitude: 39.7667, longitude: 26.0667 }, // Troas
        { latitude: 41.0136, longitude: 24.2872 }, // Philippi
        { latitude: 40.6401, longitude: 22.9444 }, // Thessalonica
        { latitude: 40.5167, longitude: 22.5167 }, // Berea
        { latitude: 37.9755, longitude: 23.7348 }, // Athens
        { latitude: 37.9061, longitude: 22.8781 }, // Corinth
      ],
      waypoints: [
        { name: 'Antioch Syria', description: 'Second journey begins', verse: 'Acts 15:36' },
        { name: 'Lystra', description: 'Timothy joins team', verse: 'Acts 16:1-3' },
        { name: 'Troas', description: 'Macedonian vision', verse: 'Acts 16:8-10' },
        { name: 'Philippi', description: 'First European convert', verse: 'Acts 16:11-15' },
        { name: 'Thessalonica', description: 'Synagogue ministry', verse: 'Acts 17:1-4' },
        { name: 'Berea', description: 'Noble Bereans search Scripture', verse: 'Acts 17:10-12' },
        { name: 'Athens', description: 'Unknown God sermon', verse: 'Acts 17:22-31' },
        { name: 'Corinth', description: '18 months ministry', verse: 'Acts 18:1-11' },
      ],
      totalDistance: '2,800 miles',
      duration: '3 years (AD 49-52)',
      significance: 'Gospel enters Europe, major churches planted, letters written'
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
    setShowJourneyRoutes(true);
    
    // Animate to journey bounds
    if (mapRef.current && journey.coordinates.length > 0) {
      mapRef.current.fitToCoordinates(journey.coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Animate journey route tracing
  const animateJourneyRoute = (journey) => {
    if (!journey || !journey.coordinates) return;
    
    setIsPlayingJourney(true);
    setAnimatedRouteIndex(0);
    
    const animateToNextPoint = (index) => {
      if (index >= journey.coordinates.length) {
        setIsPlayingJourney(false);
        return;
      }
      
      // Animate to current point
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...journey.coordinates[index],
          latitudeDelta: 0.8,
          longitudeDelta: 0.8,
        }, 2000);
      }
      
      setAnimatedRouteIndex(index);
      
      // Continue to next point after delay
      setTimeout(() => {
        animateToNextPoint(index + 1);
      }, 3000);
    };
    
    animateToNextPoint(0);
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
            {/* Location Markers */}
            {getFilteredLocations().map((location) => (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                title={location.name}
                description={location.description}
                onPress={() => handleLocationPress(location)}
                pinColor={getMarkerColor(location)}
              >
                <View style={[
                  styles.customMarker,
                  { 
                    backgroundColor: getMarkerColor(location),
                    borderColor: theme.surface,
                    transform: [{ scale: selectedLocation?.id === location.id ? 1.2 : 1.0 }]
                  }
                ]}>
                  <MaterialIcons 
                    name={location.icon} 
                    size={20} 
                    color="white" 
                  />
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
          <SafeAreaView style={styles.safeAreaContainer}>
            {/* Header */}
            <BlurView intensity={80} style={styles.headerBlur}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { 
                  color: theme.text,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2
                }]}>
                  Interactive Bible Maps
                </Text>
                <TouchableOpacity 
                  onPress={() => toggleBookmark(selectedLocation?.id)} 
                  style={styles.bookmarkButton}
                >
                  <MaterialIcons 
                    name={bookmarkedLocations.includes(selectedLocation?.id) ? "bookmark" : "bookmark-border"} 
                    size={24} 
                    color={theme.text} 
                  />
                </TouchableOpacity>
              </View>
            </BlurView>

            {/* Era Filters */}
            <BlurView intensity={60} style={styles.eraFiltersBlur}>
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
                      color={activeEra === era.id ? era.color : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.eraTabText,
                      { 
                        color: activeEra === era.id ? era.color : theme.textSecondary,
                        textShadowColor: 'rgba(0,0,0,0.3)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 1
                      }
                    ]}>
                      {era.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>

            {/* Thematic Filters */}
            <BlurView intensity={60} style={styles.thematicFiltersBlur}>
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
                      color={activeFilter === filter.id ? filter.color : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.filterTabText,
                      { 
                        color: activeFilter === filter.id ? filter.color : theme.textSecondary,
                        textShadowColor: 'rgba(0,0,0,0.2)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 1
                      }
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>

            {/* Journey Controls */}
            <BlurView intensity={80} style={styles.journeyControlsBlur}>
              <View style={styles.journeyControlsContent}>
                <Text style={[
                  styles.journeyTitle,
                  { 
                    color: theme.text,
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2
                  }
                ]}>
                  Biblical Journeys
                </Text>
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
                      onPress={() => handleJourneyPress(journey)}
                      onLongPress={() => animateJourneyRoute(journey)}
                    >
                      <Text style={[
                        styles.journeyButtonText,
                        { 
                          color: selectedJourney?.id === journey.id ? journey.color : theme.text,
                          textShadowColor: 'rgba(0,0,0,0.3)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 1
                        }
                      ]}>
                        {journey.name}
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
                <TouchableOpacity onPress={() => setSelectedLocation(null)} style={[styles.detailCloseButton, { minWidth: 60, alignItems: 'center' }]}>
                  <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Close</Text>
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedLocation.name}
                </Text>
                <TouchableOpacity 
                  onPress={() => toggleBookmark(selectedLocation.id)} 
                  style={styles.detailBookmarkButton}
                >
                  <MaterialIcons 
                    name={bookmarkedLocations.includes(selectedLocation.id) ? "bookmark" : "bookmark-border"} 
                    size={24} 
                    color={theme.primary} 
                  />
                </TouchableOpacity>
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
  journeyButtonsContainer: {
    paddingRight: 20,
  },
  journeyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
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
});

export default InteractiveBibleMaps;
