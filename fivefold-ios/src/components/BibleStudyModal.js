import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const BibleStudyModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedSection, setSelectedSection] = useState('main');
  const [selectedCharacterGroup, setSelectedCharacterGroup] = useState(null);

  const studySections = [
    {
      id: 'characters',
      title: 'Bible Characters',
      icon: 'people',
      description: 'Explore profiles of key Bible figures',
      color: '#FF6B6B',
      features: ['Character profiles', 'Family trees', 'Key events', 'Life lessons']
    },
    {
      id: 'timeline',
      title: 'Bible Timeline',
      icon: 'timeline',
      description: 'Journey through Biblical history',
      color: '#4ECDC4',
      features: ['Chronological events', 'Historical dates', 'Quick verse links', 'Era overview']
    },
    {
      id: 'maps',
      title: 'Interactive Maps',
      icon: 'map',
      description: 'Discover Biblical locations',
      color: '#45B7D1',
      features: ['Key locations', 'Journey routes', 'Historical context', 'Character connections']
    },
    {
      id: 'themes',
      title: 'Thematic Guides',
      icon: 'category',
      description: 'Study by topics and themes',
      color: '#96CEB4',
      features: ['Faith stories', 'Leadership lessons', 'Miracles', 'Prophecies']
    },
    {
      id: 'verses',
      title: 'Key Verses',
      icon: 'format_quote',
      description: 'Essential verses by topic',
      color: '#FECA57',
      features: ['Topical verses', 'Memory verses', 'Life guidance', 'Inspirational quotes']
    },
    {
      id: 'facts',
      title: 'Fast Facts',
      icon: 'lightbulb',
      description: 'Did you know? Bible trivia',
      color: '#FF9FF3',
      features: ['Amazing facts', 'Quick summaries', 'Fun trivia', 'Historical insights']
    },
    {
      id: 'reading',
      title: 'Reading Plans',
      icon: 'schedule',
      description: 'Chronological Bible reading',
      color: '#54A0FF',
      features: ['Historical order', 'Daily readings', 'Progress tracking', 'Guided study']
    },
    {
      id: 'parallels',
      title: 'Parallel Stories',
      icon: 'compare_arrows',
      description: 'Connected Old & New Testament',
      color: '#5F27CD',
      features: ['Story connections', 'Prophecy fulfillment', 'Type & antitype', 'Cross-references']
    },
    {
      id: 'audio',
      title: 'Audio Learning',
      icon: 'volume_up',
      description: 'Listen and learn',
      color: '#00D2D3',
      features: ['Name pronunciation', 'Story summaries', 'Audio guides', 'Listening plans']
    },
    {
      id: 'quiz',
      title: 'Quiz & Games',
      icon: 'quiz',
      description: 'Test your Bible knowledge',
      color: '#FF7675',
      features: ['Interactive quizzes', 'Memory games', 'Progress tracking', 'Achievement badges']
    },
    {
      id: 'culture',
      title: 'Daily Life Context',
      icon: 'home',
      description: 'Life in Biblical times',
      color: '#A29BFE',
      features: ['Ancient customs', 'Food & clothing', 'Social structure', 'Historical context']
    }
  ];

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
    setSelectedSection(sectionId);
  };

  const renderMainMenu = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>📚 Bible Study</Text>
        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
          Interactive learning tools to deepen your understanding
        </Text>
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

      <View style={styles.comingSoonContainer}>
        <BlurView intensity={20} style={styles.comingSoonCard}>
          <MaterialIcons name="construction" size={24} color={theme.warning} />
          <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
            Coming Soon!
          </Text>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            These amazing Bible study features are being built with love and care. 
            Stay tuned for an incredible learning experience!
          </Text>
        </BlurView>
      </View>
    </ScrollView>
  );

  const renderSectionDetail = () => {
    const section = studySections.find(s => s.id === selectedSection);
    if (!section) return null;

    // Special handling for characters section
    if (selectedSection === 'characters') {
      return renderCharactersSection(section);
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
    if (selectedCharacterGroup) {
      return renderCharacterGroupDetail();
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
              Bible Characters
            </Text>
            <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
              Explore Biblical figures organized by historical periods and relationships
            </Text>
          </View>
        </View>

        <View style={styles.characterGroupsContainer}>
          {characterGroups.map((group, index) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.characterGroupCard, { backgroundColor: theme.card }]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedCharacterGroup(group);
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[`${section.color}15`, `${section.color}05`]}
                style={styles.characterGroupGradient}
              >
                <Text style={styles.characterGroupIcon}>{group.icon}</Text>
                <View style={styles.characterGroupContent}>
                  <Text style={[styles.characterGroupTitle, { color: theme.text }]}>
                    {group.title}
                  </Text>
                  <Text style={[styles.characterGroupCount, { color: theme.textSecondary }]}>
                    {group.characters.length} characters
                  </Text>
                  <Text style={[styles.characterGroupPreview, { color: theme.textTertiary }]}>
                    {group.characters.slice(0, 3).join(', ')}
                    {group.characters.length > 3 && '...'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCharacterGroupDetail = () => {
    const group = selectedCharacterGroup;
    const section = studySections.find(s => s.id === 'characters');

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCharacterGroup(null);
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.detailTitleContainer}>
            <Text style={styles.characterGroupDetailIcon}>{group.icon}</Text>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {group.title}
            </Text>
            <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
              {group.characters.length} Biblical characters in this section
            </Text>
          </View>
        </View>

        <View style={styles.charactersGrid}>
          {group.characters.map((character, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.characterCard, { backgroundColor: theme.card }]}
              onPress={() => {
                hapticFeedback.light();
                // Future: Navigate to character detail
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[`${section.color}10`, 'transparent']}
                style={styles.characterCardGradient}
              >
                <Text style={[styles.characterName, { color: theme.text }]}>
                  {character}
                </Text>
                <MaterialIcons name="person" size={16} color={section.color} />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.comingSoonContainer}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <MaterialIcons name="construction" size={24} color={section.color} />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              Character Profiles Coming Soon!
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              Detailed profiles with life stories, key events, family trees, and Bible references are being prepared for each character.
            </Text>
          </BlurView>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Study</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedSection === 'main' ? renderMainMenu() : renderSectionDetail()}
      </SafeAreaView>
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
});

export default BibleStudyModal;
