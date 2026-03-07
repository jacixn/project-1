import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import hapticFeedback from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_LIVES = 6;

const WORDS = {
  Characters: [
    { word: 'MOSES', fact: 'Moses parted the Red Sea and received the Ten Commandments on Mount Sinai.' },
    { word: 'ABRAHAM', fact: 'Abraham is considered the father of many nations and was willing to sacrifice his son Isaac.' },
    { word: 'DAVID', fact: 'David defeated Goliath with a sling and a stone, and became the greatest king of Israel.' },
    { word: 'NOAH', fact: 'Noah built an ark to save his family and two of every animal from a great flood.' },
    { word: 'JOSEPH', fact: 'Joseph was sold into slavery by his brothers but rose to become the second most powerful man in Egypt.' },
    { word: 'SOLOMON', fact: 'Solomon was known as the wisest man who ever lived and built the first Temple in Jerusalem.' },
    { word: 'SAMUEL', fact: 'Samuel was dedicated to God before birth and became the last judge of Israel.' },
    { word: 'DANIEL', fact: 'Daniel was thrown into a den of lions but God shut their mouths and he survived.' },
    { word: 'ELIJAH', fact: 'Elijah called down fire from heaven on Mount Carmel and was taken to heaven in a chariot of fire.' },
    { word: 'RUTH', fact: 'Ruth was a Moabite woman whose loyalty to her mother-in-law Naomi became legendary.' },
    { word: 'ESTHER', fact: 'Esther became queen of Persia and saved the Jewish people from destruction.' },
    { word: 'JONAH', fact: 'Jonah was swallowed by a great fish after fleeing from God and spent three days inside.' },
    { word: 'PETER', fact: 'Peter was a fisherman who became the leader of the early church and walked on water briefly.' },
    { word: 'PAUL', fact: 'Paul started out persecuting Christians but had a dramatic conversion on the road to Damascus.' },
    { word: 'MARY', fact: 'Mary was chosen to be the mother of Jesus and is one of the most honoured women in history.' },
    { word: 'GIDEON', fact: 'Gideon defeated a vast Midianite army with just 300 men using torches and trumpets.' },
    { word: 'SAMSON', fact: 'Samson had supernatural strength tied to his uncut hair and brought down a Philistine temple.' },
    { word: 'SARAH', fact: 'Sarah gave birth to Isaac at the age of 90, fulfilling God\'s promise to Abraham.' },
    { word: 'JACOB', fact: 'Jacob wrestled with an angel and was renamed Israel, becoming the father of twelve tribes.' },
    { word: 'JOSHUA', fact: 'Joshua led the Israelites into the Promised Land and conquered the city of Jericho.' },
    { word: 'CALEB', fact: 'Caleb was one of only two spies who encouraged Israel to trust God and enter the Promised Land.' },
    { word: 'RAHAB', fact: 'Rahab hid the Israelite spies in Jericho and was spared when the city fell.' },
    { word: 'BARNABAS', fact: 'Barnabas was known as the Son of Encouragement and traveled with Paul on missionary journeys.' },
    { word: 'TIMOTHY', fact: 'Timothy was a young pastor mentored by Paul and received two letters of encouragement from him.' },
    { word: 'EZEKIEL', fact: 'Ezekiel had a vision of a valley of dry bones coming back to life, symbolising Israel\'s restoration.' },
    { word: 'AARON', fact: 'Aaron was Moses\' brother and the first high priest of Israel, who spoke to Pharaoh on Moses\' behalf.' },
    { word: 'ABSALOM', fact: 'Absalom was David\'s handsome son who rebelled against his father and tried to seize the throne.' },
    { word: 'AMOS', fact: 'Amos was a simple shepherd and fig farmer whom God called to prophesy against Israel\'s injustice.' },
    { word: 'BATHSHEBA', fact: 'Bathsheba became the wife of King David and the mother of Solomon, Israel\'s wisest king.' },
    { word: 'BENJAMIN', fact: 'Benjamin was the youngest son of Jacob and Rachel, and his tribe produced Israel\'s first king, Saul.' },
    { word: 'BOAZ', fact: 'Boaz was the kinsman-redeemer who married Ruth, and together they became ancestors of King David.' },
    { word: 'CORNELIUS', fact: 'Cornelius was a Roman centurion and the first Gentile convert, baptised after Peter\'s vision of the sheet.' },
    { word: 'DEBORAH', fact: 'Deborah was a prophetess and the only female judge of Israel, who led her nation to victory over the Canaanites.' },
    { word: 'ELI', fact: 'Eli was the high priest who raised the boy Samuel in the temple at Shiloh.' },
    { word: 'ENOCH', fact: 'Enoch walked so closely with God that he never died — God simply took him to heaven.' },
    { word: 'HAGAR', fact: 'Hagar was Sarah\'s Egyptian servant who bore Abraham\'s son Ishmael and encountered an angel in the wilderness.' },
    { word: 'HANNAH', fact: 'Hannah prayed so fervently for a child that the priest Eli thought she was drunk, and God gave her Samuel.' },
    { word: 'HEROD', fact: 'Herod the Great ordered the massacre of infants in Bethlehem in an attempt to kill the newborn Jesus.' },
    { word: 'HOSEA', fact: 'Hosea was commanded by God to marry an unfaithful wife as a living parable of God\'s love for Israel.' },
    { word: 'ISAAC', fact: 'Isaac was the long-awaited son of Abraham and Sarah, nearly sacrificed on Mount Moriah as a test of faith.' },
    { word: 'ISHMAEL', fact: 'Ishmael was Abraham\'s firstborn son through Hagar and is considered the father of the Arab nations.' },
    { word: 'JAMES', fact: 'James was one of Jesus\' inner circle of three disciples and the first apostle to be martyred.' },
    { word: 'JETHRO', fact: 'Jethro was Moses\' father-in-law and a Midianite priest who wisely advised Moses to delegate leadership.' },
    { word: 'JEZEBEL', fact: 'Jezebel was the wicked queen of Israel who promoted Baal worship and persecuted the prophets of God.' },
    { word: 'JOEL', fact: 'Joel prophesied that God would pour out His Spirit on all people, fulfilled at Pentecost centuries later.' },
    { word: 'LOT', fact: 'Lot was Abraham\'s nephew who chose to live near Sodom and barely escaped its fiery destruction.' },
    { word: 'MALACHI', fact: 'Malachi was the last Old Testament prophet, who rebuked Israel for offering blemished sacrifices to God.' },
    { word: 'MATTHIAS', fact: 'Matthias was chosen by the apostles to replace Judas Iscariot, restoring the Twelve after the Ascension.' },
    { word: 'MICAH', fact: 'Micah prophesied that the Messiah would be born in Bethlehem, seven hundred years before it happened.' },
    { word: 'MORDECAI', fact: 'Mordecai raised his cousin Esther and uncovered a plot against the Persian king, helping save the Jewish people.' },
    { word: 'NAAMAN', fact: 'Naaman was a powerful Syrian general healed of leprosy after reluctantly washing seven times in the Jordan River.' },
    { word: 'NATHAN', fact: 'Nathan was the prophet who boldly confronted King David about his sin with Bathsheba using a parable about a lamb.' },
    { word: 'OBADIAH', fact: 'Obadiah wrote the shortest book in the Old Testament, a prophecy against the nation of Edom.' },
    { word: 'PHILEMON', fact: 'Philemon was a wealthy Christian whom Paul urged to welcome back his runaway slave Onesimus as a brother.' },
    { word: 'PHILIP', fact: 'Philip the evangelist explained the Scriptures to an Ethiopian official on the road to Gaza and baptised him.' },
    { word: 'REBEKAH', fact: 'Rebekah was chosen as Isaac\'s wife after she offered water to Abraham\'s servant and his camels at a well.' },
    { word: 'SILAS', fact: 'Silas was Paul\'s missionary companion who sang hymns in a Philippian jail before an earthquake opened the doors.' },
    { word: 'STEPHEN', fact: 'Stephen was the first Christian martyr, stoned to death while praying for his persecutors\' forgiveness.' },
    { word: 'THOMAS', fact: 'Thomas doubted the resurrection until he saw Jesus\' wounds, prompting Jesus\' words about blessed belief without seeing.' },
    { word: 'TITUS', fact: 'Titus was a Greek convert whom Paul entrusted with organising the churches on the island of Crete.' },
    { word: 'URIAH', fact: 'Uriah was a loyal soldier whose wife Bathsheba was taken by David, who then arranged Uriah\'s death in battle.' },
    { word: 'ZECHARIAH', fact: 'Zechariah was the priest struck mute for doubting an angel\'s message that his wife would bear John the Baptist.' },
    { word: 'ZACCHAEUS', fact: 'Zacchaeus was a short tax collector who climbed a sycamore tree to see Jesus, then gave half his wealth to the poor.' },
    { word: 'NAOMI', fact: 'Naomi lost her husband and sons in Moab but returned to Bethlehem where Ruth\'s loyalty restored her joy.' },
    { word: 'NEHEMIAH', fact: 'Nehemiah left his position as cupbearer to the Persian king to rebuild the walls of Jerusalem in just 52 days.' },
    { word: 'LAZARUS', fact: 'Lazarus was dead for four days before Jesus called him out of the tomb, performing one of his greatest miracles.' },
    { word: 'ANDREW', fact: 'Andrew was the first disciple called by Jesus and was known for bringing others, including his brother Peter, to Christ.' },
    { word: 'CAIN', fact: 'Cain was the firstborn son of Adam and Eve who murdered his brother Abel out of jealousy over God\'s favour.' },
    { word: 'ABEL', fact: 'Abel offered a pleasing sacrifice to God and became the first person in the Bible to die, killed by his brother Cain.' },
    { word: 'ELISHA', fact: 'Elisha received a double portion of Elijah\'s spirit and performed twice as many miracles, including raising a boy from the dead.' },
  ],
  Places: [
    { word: 'JERUSALEM', fact: 'Jerusalem is the holy city where Solomon built the Temple and Jesus was crucified.' },
    { word: 'BETHLEHEM', fact: 'Bethlehem means "house of bread" and is where Jesus was born in a manger.' },
    { word: 'NAZARETH', fact: 'Nazareth is where Jesus grew up with Mary and Joseph, a small village in Galilee.' },
    { word: 'EGYPT', fact: 'The Israelites spent 400 years in Egypt before Moses led them to freedom.' },
    { word: 'JORDAN', fact: 'The Jordan River is where Jesus was baptised by John the Baptist.' },
    { word: 'GALILEE', fact: 'The Sea of Galilee is where Jesus walked on water and called his first disciples.' },
    { word: 'JERICHO', fact: 'The walls of Jericho fell after the Israelites marched around the city for seven days.' },
    { word: 'SINAI', fact: 'Mount Sinai is where Moses received the Ten Commandments from God.' },
    { word: 'BABEL', fact: 'The Tower of Babel is where God confused the languages of all the people on earth.' },
    { word: 'NINEVEH', fact: 'Nineveh was the great Assyrian city that repented after Jonah finally preached to them.' },
    { word: 'EDEN', fact: 'The Garden of Eden was the paradise where God placed Adam and Eve.' },
    { word: 'CORINTH', fact: 'Corinth was a wealthy Greek city that Paul wrote two important letters to.' },
    { word: 'DAMASCUS', fact: 'Damascus is one of the oldest cities in the world and where Paul had his conversion.' },
    { word: 'PHILIPPI', fact: 'Paul and Silas were imprisoned in Philippi but sang hymns at midnight and an earthquake freed them.' },
    { word: 'CAPERNAUM', fact: 'Capernaum was the base of Jesus\' ministry in Galilee where he performed many miracles.' },
    { word: 'SODOM', fact: 'Sodom was destroyed by fire from heaven for its wickedness, and only Lot\'s family escaped.' },
    { word: 'ANTIOCH', fact: 'Antioch is where followers of Jesus were first called Christians.' },
    { word: 'ARARAT', fact: 'Mount Ararat is where Noah\'s ark came to rest after the great flood waters receded.' },
    { word: 'BEERSHEBA', fact: 'Beersheba means "well of the oath" and marked the southern boundary of ancient Israel.' },
    { word: 'BETHANY', fact: 'Bethany was the home of Mary, Martha, and Lazarus, and where Jesus raised Lazarus from the dead.' },
    { word: 'CAESAREA', fact: 'Caesarea was a Roman port city where Peter baptised Cornelius, the first Gentile convert.' },
    { word: 'CANAAN', fact: 'Canaan was the Promised Land that God pledged to Abraham and his descendants.' },
    { word: 'CARMEL', fact: 'Mount Carmel is where Elijah challenged 450 prophets of Baal and called down fire from heaven.' },
    { word: 'COLOSSAE', fact: 'Colossae was a small city in Asia Minor to which Paul wrote a letter about the supremacy of Christ.' },
    { word: 'DERBE', fact: 'Derbe was a city in Asia Minor where Paul won many disciples during his first missionary journey.' },
    { word: 'DOTHAN', fact: 'Dothan is where Joseph\'s brothers threw him into a pit, and where Elisha\'s servant saw an angelic army.' },
    { word: 'EMMAUS', fact: 'On the road to Emmaus, two disciples walked with the risen Jesus without recognising him until he broke bread.' },
    { word: 'EPHESUS', fact: 'Ephesus was a major city where Paul preached for two years and a riot broke out among silversmiths.' },
    { word: 'GALATIA', fact: 'Galatia was a Roman province whose churches Paul urged not to trade the gospel of grace for legalism.' },
    { word: 'GETHSEMANE', fact: 'Gethsemane is the garden where Jesus prayed in agony the night before his crucifixion.' },
    { word: 'GILEAD', fact: 'Gilead was a fertile region east of the Jordan known for its healing balm and medicinal herbs.' },
    { word: 'HEBRON', fact: 'Hebron is where Abraham bought a burial cave for Sarah and where David was first crowned king.' },
    { word: 'HOREB', fact: 'Mount Horeb is another name for Sinai, where Moses saw the burning bush that was not consumed.' },
    { word: 'LYSTRA', fact: 'In Lystra, the crowd tried to worship Paul and Barnabas as Greek gods after a lame man was healed.' },
    { word: 'MACEDONIA', fact: 'Paul received a vision of a man from Macedonia calling for help, leading the gospel into Europe.' },
    { word: 'MORIAH', fact: 'Mount Moriah is where Abraham was told to sacrifice Isaac, later the site of Solomon\'s Temple.' },
    { word: 'PATMOS', fact: 'Patmos is the island where the apostle John was exiled and received the visions recorded in Revelation.' },
    { word: 'PERGAMUM', fact: 'Pergamum was one of the seven churches in Revelation, described as living where Satan\'s throne was.' },
    { word: 'ROME', fact: 'Rome was the capital of the empire that crucified Jesus, yet became a centre of the early church.' },
    { word: 'SAMARIA', fact: 'Samaria was a region despised by the Jews, yet Jesus broke social barriers by speaking to the Samaritan woman at the well.' },
    { word: 'SARDIS', fact: 'Sardis was a church in Revelation that appeared alive but was spiritually dead.' },
    { word: 'SHARON', fact: 'The Plain of Sharon was a fertile coastal strip famous for its beauty, referenced as the "Rose of Sharon."' },
    { word: 'SHILOH', fact: 'Shiloh was the religious centre of Israel where the Tabernacle rested before the Temple was built.' },
    { word: 'SMYRNA', fact: 'Smyrna was a persecuted church in Revelation that Jesus encouraged to be faithful even unto death.' },
    { word: 'TARSUS', fact: 'Tarsus was the birthplace of the apostle Paul, a major university city in the Roman province of Cilicia.' },
    { word: 'THESSALONICA', fact: 'Thessalonica received two of Paul\'s letters addressing Christ\'s return and encouragement under persecution.' },
    { word: 'THYATIRA', fact: 'Thyatira was one of the seven churches in Revelation, rebuked for tolerating a false prophetess.' },
    { word: 'TROAS', fact: 'In Troas, Paul raised a young man named Eutychus who fell from a third-story window during a long sermon.' },
    { word: 'MASSAH', fact: 'Massah means "testing" and marks the place where the Israelites quarrelled with Moses, demanding water in the desert.' },
  ],
  Books: [
    { word: 'GENESIS', fact: 'Genesis means "beginning" and tells the story of creation, the flood, and the patriarchs.' },
    { word: 'EXODUS', fact: 'Exodus describes Moses leading the Israelites out of slavery in Egypt through mighty signs and wonders.' },
    { word: 'LEVITICUS', fact: 'Leviticus contains laws about worship and holiness given to the priests of Israel.' },
    { word: 'NUMBERS', fact: 'Numbers records two censuses of Israel and forty years of wilderness wandering after leaving Egypt.' },
    { word: 'DEUTERONOMY', fact: 'Deuteronomy means "second law" and contains Moses\' final speeches before entering the Promised Land.' },
    { word: 'EZRA', fact: 'Ezra was a priest and scribe who led a group of exiles back to Jerusalem and restored the law of Moses.' },
    { word: 'JOB', fact: 'Job explores the mystery of suffering through a righteous man who lost everything yet kept his faith in God.' },
    { word: 'PSALMS', fact: 'Psalms is a collection of 150 songs and prayers, many written by King David.' },
    { word: 'PROVERBS', fact: 'Proverbs contains wise sayings mostly attributed to Solomon, the wisest king.' },
    { word: 'ECCLESIASTES', fact: 'Ecclesiastes reflects on the meaning of life, concluding that everything is meaningless apart from fearing God.' },
    { word: 'ISAIAH', fact: 'Isaiah contains many prophecies about the coming Messiah, written 700 years before Jesus.' },
    { word: 'JEREMIAH', fact: 'Jeremiah is known as the weeping prophet who warned Judah of destruction for forty years but was largely ignored.' },
    { word: 'LAMENTATIONS', fact: 'Lamentations is a series of funeral poems mourning the destruction of Jerusalem by Babylon.' },
    { word: 'NAHUM', fact: 'Nahum prophesied the total destruction of Nineveh, the Assyrian capital that had terrorised the ancient world.' },
    { word: 'HABAKKUK', fact: 'Habakkuk boldly questioned God about injustice and received the answer that the righteous shall live by faith.' },
    { word: 'ZEPHANIAH', fact: 'Zephaniah warned of the coming Day of the Lord but also promised a joyful restoration for God\'s people.' },
    { word: 'HAGGAI', fact: 'Haggai challenged the returned exiles to stop neglecting God\'s house and finish rebuilding the Temple.' },
    { word: 'MATTHEW', fact: 'Matthew was a tax collector who wrote the first Gospel, emphasising Jesus as the promised King.' },
    { word: 'MARK', fact: 'Mark is the shortest Gospel and focuses on the actions of Jesus, written in a fast-paced, urgent style.' },
    { word: 'LUKE', fact: 'Luke was a physician who wrote the most detailed account of Jesus\' birth and many unique parables.' },
    { word: 'JOHN', fact: 'John\'s Gospel focuses on the divinity of Jesus and contains the famous verse "For God so loved the world."' },
    { word: 'ACTS', fact: 'Acts records the birth of the church and the spread of the gospel from Jerusalem to Rome after Jesus\' ascension.' },
    { word: 'ROMANS', fact: 'Romans is Paul\'s most theological letter, explaining salvation by grace through faith.' },
    { word: 'GALATIANS', fact: 'Galatians is Paul\'s passionate defence of the gospel of grace against those requiring circumcision.' },
    { word: 'EPHESIANS', fact: 'Ephesians describes the church as the body of Christ and urges believers to put on the full armour of God.' },
    { word: 'PHILIPPIANS', fact: 'Philippians is Paul\'s letter of joy, written from prison, encouraging believers to rejoice in all circumstances.' },
    { word: 'COLOSSIANS', fact: 'Colossians declares the supremacy of Christ over all creation and warns against empty philosophy.' },
    { word: 'HEBREWS', fact: 'Hebrews explains how Jesus is greater than the angels, Moses, and the old priesthood.' },
    { word: 'JUDE', fact: 'Jude is a short, urgent letter warning the church to contend for the faith against false teachers.' },
    { word: 'REVELATION', fact: 'Revelation is the final book of the Bible describing visions of the end times and new creation.' },
    { word: 'JUDGES', fact: 'Judges tells of twelve leaders who rescued Israel in a cycle of sin, suffering, and deliverance.' },
  ],
  Objects: [
    { word: 'ARK', fact: 'The Ark of the Covenant held the Ten Commandments and represented God\'s presence among the Israelites.' },
    { word: 'MANNA', fact: 'Manna was the miraculous bread from heaven that fed the Israelites daily for forty years in the wilderness.' },
    { word: 'SCEPTER', fact: 'A scepter symbolised royal authority; King Xerxes extended his golden scepter to spare Queen Esther\'s life.' },
    { word: 'STAFF', fact: 'Moses\' staff turned into a serpent before Pharaoh and was used to part the Red Sea.' },
    { word: 'ALTAR', fact: 'Altars were places of sacrifice and worship; Abraham built altars at every place God appeared to him.' },
    { word: 'SCROLL', fact: 'Scrolls contained the Scriptures; Ezra read the scroll of the Law aloud to all the people for hours.' },
    { word: 'TEMPLE', fact: 'Solomon\'s Temple in Jerusalem took seven years to build and was the dwelling place of God\'s glory.' },
    { word: 'TABERNACLE', fact: 'The Tabernacle was a portable tent of worship that traveled with the Israelites through the wilderness.' },
    { word: 'CHARIOT', fact: 'Elijah was taken to heaven in a chariot of fire, and Egypt\'s chariots were drowned in the Red Sea.' },
    { word: 'CROWN', fact: 'A crown of thorns was placed on Jesus\' head to mock him, yet crowns of life await the faithful.' },
    { word: 'SHIELD', fact: 'Paul described faith as a shield that extinguishes all the flaming arrows of the evil one.' },
    { word: 'SWORD', fact: 'The Word of God is called the sword of the Spirit, the only offensive weapon in the armour of God.' },
    { word: 'TRUMPET', fact: 'Seven trumpets sounded to bring down the walls of Jericho, and seven will announce events in Revelation.' },
    { word: 'VINEYARD', fact: 'Jesus compared God\'s kingdom to a vineyard whose owner hired workers at different hours but paid them equally.' },
    { word: 'CHALICE', fact: 'Jesus used a cup at the Last Supper, saying the wine represented his blood of the new covenant.' },
    { word: 'CROSS', fact: 'The cross was Rome\'s instrument of execution but became the central symbol of Christianity and salvation.' },
    { word: 'TOMB', fact: 'Jesus was buried in a borrowed tomb carved from rock, and on the third day it was found empty.' },
    { word: 'FRANKINCENSE', fact: 'Frankincense was one of three gifts the Magi brought to the infant Jesus, symbolising his divinity and priesthood.' },
    { word: 'MYRRH', fact: 'Myrrh was brought to Jesus at birth and offered at his death, used for embalming and symbolising suffering.' },
    { word: 'THORN', fact: 'Thorns first appear in Genesis as part of the curse, and a crown of thorns was placed on Jesus before the cross.' },
    { word: 'FLEECE', fact: 'Gideon put out a wool fleece twice to confirm God\'s will, asking for dew on the fleece and then off it.' },
    { word: 'PILLAR', fact: 'God led the Israelites as a pillar of cloud by day and a pillar of fire by night through the wilderness.' },
    { word: 'RAINBOW', fact: 'After the flood, God set a rainbow in the sky as a sign of his promise never to destroy the earth by water again.' },
    { word: 'COVENANT', fact: 'A covenant is a sacred agreement; God made covenants with Noah, Abraham, Moses, David, and through Jesus.' },
    { word: 'SABBATH', fact: 'The Sabbath is the seventh day of rest that God established after six days of creation.' },
    { word: 'TITHE', fact: 'A tithe is one-tenth of one\'s income given to God; Abraham gave a tithe to the priest Melchizedek.' },
    { word: 'OFFERING', fact: 'Offerings in the Bible ranged from animal sacrifices to grain; Abel\'s offering pleased God while Cain\'s did not.' },
    { word: 'SACRIFICE', fact: 'Animal sacrifices covered sin in the Old Testament, pointing to Jesus as the ultimate and final sacrifice.' },
    { word: 'BAPTISM', fact: 'Baptism symbolises death to the old life and resurrection to new life; Jesus himself was baptised in the Jordan.' },
    { word: 'COMMUNION', fact: 'Communion commemorates the Last Supper where Jesus broke bread and shared wine with his disciples.' },
    { word: 'LEAVEN', fact: 'Jesus warned about the leaven of the Pharisees, using yeast as a metaphor for how a little sin spreads.' },
    { word: 'MUSTARD', fact: 'Jesus said faith as small as a mustard seed can move mountains; the tiny seed grows into a large tree.' },
    { word: 'PEARL', fact: 'Jesus compared the kingdom of heaven to a merchant who sold everything to buy one pearl of great price.' },
    { word: 'TALENT', fact: 'In Jesus\' parable, a master gave talents to servants; those who invested wisely were rewarded, but the fearful one lost his.' },
    { word: 'DENARIUS', fact: 'A denarius was a day\'s wage; Jesus used one to teach about paying taxes to Caesar and giving to God what is God\'s.' },
    { word: 'LAMPSTAND', fact: 'The golden lampstand in the Tabernacle had seven branches and was never to go out, symbolising God\'s eternal light.' },
    { word: 'INCENSE', fact: 'Incense burned on the altar of incense represented the prayers of the people rising up to God.' },
    { word: 'MANGER', fact: 'A manger was an animal feeding trough in which Mary laid the newborn Jesus in Bethlehem.' },
    { word: 'SANDAL', fact: 'Removing sandals signified holy ground; God told Moses to remove his at the burning bush.' },
    { word: 'CISTERN', fact: 'Joseph was thrown into an empty cistern by his brothers, and Jeremiah was lowered into a muddy one by his enemies.' },
    { word: 'YOKE', fact: 'Jesus invited the weary to take his yoke, promising it was easy and his burden light.' },
    { word: 'BANNER', fact: 'Moses built an altar called "The Lord is My Banner" after Israel\'s victory over the Amalekites.' },
    { word: 'WINESKIN', fact: 'Jesus said new wine must go in new wineskins, teaching that his message could not fit into old religious traditions.' },
  ],
};

const ALL_WORDS = Object.entries(WORDS).flatMap(([category, items]) =>
  items.map((item) => ({ ...item, category }))
);

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function pickRandom(usedSet) {
  const available = ALL_WORDS.filter((w) => !usedSet.has(w.word));
  if (available.length === 0) return ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

export default function BibleHangmanGame() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [currentWord, setCurrentWord] = useState(null);
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [usedWords, setUsedWords] = useState(new Set());

  const resultAnim = useRef(new Animated.Value(0)).current;
  const heartAnims = useRef(
    Array.from({ length: MAX_LIVES }, () => new Animated.Value(1))
  ).current;

  const startNewRound = useCallback(() => {
    const word = pickRandom(usedWords);
    setUsedWords((prev) => new Set([...prev, word.word]));
    setCurrentWord(word);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setGameState('playing');
    resultAnim.setValue(0);
    heartAnims.forEach((a) => a.setValue(1));
  }, [usedWords, resultAnim, heartAnims]);

  useEffect(() => {
    startNewRound();
  }, []);

  const handleLetterPress = useCallback(
    (letter) => {
      if (gameState !== 'playing' || !currentWord || guessedLetters.has(letter)) return;

      hapticFeedback.light();
      const newGuessed = new Set([...guessedLetters, letter]);
      setGuessedLetters(newGuessed);

      if (!currentWord.word.includes(letter)) {
        const newWrong = wrongGuesses + 1;
        setWrongGuesses(newWrong);

        const heartIdx = MAX_LIVES - newWrong;
        if (heartIdx >= 0) {
          Animated.timing(heartAnims[heartIdx], {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

        if (newWrong >= MAX_LIVES) {
          hapticFeedback.error();
          setGameState('lost');
          setStreak(0);
          Animated.spring(resultAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }).start();
        } else {
          hapticFeedback.warning();
        }
      } else {
        const allRevealed = currentWord.word
          .split('')
          .every((c) => c === ' ' || newGuessed.has(c));
        if (allRevealed) {
          hapticFeedback.success();
          const bonus = MAX_LIVES - wrongGuesses;
          setScore((prev) => prev + bonus + currentWord.word.length);
          setStreak((prev) => prev + 1);
          setGameState('won');
          Animated.spring(resultAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      }
    },
    [gameState, currentWord, guessedLetters, wrongGuesses, heartAnims, resultAnim]
  );

  const handleNextRound = useCallback(() => {
    hapticFeedback.light();
    setRound((prev) => prev + 1);
    startNewRound();
  }, [startNewRound]);

  if (!currentWord) return null;

  const bg = theme.background || (isDark ? '#0a0a1a' : '#f5f5ff');
  const textColor = theme.text || (isDark ? '#ffffff' : '#1a1a2e');
  const primary = theme.primary || '#6C63FF';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  const wordLetters = currentWord.word.split('');
  const revealedWord = wordLetters.map((c) =>
    c === ' ' ? ' ' : guessedLetters.has(c) || gameState === 'lost' ? c : '_'
  );

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          style={[styles.backButton, { backgroundColor: cardBg }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Bible Hangman</Text>
        <View style={[styles.scoreContainer, { backgroundColor: cardBg }]}>
          <MaterialIcons name="stars" size={18} color={primary} />
          <Text style={[styles.scoreText, { color: textColor }]}>{score}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.1)' }]}>
            <MaterialIcons name="label" size={16} color={primary} />
            <Text style={[styles.categoryText, { color: primary }]}>{currentWord.category}</Text>
          </View>
          <View style={styles.livesRow}>
            {heartAnims.map((anim, idx) => (
              <Animated.View key={idx} style={{ opacity: anim, transform: [{ scale: anim }] }}>
                <MaterialIcons
                  name="favorite"
                  size={22}
                  color="#FF3B5C"
                />
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={[styles.wordArea, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={styles.letterRow}>
            {revealedWord.map((letter, idx) => (
              <View
                key={idx}
                style={[
                  styles.letterBox,
                  letter === ' ' && styles.letterSpace,
                  {
                    borderBottomColor: letter === '_'
                      ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
                      : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.letterText,
                    {
                      color: gameState === 'lost' && !guessedLetters.has(currentWord.word[idx])
                        ? '#FF3B5C'
                        : textColor,
                    },
                  ]}
                >
                  {letter === '_' ? '' : letter}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {gameState === 'playing' && (
          <View style={styles.alphabetGrid}>
            {ALPHABET.map((letter) => {
              const used = guessedLetters.has(letter);
              const isCorrect = used && currentWord.word.includes(letter);
              const isWrong = used && !currentWord.word.includes(letter);
              return (
                <TouchableOpacity
                  key={letter}
                  onPress={() => handleLetterPress(letter)}
                  disabled={used}
                  activeOpacity={0.7}
                  style={[
                    styles.alphaKey,
                    {
                      backgroundColor: isCorrect
                        ? (isDark ? 'rgba(52,199,89,0.25)' : 'rgba(52,199,89,0.15)')
                        : isWrong
                        ? (isDark ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.12)')
                        : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'),
                      opacity: used ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.alphaKeyText,
                      {
                        color: isCorrect
                          ? '#34C759'
                          : isWrong
                          ? '#FF3B30'
                          : textColor,
                      },
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {gameState !== 'playing' && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                backgroundColor: gameState === 'won'
                  ? (isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)')
                  : (isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)'),
                opacity: resultAnim,
                transform: [
                  {
                    translateY: resultAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons
              name={gameState === 'won' ? 'celebration' : 'sentiment-dissatisfied'}
              size={48}
              color={gameState === 'won' ? '#34C759' : '#FF3B30'}
            />
            <Text style={[styles.resultTitle, { color: textColor }]}>
              {gameState === 'won' ? 'You Got It!' : 'Not This Time'}
            </Text>
            <Text style={[styles.resultWord, { color: primary }]}>{currentWord.word}</Text>
            <Text style={[styles.factText, { color: subtleText }]}>{currentWord.fact}</Text>

            {streak > 1 && gameState === 'won' && (
              <View style={[styles.streakBadge, { backgroundColor: isDark ? 'rgba(255,214,10,0.15)' : 'rgba(255,214,10,0.12)' }]}>
                <MaterialIcons name="local-fire-department" size={18} color="#FFB800" />
                <Text style={[styles.streakText, { color: '#FFB800' }]}>{streak} streak!</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleNextRound} activeOpacity={0.8}>
              <LinearGradient
                colors={[primary, isDark ? '#8B83FF' : '#5A52E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>Play Again</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.statsRow}>
          <Text style={[styles.statLabel, { color: subtleText }]}>Round {round}</Text>
          {streak > 0 && (
            <View style={styles.streakRow}>
              <MaterialIcons name="local-fire-department" size={13} color="#FFB800" />
              <Text style={[styles.statLabel, { color: subtleText }]}>{streak}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  wordArea: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  letterBox: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 2.5,
    paddingBottom: 4,
  },
  letterSpace: {
    width: 16,
    borderBottomWidth: 0,
  },
  letterText: {
    fontSize: 22,
    fontWeight: '700',
  },
  alphabetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  alphaKey: {
    width: (SCREEN_WIDTH - 32 - 8 * 8) / 7,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
    maxWidth: 48,
  },
  alphaKeyText: {
    fontSize: 17,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  resultWord: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
  },
  factText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    marginTop: 4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
