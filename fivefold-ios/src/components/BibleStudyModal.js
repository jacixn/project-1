import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import BibleTimeline from './BibleTimeline';
import InteractiveBibleMaps from './InteractiveBibleMaps';
import ThematicGuides from './ThematicGuides';
import KeyVerses from './KeyVerses';

const BibleStudyModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedSection, setSelectedSection] = useState('main');
  const [selectedCharacterGroup, setSelectedCharacterGroup] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Modal overlay states for each section
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showCharactersModal, setShowCharactersModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [showVersesModal, setShowVersesModal] = useState(false);
  const [showKeyVersesModal, setShowKeyVersesModal] = useState(false);
  const [showFactsModal, setShowFactsModal] = useState(false);
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showParallelsModal, setShowParallelsModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);

  // Generate theme-appropriate colors for study sections
  const getThemeColors = () => {
    const baseColors = [
      theme.primary,
      theme.primaryLight,
      theme.primaryDark,
      theme.success,
      theme.warning,
      theme.info,
      theme.error,
    ];
    
    // Create variations of theme colors for different sections
    const variations = [];
    baseColors.forEach(color => {
      variations.push(color);
      // Add slight variations by adjusting opacity or mixing
      if (color.includes('#')) {
        variations.push(color + 'CC'); // Add transparency
        variations.push(color + '99'); // More transparency
      }
    });
    
    return variations;
  };

  const themeColors = getThemeColors();

  const studySections = [
    {
      id: 'characters',
      title: 'Bible Characters',
      icon: 'people',
      description: 'Explore profiles of key Bible figures',
      color: theme.primary,
      features: ['Character profiles', 'Family trees', 'Key events', 'Life lessons']
    },
    {
      id: 'timeline',
      title: 'Bible Timeline',
      icon: 'timeline',
      description: 'Journey through Biblical history',
      color: theme.primaryLight,
      features: ['Chronological events', 'Historical dates', 'Quick verse links', 'Era overview']
    },
    {
      id: 'maps',
      title: 'Interactive Maps',
      icon: 'map',
      description: 'Discover Biblical locations',
      color: theme.info,
      features: ['Key locations', 'Journey routes', 'Historical context', 'Character connections']
    },
    {
      id: 'themes',
      title: 'Thematic Guides',
      icon: 'category',
      description: 'Study by topics and themes',
      color: theme.success,
      features: ['Faith stories', 'Leadership lessons', 'Miracles', 'Prophecies']
    },
    {
      id: 'verses',
      title: 'Key Verses',
      icon: 'book',
      description: 'Essential verses by topic',
      color: theme.warning,
      features: ['Topical verses', 'Memory verses', 'Life guidance', 'Inspirational quotes']
    },
    {
      id: 'facts',
      title: 'Fast Facts',
      icon: 'lightbulb',
      description: 'Did you know? Bible trivia',
      color: theme.primaryDark,
      features: ['Amazing facts', 'Quick summaries', 'Fun trivia', 'Historical insights']
    },
    {
      id: 'reading',
      title: 'Reading Plans',
      icon: 'schedule',
      description: 'Chronological Bible reading',
      color: themeColors[6] || theme.primary,
      features: ['Historical order', 'Daily readings', 'Progress tracking', 'Guided study']
    },
    {
      id: 'parallels',
      title: 'Parallel Stories',
      icon: 'link',
      description: 'Connected Old & New Testament',
      color: themeColors[7] || theme.primaryLight,
      features: ['Story connections', 'Prophecy fulfillment', 'Type & antitype', 'Cross-references']
    },
    {
      id: 'audio',
      title: 'Audio Learning',
      icon: 'headset',
      description: 'Listen and learn',
      color: themeColors[8] || theme.info,
      features: ['Name pronunciation', 'Story summaries', 'Audio guides', 'Listening plans']
    },
    {
      id: 'quiz',
      title: 'Quiz & Games',
      icon: 'quiz',
      description: 'Test your Bible knowledge',
      color: theme.error,
      features: ['Interactive quizzes', 'Memory games', 'Progress tracking', 'Achievement badges']
    },
    {
      id: 'culture',
      title: 'Daily Life Context',
      icon: 'home',
      description: 'Life in Biblical times',
      color: themeColors[10] || theme.primaryDark,
      features: ['Ancient customs', 'Food & clothing', 'Social structure', 'Historical context']
    }
  ];

  const characterProfiles = {
    'Adam': {
      name: 'Adam - The First Man',
      image: require('../assets/adam.png'),
      story: `Adam is the first human being created by God, formed from dust and given life through God's breath (Genesis 1-3). His name means "man" or "human" and comes from the Hebrew word for ground (adamah). God placed Adam in the Garden of Eden to tend it and gave him authority to name all the animals. When God saw it wasn't good for Adam to be alone, He created Eve from Adam's rib as his companion.

Adam's most significant moment comes with the Fall. Despite God's warning not to eat from the tree of the knowledge of good and evil, Adam (along with Eve) ate the forbidden fruit after being tempted. This act of disobedience brought sin and death into the world. When God confronted him, Adam blamed both Eve and God himself ("The woman you put here with me - she gave me some fruit"). As punishment, God cursed the ground, making Adam's work difficult, and declared that he would eventually die and return to dust.

After the Fall, Adam lived 930 years and had many children, including Cain, Abel, and Seth. He represents humanity's original innocence, fall into sin, and need for redemption.`,
      themes: [
        'Image of God: Adam was created in God\'s image, establishing human dignity and our role as God\'s representatives on earth',
        'Original Sin: Adam\'s disobedience introduced sin into humanity, affecting all his descendants',
        'Type of Christ: In Christian theology, Adam is contrasted with Jesus (the "Second Adam"). Where Adam\'s disobedience brought death, Christ\'s obedience brought life'
      ],
      culturalImpact: `Adam appears throughout art, literature, and culture. Michelangelo's "Creation of Adam" on the Sistine Chapel ceiling is one of the most famous religious paintings. Milton's "Paradise Lost" portrays Adam as noble but ultimately responsible for the Fall. The phrase "Adam's apple" comes from the folk belief that the forbidden fruit got stuck in his throat.`,
      verses: ['Genesis 1:27', 'Genesis 2:7', 'Genesis 3:19', 'Romans 5:12']
    },
    'Eve': {
      name: 'Eve - The First Woman',
      image: require('../assets/eve.png'),
      story: `Eve is the first woman, created by God from Adam's rib to be his companion (Genesis 2-3). When Adam first sees her, he joyfully declares, "This is now bone of my bones and flesh of my flesh." Her creation establishes the institution of marriage and the principle that men and women are equal in essence and dignity.

Eve plays a crucial role in the Fall. The serpent approaches her with questions about God's command, eventually deceiving her into believing that eating the forbidden fruit would make her wise like God. She takes the fruit and also gives some to Adam. When God confronts them, Eve acknowledges her deception: "The serpent deceived me, and I ate."

After the Fall, Adam names her Eve (meaning "living") because she would become "the mother of all living." God promises that her offspring would eventually defeat the serpent, which Christians interpret as the first hint of salvation through Jesus Christ. Eve experienced the pain of childbirth and the difficulty of relationships as consequences of sin.`,
      themes: [
        'Helper and Equality: Eve was created as Adam\'s equal partner, not his subordinate',
        'Temptation and Choice: Her conversation with the serpent represents humanity\'s struggle with temptation and the freedom to choose',
        'Mother of Humanity: As the mother of all living people, Eve represents both the entry of sin and the hope of redemption',
        'New Eve: Christian tradition sees Mary, the mother of Jesus, as the "New Eve" whose obedience reversed Eve\'s disobedience'
      ],
      culturalImpact: `Eve appears frequently in art, often at the moment of temptation or after the Fall. Renaissance painters like Titian and Dürer portrayed her as the archetype of beauty and temptation. In literature, Milton's "Paradise Lost" gives Eve a complex character who shows both intelligence and remorse. Modern feminist interpretations often emphasize her desire for wisdom and her role as a tragic figure rather than simply the cause of humanity's problems.`,
      verses: ['Genesis 2:22-23', 'Genesis 3:6', 'Genesis 3:15', 'Genesis 3:20']
    },
    'Cain': {
      name: 'Cain - The First Murderer',
      image: require('../assets/cain.png'),
      story: `Cain is Adam and Eve's firstborn son, whose name means "acquired" (Genesis 4). He became a farmer while his brother Abel became a shepherd. When both brothers brought offerings to God, God accepted Abel's offering of the best portions from his flock but rejected Cain's offering of produce from the ground.

Consumed by anger and jealousy, Cain murdered Abel in the field, making him history's first murderer. When God asked where Abel was, Cain gave the famous callous response: "I don't know. Am I my brother's keeper?" God cursed Cain to be a restless wanderer, unable to successfully farm the ground that had absorbed Abel's blood.

Fearing for his life, Cain complained that his punishment was too great. In an act of mercy, God placed a protective mark on Cain, warning that anyone who killed him would face sevenfold vengeance. Cain then went to live in the land of Nod ("wandering") east of Eden, where he built the first city and had descendants who became pioneers in music, metalworking, and other crafts.`,
      themes: [
        'Sin\'s Progression: Cain\'s story shows how quickly sin escalated from disobedience (Adam and Eve) to murder in the next generation',
        'Brother\'s Keeper: His question "Am I my brother\'s keeper?" has become a fundamental moral challenge about our responsibility for others',
        'Jealousy and Worship: Cain\'s rejected offering teaches that God desires sincere worship from the heart, not just external ritual',
        'Grace in Judgment: Even as God punished Cain, He also protected him, showing mercy within justice'
      ],
      culturalImpact: `The phrase "raising Cain" means causing trouble, while the "mark of Cain" refers to a stigma of shame. Cain and Abel represent the eternal struggle between good and evil, appearing in countless works from Byron's dramatic poem "Cain" to Steinbeck's "East of Eden." The question "Am I my brother's keeper?" continues to challenge discussions about social responsibility and human compassion.`,
      verses: ['Genesis 4:1-16', 'Hebrews 11:4', '1 John 3:12']
    },
    'Abel': {
      name: 'Abel - The First Martyr',
      image: require('../assets/abel.png'),
      story: `Abel is Adam and Eve's second son, whose name means "breath" or "vapor" (Genesis 4). He became a shepherd and brought God an offering of the fat portions from the firstborn of his flock. God looked favorably on Abel and his offering, which sparked his brother Cain's deadly jealousy.

Abel speaks no recorded words in Scripture. When Cain invited him to the field, Abel went unsuspectingly and was murdered there. His death made him the first martyr - an innocent person killed for his righteousness. God told Cain that Abel's blood was crying out from the ground for justice.

Though Abel died childless and young, his legacy lived on. Jesus called him "righteous Abel" and placed him first in the line of righteous people who suffered persecution. The Book of Hebrews honors Abel as the first person in its "hall of faith," saying that "by faith Abel still speaks, even though he is dead."`,
      themes: [
        'True Worship: Abel exemplifies genuine faith-based worship, offering his best to God with a sincere heart',
        'Innocent Suffering: As the first martyr, Abel represents all righteous people who suffer for their faith',
        'Blood that Speaks: Abel\'s spilled blood crying for justice contrasts with Christ\'s blood, which speaks for mercy and forgiveness',
        'Faith\'s Testimony: Though Abel died young, his faith continues to teach and inspire others'
      ],
      culturalImpact: `Abel appears in Christian art as a shepherd with a lamb, often symbolizing Christ the Good Shepherd. His story represents the triumph of faith over worldly success and the eternal significance of righteousness. The concept of Abel as the first martyr connects him to all later martyrs and saints who died for their beliefs.`,
      verses: ['Genesis 4:2-10', 'Matthew 23:35', 'Hebrews 11:4', 'Hebrews 12:24']
    }
  };

  const characterGroups = [
    {
      id: 'adam-eve',
      title: 'Garden of Eden & First Generations',
      icon: '🌱',
      characters: ['Adam', 'Eve', 'Cain', 'Abel', 'Seth', 'Enosh', 'Kenan', 'Mahalalel', 'Jared', 'Enoch', 'Methuselah', 'Lamech', 'Noah']
    },
    {
      id: 'noah',
      title: "Noah's Ark & The Great Flood",
      icon: '🚢',
      characters: ['Noah', "Noah's Wife", 'Shem', 'Ham', 'Japheth', 'Nimrod']
    },
    {
      id: 'abraham',
      title: 'Abraham: Father of Faith',
      icon: '⭐',
      characters: ['Abraham', 'Sarah', 'Hagar', 'Isaac', 'Ishmael', 'Lot', "Lot's Wife", "Lot's Daughters", 'Eliezer of Damascus', 'Melchizedek', 'King Abimelech', 'Phicol']
    },
    {
      id: 'isaac',
      title: 'Isaac: The Promised Son',
      icon: '🔥',
      characters: ['Isaac', 'Rebekah', 'Esau', 'Jacob', 'Bethuel', 'Laban']
    },
    {
      id: 'jacob-israel',
      title: 'Jacob & The Twelve Tribes',
      icon: '🏺',
      characters: ['Jacob', 'Leah', 'Rachel', 'Bilhah', 'Zilpah', 'Reuben', 'Simeon', 'Levi', 'Judah', 'Dan', 'Naphtali', 'Gad', 'Asher', 'Issachar', 'Zebulun', 'Dinah', 'Joseph', 'Benjamin']
    },
    {
      id: 'joseph',
      title: 'Joseph: Dreams & Egypt',
      icon: '👑',
      characters: ['Joseph', 'Jacob', 'Rachel', 'Pharaoh', 'Potiphar', "Potiphar's Wife", 'Chief Cupbearer', 'Chief Baker', 'Manasseh', 'Ephraim', 'Asenath', 'Simeon', 'Judah', 'Reuben', 'Benjamin']
    },
    {
      id: 'job',
      title: 'Job: Faith Through Suffering',
      icon: '💪',
      characters: ['Job', 'Eliphaz', 'Bildad', 'Zophar', 'Elihu', "Job's Wife"]
    },
    {
      id: 'moses',
      title: 'Moses & The Exodus',
      icon: '📜',
      characters: ['Moses', 'Aaron', 'Miriam', 'Pharaoh', "Pharaoh's Daughter", 'Jethro (Reuel)', 'Zipporah', 'Gershom', 'Eliezer (son of Moses)', 'Joshua', 'Caleb', 'Hur', 'Bezalel', 'Oholiab', 'Korah', 'Dathan', 'Abiram', 'Nadab', 'Abihu', 'Eleazar', 'Ithamar', 'Balaam', 'Balak', 'Hobab', 'Amalek', "Joshua's Aides", 'Elders of Israel']
    },
    {
      id: 'levitical-priests',
      title: 'Temple Priests & Sacred Service',
      icon: '🕯️',
      characters: ['Aaron', 'Eleazar', 'Ithamar', 'Phinehas', 'Elazar (son of Aaron)', 'Eli', 'Hophni', 'Phinehas (son of Eli)', 'Abiathar', 'Zadok', 'Ahimelech', 'Jehoiada', 'Zechariah (son of Jehoiada)', 'Azariah', 'Hilkiah', 'Seraiah', 'Ezra']
    },
    {
      id: 'wilderness-conquest',
      title: 'Conquering the Promised Land',
      icon: '⚔️',
      characters: ['Joshua', 'Caleb', 'Rahab', 'Achar (Achan)', 'Eleazar', 'Phinehas', "Zilpah's Descendants", 'Gibeonites', 'Othniel']
    },
    {
      id: 'judges',
      title: 'Heroes & Judges of Israel',
      icon: '⚖️',
      characters: ['Othniel', 'Ehud', 'Shamgar', 'Deborah', 'Barak', 'Jael', 'Sisera', 'Gideon', 'Jerubbaal', 'Abimelech', 'Tola', 'Jair', 'Jephthah', 'Ibzan', 'Elon', 'Abdon', 'Samson', 'Delilah', 'Manoah', 'Philistine Lords', 'Micah of Ephraim', 'Levite of Micah', 'Danites']
    },
    {
      id: 'ruth',
      title: 'Ruth: Love & Loyalty',
      icon: '🌾',
      characters: ['Ruth', 'Naomi', 'Boaz', 'Orpah', 'Obed']
    },
    {
      id: 'samuel-saul',
      title: 'Samuel & The First King',
      icon: '👑',
      characters: ['Samuel', 'Hannah', 'Elkanah', 'Eli', 'Hophni', 'Phinehas', 'Ichabod', 'Saul', 'Jonathan', 'Michal', 'Merab', 'Agag', 'Doeg the Edomite', 'Abner', 'Kish', 'Ahimelech']
    },
    {
      id: 'david',
      title: 'David: Giant Slayer & King',
      icon: '🎵',
      characters: ['David', 'Goliath', 'Saul', 'Jonathan', 'Michal', 'Abigail', 'Bathsheba', 'Uriah', 'Joab', 'Abner', 'Ish-bosheth', 'Mephibosheth', 'Nathan', 'Gad', 'Zadok', 'Abiathar', 'Shimei', 'Hushai', 'Ahithophel', 'Ittai', 'Amnon', 'Tamar (daughter of David)', 'Absalom', 'Adonijah', 'Solomon', 'Benaiah', 'Zeruiah', 'Asahel']
    },
    {
      id: 'solomon',
      title: 'Solomon: Wisdom & Glory',
      icon: '🏛️',
      characters: ['Solomon', 'Bathsheba', 'Nathan', 'Zadok', 'Adonijah', 'Abiathar', 'Benaiah', 'Queen of Sheba', 'Hiram of Tyre', 'Rehoboam', 'Jeroboam', "Pharaoh's Daughter"]
    },
    {
      id: 'elijah-elisha',
      title: 'Elijah & Elisha: Fire Prophets',
      icon: '🔥',
      characters: ['Elijah', 'Elisha', 'Gehazi', 'Ahab', 'Jezebel', 'Omri', 'Ahaziah of Israel', 'Jehoram (Joram) of Israel', 'Naboth', 'Obadiah (court official)', 'Ben-hadad', 'Hazael', 'Naaman', 'The Shunammite Woman', 'Jehu', 'Jehoahaz', 'Jehoash (Joash) of Israel', 'Jonah (son of Amittai)']
    },
    {
      id: 'kings-israel-north',
      title: 'Northern Kingdom: Israel',
      icon: '👑',
      characters: ['Jeroboam (son of Nebat)', 'Nadab', 'Baasha', 'Elah', 'Zimri', 'Omri', 'Ahab', 'Ahaziah', 'Jehoram (Joram)', 'Jehu', 'Jehoahaz', 'Jehoash', 'Jeroboam II', 'Zechariah', 'Shallum', 'Menahem', 'Pekahiah', 'Pekah', 'Hoshea']
    },
    {
      id: 'kings-judah-south',
      title: 'Southern Kingdom: Judah',
      icon: '🏰',
      characters: ['Rehoboam', 'Abijah', 'Asa', 'Jehoshaphat', 'Jehoram', 'Ahaziah', 'Athaliah', 'Joash (Jehoash)', 'Amaziah', 'Uzziah (Azariah)', 'Jotham', 'Ahaz', 'Hezekiah', 'Manasseh', 'Amon', 'Josiah', 'Jehoahaz (Shallum)', 'Jehoiakim', 'Jehoiachin (Jeconiah)', 'Zedekiah']
    },
    {
      id: 'prophets-around-kings',
      title: 'Prophets: God\'s Messengers',
      icon: '📢',
      characters: ['Ahijah the Shilonite', 'Shemaiah', 'Iddo', 'Jehu (son of Hanani)', 'Hanani', 'Azariah (son of Oded)', 'Oded', 'Micah (son of Imlah)', 'Huldah', 'Isaiah', 'Micah of Moreshah', 'Jeremiah', 'Uriah (son of Shemaiah)', 'Baruch', 'Zephaniah', 'Nahum', 'Habakkuk', 'Joel', 'Amos', 'Hosea', 'Obadiah', 'Jonah', 'Zechariah', 'Haggai', 'Malachi', 'Gad', 'Nathan']
    },
    {
      id: 'assyria-babylon-persia',
      title: 'Ancient Empires & Rulers',
      icon: '🏺',
      characters: ['Shalmaneser V', 'Sargon II', 'Sennacherib', 'Esarhaddon', 'Nebuchadnezzar II', 'Evil-merodach', 'Belshazzar', 'Darius the Mede', 'Cyrus the Great', 'Cambyses', 'Darius I', 'Xerxes (Ahasuerus)', 'Artaxerxes']
    },
    {
      id: 'exile-return',
      title: 'Babylon Exile & Homecoming',
      icon: '🏠',
      characters: ['Daniel', 'Hananiah (Shadrach)', 'Mishael (Meshach)', 'Azariah (Abednego)', 'Arioch', 'Darius the Mede', 'Cyrus', 'Belshazzar', 'Zerubbabel', 'Jeshua (Jozadak)', 'Ezra', 'Nehemiah', 'Sheshbazzar', 'Sanballat', 'Tobiah', 'Geshem the Arab', 'Haggai', 'Zechariah']
    },
    {
      id: 'esther',
      title: 'Esther: Queen of Courage',
      icon: '👸',
      characters: ['Esther (Hadassah)', 'Mordecai', 'King Ahasuerus (Xerxes)', 'Haman', 'Vashti', 'Zeresh']
    },
    {
      id: 'wisdom-poetry',
      title: 'Psalms, Proverbs & Poetry',
      icon: '📝',
      characters: ['Job', 'Eliphaz', 'Bildad', 'Zophar', 'Elihu', 'David', 'Asaph', 'Sons of Korah', 'Heman', 'Ethan', 'Solomon', 'Agur', 'Lemuel']
    },
    {
      id: 'john-baptist',
      title: 'John the Baptist: Voice in Wilderness',
      icon: '🌊',
      characters: ['John the Baptist', 'Zechariah', 'Elizabeth', 'Herod Antipas', 'Herodias', "Herodias' Daughter"]
    },
    {
      id: 'herodian-family',
      title: 'Herod Dynasty & Roman Rule',
      icon: '🏛️',
      characters: ['Herod the Great', 'Archelaus', 'Herod Antipas', 'Herod Philip the Tetrarch', 'Herod Agrippa I', 'Herod Agrippa II', 'Bernice', 'Drusilla', 'Salome']
    },
    {
      id: 'jesus',
      title: 'Jesus: The Messiah',
      icon: '✝️',
      characters: ['Jesus', 'Mary (mother of Jesus)', 'Joseph', 'Zechariah', 'Elizabeth', 'Simeon', 'Anna', 'Magi', 'Shepherds', 'John the Baptist', 'Peter', 'Andrew', 'James (son of Zebedee)', 'John (son of Zebedee)', 'Philip', 'Bartholomew', 'Thomas', 'Matthew', 'James (son of Alphaeus)', 'Thaddaeus (Jude)', 'Simon the Zealot', 'Judas Iscariot', 'Mary Magdalene', 'Joanna', 'Susanna', 'Salome', 'Martha', 'Mary of Bethany', 'Lazarus', 'Zacchaeus', 'Jairus', 'Bartimaeus', 'Joseph of Arimathea', 'Nicodemus', 'Caiaphas', 'Annas', 'Pontius Pilate', 'Barabbas', 'Herod Antipas', 'Centurion at Capernaum', 'Centurion at the Cross', 'Cleopas']
    },
    {
      id: 'twelve-apostles',
      title: 'The Twelve Disciples',
      icon: '👥',
      characters: ['Peter', 'Andrew', 'James (son of Zebedee)', 'John', 'Philip', 'Bartholomew', 'Thomas', 'Matthew (Levi)', 'James (son of Alphaeus)', 'Thaddaeus (Jude)', 'Simon the Zealot', 'Judas Iscariot', 'Matthias']
    },
    {
      id: 'opponents-groups',
      title: 'Religious Leaders & Groups',
      icon: '⚡',
      characters: ['Pharisees', 'Sadducees', 'Scribes', 'Chief Priests', 'Herodians', 'Zealots', 'Samaritan Villagers']
    },
    {
      id: 'early-church-deacons',
      title: 'Early Church Leaders',
      icon: '⛪',
      characters: ['Stephen', 'Philip the Evangelist', 'Prochorus', 'Nicanor', 'Timon', 'Parmenas', 'Nicholas of Antioch', "James (the Lord's Brother)", 'Barnabas', 'John Mark', 'Silas', 'Timothy', 'Titus', 'Apollos']
    },
    {
      id: 'acts-notable',
      title: 'Acts: Church Expansion',
      icon: '🌟',
      characters: ['Cornelius', 'Tabitha (Dorcas)', 'Simon the Tanner', 'Ananias of Damascus', 'Sapphira', 'Gamaliel', 'Rhoda', 'Agabus', 'Sergius Paulus', 'Elymas (Bar-Jesus)', 'Lydia', 'The Philippian Jailer', 'Damsel with Spirit of Divination', 'Eutychus', 'Crispus', 'Gallio', 'Demetrius the Silversmith', 'Eutychus']
    },
    {
      id: 'paul-coworkers',
      title: 'Paul\'s Ministry Team',
      icon: '✉️',
      characters: ['Luke', 'Priscilla', 'Aquila', 'Phoebe', 'Junia', 'Andronicus', 'Urbanus', 'Apelles', 'Herodion', 'Rufus and his Mother', 'Tryphena', 'Tryphosa', 'Persis', 'Aristarchus', 'Epaphras', 'Epaphroditus', 'Onesimus', 'Philemon', 'Archippus', 'Onesiphorus', 'Demas', 'Mark (John Mark)', 'Crescent', 'Carpus', 'Erastus', 'Trophimus', 'Tychicus', 'Tertius', 'Quartus', 'Gaius', 'Sopater', 'Secundus', 'Timothy', 'Titus', 'Silvanus', 'Chloe', 'Stephanas', 'Sosthenes', 'Crispus', 'Nympha', 'Diotrephes', 'Demetrius of Third John', 'Alexander the Coppersmith']
    },
    {
      id: 'general-epistles',
      title: 'Letters to the Churches',
      icon: '📜',
      characters: ['James', 'Jude', 'Peter', 'John', 'Gaius', 'The Elect Lady', 'Elders and Overseers', 'Deacons', 'Widows']
    },
    {
      id: 'revelation',
      title: 'Revelation: End Times Vision',
      icon: '🌅',
      characters: ['John of Patmos', 'The Seven Churches (Ephesus, Smyrna, Pergamum, Thyatira, Sardis, Philadelphia, Laodicea)', 'The Two Witnesses', 'Twenty-Four Elders', 'Four Living Creatures', 'The Archangel Michael']
    },
    {
      id: 'angels-spiritual',
      title: 'Angels & Spiritual Beings',
      icon: '👼',
      characters: ['Michael', 'Gabriel', 'Cherubim', 'Seraphim', 'Angels of the Churches', 'Satan (The Adversary)', 'The Devil', 'The Accuser', 'Evil Spirits', 'Legion']
    },
    {
      id: 'women-bible',
      title: 'Women of Faith & Courage',
      icon: '👩',
      characters: ['Sarah', 'Rebekah', 'Leah', 'Rachel', 'Bilhah', 'Zilpah', 'Miriam', 'Deborah', 'Jael', 'Ruth', 'Naomi', 'Hannah', 'Abigail', 'Michal', 'Bathsheba', 'Tamar (daughter-in-law of Judah)', 'Tamar (daughter of David)', 'Athaliah', 'Jezebel', 'Huldah', 'Esther', 'Vashti', 'Widow of Zarephath', 'Shunammite Woman', 'Rahab', 'Delilah', 'Queen of Sheba', 'Mary (mother of Jesus)', 'Elizabeth', 'Mary Magdalene', 'Salome', 'Joanna', 'Susanna', 'Martha', 'Mary of Bethany', 'Priscilla', 'Tabitha (Dorcas)', 'Rhoda', 'Lydia', 'Damaris', 'Phoebe', 'Eunice', 'Lois']
    },
    {
      id: 'foreign-nations',
      title: 'Enemy Nations & Conflicts',
      icon: '🗡️',
      characters: ['Amalek and Agag', 'Philistines and Goliath', 'Moab and Balak', 'Ammon', 'Edom', 'Aram (Syria) and Ben-hadad', 'Assyria and Sennacherib', 'Babylon and Nebuchadnezzar', 'Persia and Haman', 'Samaria Opponents (Sanballat, Tobiah, Geshem)']
    },
    {
      id: 'additional-named',
      title: 'Other Notable Figures',
      icon: '📋',
      characters: ['Jabez', 'Boaz', 'Elkanah', 'Obed', 'Oholah and Oholibah', 'Uriah the Prophet', 'Shebna', 'Eliakim', 'Rabshakeh', 'Pashhur', 'Gedaliah', 'Ebed-melech', 'Baruch (son of Neriah)', 'Saphan (Shaphan)', 'Ahikam', 'Gemariah', 'Micaiah (son of Gemariah)', 'Pelatiah', 'Jazaniah', 'Jaazaniah', 'Ishmael (son of Nethaniah)']
    }
  ];

  const handleSectionPress = (sectionId) => {
    hapticFeedback.light();
    
    // Open modal overlays instead of changing selectedSection
    switch (sectionId) {
      case 'timeline':
        setShowTimelineModal(true);
        break;
      case 'characters':
        setShowCharactersModal(true);
        break;
      case 'maps':
        setShowMapsModal(true);
        break;
      case 'verses':
        setShowKeyVersesModal(true);
        break;
      case 'facts':
        setShowFactsModal(true);
        break;
      case 'themes':
        setShowThemesModal(true);
        break;
      case 'reading':
        setShowReadingModal(true);
        break;
      case 'parallels':
        setShowParallelsModal(true);
        break;
      case 'audio':
        setShowAudioModal(true);
        break;
      default:
        // Fallback to old behavior for any unhandled sections
        setSelectedSection(sectionId);
    }
  };

  const renderMainMenu = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          {/* Title text removed but container kept for spacing */}
        </View>

      <View style={styles.sectionsGrid}>
        {studySections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionCard, { backgroundColor: theme.card }]}
            onPress={() => handleSectionPress(section.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[`${section.color}20`, `${section.color}10`]}
              style={styles.sectionGradient}
            >
              <View style={[styles.sectionIconContainer, { backgroundColor: `${section.color}20` }]}>
                <MaterialIcons name={section.icon} size={28} color={section.color} />
              </View>
              
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                  {section.description}
                </Text>
                
                <View style={styles.featuresContainer}>
                  {section.features.slice(0, 2).map((feature, idx) => (
                    <View key={idx} style={styles.featureTag}>
                      <Text style={[styles.featureText, { color: section.color }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coming Soon message removed - features are now available */}
    </ScrollView>
  );

  // Create modal overlay for each section (keeping all existing content)
  const renderSectionModalOverlay = (sectionId, showModal, setShowModal) => {
    const section = studySections.find(s => s.id === sectionId);
    if (!section) return null;

    return (
      <Modal visible={showModal} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} hidden={false} />
          <View style={{ height: 60, backgroundColor: theme.surface }} />
          <SafeAreaView style={{ backgroundColor: theme.surface }} edges={['top']}>
            <View style={[styles.solidHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.solidHeaderButton}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
              <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>{section.title}</Text>
              <View style={{ width: 48 }} />
          </View>
          </SafeAreaView>
          <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: 0 }}>

          {/* Special handling for characters section */}
          {sectionId === 'characters' && renderCharactersSection(section)}
          
          {/* Render actual content for each section */}
          {sectionId === 'timeline' && <BibleTimeline />}
          {sectionId === 'maps' && <InteractiveBibleMaps />}
          {sectionId === 'themes' && <ThematicGuides />}
          {sectionId === 'verses' && <KeyVerses />}
          
          {/* For other sections, show basic content instead of "Coming Soon" */}
          {!['characters', 'timeline', 'maps', 'themes', 'verses'].includes(sectionId) && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.comingSoonContainer}>
                <BlurView intensity={20} style={styles.comingSoonCard}>
                  <MaterialIcons name={section.icon} size={32} color={section.color} />
                  <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
                    {section.title}
                  </Text>
                  <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                    This feature is available! Explore the {section.title.toLowerCase()} section.
                  </Text>
                </BlurView>
              </View>
            </ScrollView>
          )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderSectionDetail = () => {
    const section = studySections.find(s => s.id === selectedSection);
    if (!section) return null;

    // Special handling for characters section
    if (selectedSection === 'characters') {
      return renderCharactersSection(section);
    }

    // Special handling for timeline section
    if (selectedSection === 'timeline') {
      return (
        <BibleTimeline
          visible={true}
          onClose={() => setSelectedSection('main')}
          onNavigateToVerse={(verse) => {
            // Future: Navigate to Bible verse
            console.log('Navigate to verse:', verse);
          }}
        />
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedSection('main');
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.detailTitleContainer}>
            <View style={[styles.detailIcon, { backgroundColor: `${section.color}20` }]}>
              <MaterialIcons name={section.icon} size={32} color={section.color} />
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
              {section.description}
            </Text>
          </View>
        </View>

        <View style={styles.comingSoonContainer}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <MaterialIcons name="build" size={32} color={section.color} />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              {section.title} - In Development
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              This section will include:
            </Text>
            
            <View style={styles.featuresList}>
              {section.features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={16} color={section.color} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </BlurView>
        </View>
      </ScrollView>
    );
  };

  const renderCharactersSection = (section) => {
    if (selectedCharacter) {
      return renderCharacterDetail();
    }
    
    if (selectedCharacterGroup) {
      return renderCharacterGroupDetail();
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <LinearGradient
            colors={[`${section.color}20`, `${section.color}05`, 'transparent']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                Biblical Characters
            </Text>
              <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                Discover the lives and stories of key figures in the Bible
            </Text>
          </View>
          </LinearGradient>
        </View>

        {/* Alternating Character Group Cards */}
        <View style={styles.alternatingCharacterGroupsContainer}>
          {characterGroups.map((group, index) => {
            const isEven = index % 2 === 0;
            const gradientColors = isDark ? 
              [`${section.color}20`, `${section.color}12`, `${section.color}05`] :
              [`${section.color}30`, `${section.color}20`, `${section.color}10`];
            
            return (
            <TouchableOpacity
              key={group.id}
                style={[styles.alternatingCharacterGroupCard, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.card,
                  shadowColor: section.color,
                  alignSelf: isEven ? 'flex-start' : 'flex-end',
                  marginLeft: isEven ? 0 : 40,
                  marginRight: isEven ? 40 : 0,
                }]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedCharacterGroup(group);
              }}
                activeOpacity={0.8}
            >
              <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.alternatingCardGradient}
                >
                  {/* Floating Icon */}
                  <View style={[styles.alternatingIconContainer, { 
                    backgroundColor: isDark ? `${section.color}25` : `${section.color}20`,
                    borderColor: isDark ? `${section.color}40` : `${section.color}35`
                  }]}>
                    <Text style={styles.alternatingCharacterGroupIcon}>{group.icon}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.alternatingCardContent}>
                    <Text style={[styles.alternatingCharacterGroupTitle, { color: theme.text }]}>
                    {group.title}
                  </Text>
                    
                    <View style={styles.alternatingStatsRow}>
                      <View style={[styles.alternatingCountBadge, { 
                        backgroundColor: isDark ? `${section.color}20` : `${section.color}25`
                      }]}>
                        <MaterialIcons name="people" size={12} color={section.color} />
                        <Text style={[styles.alternatingCountText, { color: section.color }]}>
                          {group.characters.length}
                  </Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.alternatingCharacterPreview, { color: theme.textSecondary }]}>
                      {group.characters.slice(0, 3).join(', ')}...
                  </Text>
                </View>

                  {/* Arrow with glow effect */}
                  <View style={[styles.alternatingArrowContainer, { 
                    backgroundColor: isDark ? `${section.color}15` : `${section.color}20`
                  }]}>
                    <MaterialIcons name="arrow-forward-ios" size={14} color={section.color} />
                  </View>

                  {/* Decorative elements */}
                  <View style={[styles.alternatingDecorativeCircle1, { backgroundColor: `${section.color}08` }]} />
                  <View style={[styles.alternatingDecorativeCircle2, { backgroundColor: `${section.color}05` }]} />
              </LinearGradient>
            </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderCharacterGroupDetail = () => {
    const group = selectedCharacterGroup;
    const section = studySections.find(s => s.id === 'characters');

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Modern Header with Back Button */}
        <View style={styles.modernGroupHeader}>
          <TouchableOpacity 
            style={styles.modernGroupBackButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCharacterGroup(null);
            }}
          >
            <View style={[styles.backButtonCircle, { backgroundColor: `${section.color}15` }]}>
              <MaterialIcons name="arrow-back" size={20} color={section.color} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Modern Hero Section for Group */}
        <View style={styles.modernGroupHeroSection}>
          <View style={[styles.groupHeroCard, { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            shadowColor: isDark ? '#000' : section.color,
          }]}>
            <LinearGradient
              colors={[
                `${section.color}15`, 
                `${section.color}08`, 
                'transparent'
              ]}
              style={styles.groupHeroGradient}
            >
              {/* Group Icon */}
              <View style={[styles.modernGroupIconContainer, { backgroundColor: `${section.color}20` }]}>
                <Text style={styles.modernGroupIcon}>{group.icon}</Text>
              </View>
              
              {/* Group Title and Description */}
              <View style={styles.modernGroupTitleContainer}>
                <Text style={[styles.modernGroupTitle, { 
                  color: theme.text,
                  fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System'
                }]}>
              {group.title}
            </Text>
                <View style={[styles.groupSubtitleContainer, { backgroundColor: `${section.color}12` }]}>
                  <MaterialIcons name="people" size={16} color={section.color} />
                  <Text style={[styles.modernGroupSubtitle, { 
                    color: section.color,
                    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System'
                  }]}>
                    {group.characters.length} Biblical Characters
            </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Alternating Character List */}
        <View style={styles.alternatingCharacterListContainer}>
          {group.characters.map((character, index) => {
            const isAvailable = characterProfiles[character];
            const isEven = index % 2 === 0;
            
            return (
            <TouchableOpacity
              key={index}
                style={[styles.alternatingCharacterCard, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.card,
                  shadowColor: isAvailable ? section.color : theme.textTertiary,
                  alignSelf: isEven ? 'flex-start' : 'flex-end',
                  marginLeft: isEven ? 0 : 60,
                  marginRight: isEven ? 60 : 0,
                }]}
              onPress={() => {
                hapticFeedback.light();
                  if (isAvailable) {
                  setSelectedCharacter(character);
                }
              }}
                activeOpacity={0.8}
            >
              <LinearGradient
                  colors={isAvailable ? 
                    [`${section.color}18`, `${section.color}10`, 'transparent'] :
                    [isDark ? 'rgba(255,255,255,0.08)' : 'rgba(128,128,128,0.08)', 'transparent', 'transparent']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.alternatingCharacterCardGradient}
                >
                  {/* Character Avatar */}
                  <View style={[styles.alternatingCharacterAvatarContainer, { 
                    backgroundColor: isAvailable ? `${section.color}20` : `${theme.textTertiary}15`,
                    borderColor: isAvailable ? `${section.color}30` : `${theme.textTertiary}25`,
                  }]}>
                    {isAvailable ? (
                      <MaterialIcons name="person" size={16} color={section.color} />
                    ) : (
                      <MaterialIcons name="person-outline" size={16} color={theme.textTertiary} />
                    )}
                  </View>

                  {/* Character Info */}
                  <Text style={[styles.alternatingCharacterName, { 
                    color: theme.text,
                    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
                  }]}>
                  {character}
                </Text>
                  
                  {/* Compact Status Badge */}
                  <View style={[styles.alternatingCharacterStatusBadge, { 
                    backgroundColor: isAvailable ? `${section.color}15` : `${theme.textTertiary}12`
                  }]}>
                    {isAvailable ? (
                      <View style={[styles.alternatingCharacterPulseDot, { backgroundColor: section.color }]} />
                    ) : (
                      <MaterialIcons name="schedule" size={8} color={theme.textTertiary} />
                    )}
        </View>

                  {/* Interactive Arrow */}
                  {isAvailable && (
                    <View style={styles.alternatingCharacterArrowContainer}>
                      <MaterialIcons name="chevron-right" size={14} color={section.color} />
                    </View>
                  )}
              </LinearGradient>
            </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCharacterDetail = () => {
    const character = characterProfiles[selectedCharacter];
    const section = studySections.find(s => s.id === 'characters');

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Professional Header with Back Button */}
        <View style={styles.professionalHeader}>
          <TouchableOpacity 
            style={styles.modernBackButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCharacter(null);
            }}
          >
            <View style={[styles.backButtonCircle, { backgroundColor: `${section.color}15` }]}>
              <MaterialIcons name="arrow-back" size={20} color={section.color} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Epic Hero Section with Dynamic Background */}
        <View style={[styles.epicHeroSection, { backgroundColor: `${section.color}05` }]}>
          <LinearGradient
            colors={[
              `${section.color}25`, 
              `${section.color}15`, 
              `${section.color}08`,
              'transparent'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.epicHeroGradient}
          >
            {/* Floating Background Elements */}
            <View style={[styles.floatingElement1, { backgroundColor: `${section.color}08` }]} />
            <View style={[styles.floatingElement2, { backgroundColor: `${section.color}05` }]} />
            <View style={[styles.floatingElement3, { backgroundColor: `${section.color}03` }]} />
            
            {/* Stunning Profile Image with Glow */}
            {character.image && (
              <View style={styles.epicImageContainer}>
                <View style={[styles.imageGlowRing, { 
                  backgroundColor: `${section.color}15`,
                  shadowColor: section.color,
                }]}>
                  <View style={[styles.imageOuterRing, { borderColor: `${section.color}30` }]}>
                    <View style={[styles.imageInnerRing, { borderColor: `${section.color}50` }]}>
                    <Image
                      source={character.image}
                        style={styles.epicHeroImage}
                      resizeMode="cover"
                    />
                      <View style={[styles.imageOverlay, { backgroundColor: `${section.color}10` }]} />
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {/* Dynamic Typography with Animations */}
            <View style={styles.epicNameContainer}>
              <View style={[styles.titleAccent, { backgroundColor: section.color }]} />
              <Text style={[styles.epicCharacterTitle, { 
                color: theme.text,
                fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
                fontWeight: '700'
              }]}>
                {character.name.split(' - ')[0]}
              </Text>
              <Text style={[styles.epicCharacterSubtitle, { 
                color: section.color,
                fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
                fontWeight: '500'
              }]}>
                {character.name.split(' - ')[1]}
              </Text>
              <View style={[styles.titleAccent, { backgroundColor: section.color }]} />
            </View>

            {/* Floating Info Badges */}
            <View style={styles.infoBadgesContainer}>
              <View style={[styles.infoBadge, { 
                backgroundColor: `${section.color}15`,
                borderColor: `${section.color}25`
              }]}>
                <MaterialIcons name="auto-stories" size={16} color={section.color} />
                <Text style={[styles.badgeText, { color: section.color }]}>Biblical Figure</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Story Card - Magazine Style */}
        <View style={styles.cardContainer}>
          <View style={[styles.storyCard, { backgroundColor: theme.card, shadowColor: section.color, borderColor: `${section.color}20`, borderWidth: 1 }]}>
            <LinearGradient
              colors={[`${section.color}12`, `${section.color}06`, 'transparent']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${section.color}15` }]}>
                  <MaterialIcons name="auto-stories" size={24} color={section.color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Biblical Story
                </Text>
              </View>
              
              <Text 
                style={[styles.storyText, { color: theme.text }]}
                selectable={true}
                selectTextOnFocus={false}
                dataDetectorType="none"
                allowFontScaling={true}
              >
                {character.story}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Themes Card - Beautiful Grid */}
        <View style={styles.cardContainer}>
          <View style={[styles.themesCard, { backgroundColor: theme.card, shadowColor: section.color, borderColor: `${section.color}20`, borderWidth: 1 }]}>
            <LinearGradient
              colors={[`${section.color}12`, `${section.color}06`, 'transparent']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${section.color}15` }]}>
                  <MaterialIcons name="psychology" size={24} color={section.color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Key Themes
                </Text>
              </View>
              
              <View style={styles.themesGrid}>
                {character.themes.map((themeText, index) => (
                  <View key={index} style={[styles.themeCard, { backgroundColor: `${section.color}15`, borderColor: `${section.color}30`, borderWidth: 1 }]}>
                    <View style={[styles.themeIndicator, { backgroundColor: section.color }]} />
                    <Text 
                      style={[styles.themeCardText, { color: theme.text }]}
                      selectable={true}
                      selectTextOnFocus={false}
                      dataDetectorType="none"
                      allowFontScaling={true}
                    >
                      {themeText}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Cultural Impact Card */}
        <View style={styles.cardContainer}>
          <View style={[styles.culturalCard, { backgroundColor: theme.card, shadowColor: section.color, borderColor: `${section.color}20`, borderWidth: 1 }]}>
            <LinearGradient
              colors={[`${section.color}12`, `${section.color}06`, 'transparent']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${section.color}15` }]}>
                  <MaterialIcons name="palette" size={24} color={section.color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Cultural Impact
                </Text>
              </View>
              
              <Text 
                style={[styles.culturalText, { color: theme.text }]}
                selectable={true}
                selectTextOnFocus={false}
                dataDetectorType="none"
                allowFontScaling={true}
              >
                {character.culturalImpact}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Key Verses Card - Elegant Chips */}
        <View style={styles.cardContainer}>
          <View style={[styles.versesCard, { backgroundColor: theme.card, shadowColor: section.color, borderColor: `${section.color}20`, borderWidth: 1 }]}>
            <LinearGradient
              colors={[`${section.color}12`, `${section.color}06`, 'transparent']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${section.color}15` }]}>
                  <MaterialIcons name="menu-book" size={24} color={section.color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Key Verses
                </Text>
              </View>
              
              <View style={styles.versesGrid}>
                {character.verses.map((verse, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.verseChip, { backgroundColor: `${section.color}12`, borderColor: `${section.color}30` }]}
                    onPress={() => {
                      hapticFeedback.light();
                      // Future: Navigate to Bible verse
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="bookmark" size={16} color={section.color} />
                    <Text style={[styles.verseChipText, { color: section.color }]}>
                      {verse}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={() => {}} // Disable pull-down-to-close gesture
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={{ backgroundColor: theme.background }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Study</Text>
          <View style={{ width: 24 }} />
        </View>
        </SafeAreaView>

        <View style={{ flex: 1, backgroundColor: theme.background }}>
        {selectedSection === 'main' ? renderMainMenu() : renderSectionDetail()}
        </View>
      </View>

      {/* Timeline Modal Overlay */}
      <BibleTimeline
        visible={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        onNavigateToVerse={(verse) => {
          console.log('Navigate to verse:', verse);
        }}
      />

      {/* Interactive Bible Maps */}
      <InteractiveBibleMaps
        visible={showMapsModal}
        onClose={() => setShowMapsModal(false)}
      />

      {/* Thematic Guides - Custom Component */}
      <ThematicGuides
        visible={showThemesModal}
        onClose={() => setShowThemesModal(false)}
        onNavigateToVerse={(verse) => {
          // Handle verse navigation if needed
          console.log('Navigate to verse:', verse);
        }}
      />

      {/* Key Verses - Custom Component */}
      <KeyVerses
        visible={showKeyVersesModal}
        onClose={() => setShowKeyVersesModal(false)}
      />

      {/* All Other Section Modal Overlays */}
      {renderSectionModalOverlay('characters', showCharactersModal, setShowCharactersModal)}
      {renderSectionModalOverlay('facts', showFactsModal, setShowFactsModal)}
      {renderSectionModalOverlay('reading', showReadingModal, setShowReadingModal)}
      {renderSectionModalOverlay('parallels', showParallelsModal, setShowParallelsModal)}
      {renderSectionModalOverlay('audio', showAudioModal, setShowAudioModal)}
    </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  solidHeaderButton: {
    padding: 4,
    width: 48,
    alignItems: 'center',
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionsGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '500',
  },
  comingSoonContainer: {
    padding: 20,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailHeader: {
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  detailTitleContainer: {
    alignItems: 'center',
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  featureItemText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  // Character Groups Styles
  characterGroupsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  characterGroupCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  characterGroupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  characterGroupIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  characterGroupContent: {
    flex: 1,
  },
  characterGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  characterGroupCount: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  characterGroupPreview: {
    fontSize: 12,
    lineHeight: 16,
  },
  characterGroupDetailIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  // Character Cards Styles
  charactersGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  characterCard: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  characterCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  characterName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Available Profiles Styles
  availableProfilesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  availableProfilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  profilePreviewCard: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  profilePreviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  profilePreviewName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  // Character Detail Styles
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageGradient: {
    borderRadius: 80,
    padding: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  characterDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  characterSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  characterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  characterSectionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  themeItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  themeBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  themeText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  verseCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  verseText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Professional UI Styles
  professionalHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  modernBackButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 20,
  },
  heroGradient: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  imageRingInner: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroImage: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
  },
  imageGlow: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 77.5,
    opacity: 0.3,
  },
  nameContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  decorativeLine: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    marginVertical: 12,
  },
  characterHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  characterSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  storyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  themesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  culturalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  versesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  themesGrid: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  themeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 12,
  },
  themeCardText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  culturalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  versesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  verseChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // ===== MODERN CHARACTER GROUP STYLES =====
  
  // Modern Group Header
  modernGroupHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  modernGroupBackButton: {
    alignSelf: 'flex-start',
  },
  
  // Modern Group Hero Section
  modernGroupHeroSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  groupHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  groupHeroGradient: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modernGroupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modernGroupIcon: {
    fontSize: 36,
  },
  modernGroupTitleContainer: {
    alignItems: 'center',
    gap: 12,
  },
  modernGroupTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  groupSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  modernGroupSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Modern Character List
  modernCharacterListContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  modernCharacterItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  characterItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modernCharacterName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
  characterStatusContainer: {
    marginLeft: 12,
  },
  modernAvailableBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modernComingSoonBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassyHeader: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  glassyHeaderContent: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  glassyHeaderContentHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  glassyCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== NEW MODERN UI STYLES =====
  
  // Hero Header Styles
  heroHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Alternating Character Group Cards
  alternatingCharacterGroupsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  alternatingCharacterGroupCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    width: '75%',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  alternatingCardGradient: {
    padding: 20,
    minHeight: 120,
    position: 'relative',
  },
  alternatingIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  alternatingCharacterGroupIcon: {
    fontSize: 20,
  },
  alternatingCardContent: {
    flex: 1,
    paddingRight: 60,
  },
  alternatingCharacterGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  alternatingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternatingCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alternatingCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  alternatingCharacterPreview: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  alternatingArrowContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternatingDecorativeCircle1: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  alternatingDecorativeCircle2: {
    position: 'absolute',
    bottom: -12,
    left: 25,
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  // Alternating Character List
  alternatingCharacterListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  alternatingCharacterCard: {
    width: '70%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  alternatingCharacterCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 70,
    position: 'relative',
  },
  alternatingCharacterAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 12,
  },
  alternatingCharacterName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  alternatingCharacterStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 16,
    marginRight: 8,
  },
  alternatingCharacterPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  alternatingCharacterArrowContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Epic Character Profile Hero
  epicHeroSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 30,
    overflow: 'hidden',
    minHeight: 350,
  },
  epicHeroGradient: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 350,
    position: 'relative',
  },
  floatingElement1: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
  },
  floatingElement2: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  floatingElement3: {
    position: 'absolute',
    top: 60,
    right: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.15,
  },
  epicImageContainer: {
    marginBottom: 30,
  },
  imageGlowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 25,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  imageOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInnerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  epicHeroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  epicNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleAccent: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginVertical: 10,
  },
  epicCharacterTitle: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  epicCharacterSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  infoBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default BibleStudyModal;
