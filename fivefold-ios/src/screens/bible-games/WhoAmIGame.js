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

const CHARACTERS = [
  {
    name: 'David',
    difficulty: 'easy',
    clues: [
      'I was the youngest of my brothers',
      'I was a shepherd before I became famous',
      'I defeated a giant with a sling and a stone',
      'I became King of Israel after Saul',
      'I wrote many of the Psalms',
    ],
  },
  {
    name: 'Moses',
    difficulty: 'easy',
    clues: [
      'I was hidden in a basket as a baby',
      'I grew up in a royal palace but wasn\'t royalty by birth',
      'God spoke to me through a burning bush',
      'I led an entire nation out of slavery',
      'I received the Ten Commandments on a mountain',
    ],
  },
  {
    name: 'Noah',
    difficulty: 'easy',
    clues: [
      'God called me righteous in my generation',
      'I worked on a massive project for many years',
      'I gathered animals in pairs',
      'My family and I survived a world-changing event',
      'A rainbow was a sign of God\'s promise to me',
    ],
  },
  {
    name: 'Abraham',
    difficulty: 'easy',
    clues: [
      'God asked me to leave my homeland',
      'I was promised descendants as numerous as the stars',
      'I waited decades for a son with my wife',
      'God tested my faith with an extreme request',
      'I am known as the father of many nations',
    ],
  },
  {
    name: 'Joseph',
    difficulty: 'easy',
    clues: [
      'I was my father\'s favourite child',
      'I owned a special colourful garment',
      'My brothers sold me into slavery',
      'I could interpret dreams',
      'I became second in command of Egypt',
    ],
  },
  {
    name: 'Solomon',
    difficulty: 'easy',
    clues: [
      'My father was a famous king',
      'When God offered me anything, I chose wisdom',
      'I built a magnificent temple',
      'I wrote proverbs and songs',
      'I was known as the wisest person who ever lived',
    ],
  },
  {
    name: 'Esther',
    difficulty: 'easy',
    clues: [
      'I was an orphan raised by my cousin',
      'I won a royal beauty contest',
      'I kept a major secret about my identity',
      'I risked my life to approach the king uninvited',
      'I saved my people from a plot to destroy them',
    ],
  },
  {
    name: 'Ruth',
    difficulty: 'easy',
    clues: [
      'I was not originally from Israel',
      'I refused to leave my mother-in-law',
      'I gathered leftover grain in a field',
      'A kind wealthy man noticed me',
      'I became the great-grandmother of King David',
    ],
  },
  {
    name: 'Daniel',
    difficulty: 'easy',
    clues: [
      'I was taken captive to a foreign empire as a young man',
      'I refused to eat the king\'s food',
      'I interpreted a king\'s mysterious dream',
      'I kept praying despite a new law forbidding it',
      'I survived a night in a den of lions',
    ],
  },
  {
    name: 'Samson',
    difficulty: 'easy',
    clues: [
      'An angel announced my birth before I was born',
      'I was never supposed to cut my hair',
      'I had incredible physical strength',
      'A woman named Delilah discovered my secret',
      'I brought down an entire building with my bare hands',
    ],
  },
  {
    name: 'Jonah',
    difficulty: 'easy',
    clues: [
      'God told me to go somewhere but I ran the other way',
      'I boarded a ship to escape my mission',
      'A violent storm was caused because of me',
      'I spent three days in a very unusual place',
      'I finally preached to the city of Nineveh',
    ],
  },
  {
    name: 'Peter',
    difficulty: 'easy',
    clues: [
      'I was a fisherman by trade',
      'I left my nets to follow a teacher',
      'I walked on water for a brief moment',
      'I denied knowing someone three times',
      'I became a leader of the early church',
    ],
  },
  {
    name: 'Paul',
    difficulty: 'easy',
    clues: [
      'I was highly educated in religious law',
      'I used to persecute people for their beliefs',
      'A blinding light changed my life on a road',
      'I went on several missionary journeys',
      'I wrote many letters that are in the New Testament',
    ],
  },
  {
    name: 'Mary',
    difficulty: 'easy',
    clues: [
      'I was a young woman from Nazareth',
      'An angel appeared to me with surprising news',
      'I visited my relative Elizabeth in the hill country',
      'I gave birth in a humble stable',
      'I am the mother of Jesus',
    ],
  },
  {
    name: 'Elijah',
    difficulty: 'easy',
    clues: [
      'I was a prophet during a time of great idolatry',
      'I was fed by ravens in the wilderness',
      'I challenged 450 false prophets to a contest',
      'I called down fire from heaven',
      'I was taken to heaven in a chariot of fire',
    ],
  },
  {
    name: 'Sarah',
    difficulty: 'easy',
    clues: [
      'I travelled with my husband when God called him',
      'I waited many years for a child',
      'I laughed when I overheard surprising news',
      'I gave birth at a very old age',
      'My son\'s name means "laughter"',
    ],
  },
  {
    name: 'Gideon',
    difficulty: 'medium',
    clues: [
      'I was threshing wheat in hiding when God called me',
      'I asked God for a sign using a wool fleece',
      'God reduced my army from thousands to just 300',
      'My men used torches, trumpets, and jars as weapons',
      'I defeated the Midianites against impossible odds',
    ],
  },
  {
    name: 'Joshua',
    difficulty: 'easy',
    clues: [
      'I was Moses\' assistant for many years',
      'I was one of twelve spies sent to scout a land',
      'I took over leadership after Moses died',
      'I led people across a river on dry ground',
      'I conquered Jericho when its walls fell down',
    ],
  },
  {
    name: 'Rahab',
    difficulty: 'medium',
    clues: [
      'I lived in the wall of a great city',
      'I hid two strangers on my roof',
      'I made a deal using a scarlet cord',
      'My city was conquered but I was spared',
      'I am listed in the genealogy of Jesus',
    ],
  },
  {
    name: 'Samuel',
    difficulty: 'medium',
    clues: [
      'My mother dedicated me to God before I was born',
      'I grew up in the temple under a priest named Eli',
      'God called my name at night when I was a child',
      'I anointed the first two kings of Israel',
      'I was the last judge of Israel',
    ],
  },
  {
    name: 'Jacob',
    difficulty: 'easy',
    clues: [
      'I was born holding my twin brother\'s heel',
      'I tricked my father to receive a blessing',
      'I fell in love at first sight at a well',
      'I wrestled with a mysterious figure all night',
      'God renamed me Israel',
    ],
  },
  {
    name: 'Deborah',
    difficulty: 'medium',
    clues: [
      'I was a leader during a time of oppression',
      'People came to me for wisdom under a palm tree',
      'I was both a prophet and a judge',
      'I accompanied a general into battle for courage',
      'A woman named Jael helped fulfil my prophecy',
    ],
  },
  {
    name: 'Nehemiah',
    difficulty: 'medium',
    clues: [
      'I served as a cupbearer to a foreign king',
      'I wept when I heard about my homeland\'s condition',
      'I organised a massive rebuilding project',
      'I faced opposition but kept working with one hand on a weapon',
      'I rebuilt the walls of Jerusalem in just 52 days',
    ],
  },
  {
    name: 'John the Baptist',
    difficulty: 'easy',
    clues: [
      'My birth was announced by an angel to my elderly father',
      'I lived in the wilderness and ate unusual food',
      'I called people to repent and change their ways',
      'I baptised people in the Jordan River',
      'I said I was not worthy to untie someone\'s sandals',
    ],
  },
  {
    name: 'Martha',
    difficulty: 'medium',
    clues: [
      'I lived in a village called Bethany',
      'I had a sister and a brother who were close to Jesus',
      'I was frustrated that my sister wasn\'t helping me serve',
      'Jesus gently told me I was worried about too many things',
      'I declared that Jesus is the Messiah, the Son of God',
    ],
  },
  {
    name: 'Naomi',
    difficulty: 'medium',
    clues: [
      'I moved to a foreign land because of a famine',
      'I lost my husband and both my sons',
      'My daughter-in-law refused to leave me',
      'I returned to Bethlehem a sorrowful woman',
      'I became a grandmother through my loyal daughter-in-law Ruth',
    ],
  },
  {
    name: 'Barnabas',
    difficulty: 'medium',
    clues: [
      'My name means "Son of Encouragement"',
      'I sold a field and gave the money to the apostles',
      'I vouched for a former persecutor when others were afraid',
      'I traveled with Paul on missionary journeys',
      'I gave a young man named John Mark a second chance',
    ],
  },
  {
    name: 'Caleb',
    difficulty: 'medium',
    clues: [
      'I was sent as a spy to explore a new land',
      'Only one other spy agreed with my positive report',
      'I trusted God even when the majority was afraid',
      'I waited 45 years to receive my promised inheritance',
      'At age 85, I was still strong enough to conquer a mountain',
    ],
  },
  {
    name: 'Eve',
    difficulty: 'easy',
    clues: [
      'I was created in a garden',
      'I was the first woman to ever exist',
      'A serpent convinced me to eat forbidden fruit',
      'My choice had consequences for all humanity',
      'My name means "mother of all living"',
    ],
  },
  {
    name: 'Adam',
    difficulty: 'easy',
    clues: [
      'I was formed from the ground',
      'I was given the job of naming every animal',
      'I lived in a paradise called Eden',
      'I ate fruit I was told not to eat',
      'I was the first man God created',
    ],
  },
  {
    name: 'Miriam',
    difficulty: 'medium',
    clues: [
      'I watched over my baby brother floating in a river',
      'I suggested a nurse for the princess\'s new baby',
      'I led women in singing and dancing after a great rescue',
      'I was a prophetess in Israel',
      'My two brothers were Moses and Aaron',
    ],
  },
  {
    name: 'Ezekiel',
    difficulty: 'medium',
    clues: [
      'I was a priest who became a prophet during exile',
      'I had dramatic visions including wheels within wheels',
      'God once told me to lie on my side for over a year',
      'I prophesied over a valley of dry bones',
      'I saw the dry bones come to life as a symbol of Israel\'s restoration',
    ],
  },
  {
    name: 'Job',
    difficulty: 'easy',
    clues: [
      'I was known as the most upright person in my land',
      'I lost everything I had in a single day',
      'My friends came to comfort me but mostly blamed me',
      'I questioned God about my suffering',
      'God restored everything I lost and gave me double',
    ],
  },
  {
    name: 'Jeremiah',
    difficulty: 'medium',
    clues: [
      'God called me to be a prophet when I was very young',
      'I told God I was too young to speak',
      'I wept over the coming destruction of my nation',
      'I was thrown into a muddy cistern',
      'I am known as the weeping prophet',
    ],
  },
  {
    name: 'Zacchaeus',
    difficulty: 'medium',
    clues: [
      'I was very short in stature',
      'I had a job that made me very unpopular',
      'I climbed a sycamore tree to see over a crowd',
      'A famous teacher said he was coming to my house',
      'I promised to give half my possessions to the poor',
    ],
  },
  {
    name: 'Hannah',
    difficulty: 'medium',
    clues: [
      'I prayed so fervently that a priest thought I was drunk',
      'I was deeply sad because I could not have children',
      'I made a vow to dedicate my child to God',
      'My prayer was finally answered with a son',
      'I named my son Samuel, meaning "God has heard"',
    ],
  },
  {
    name: 'Stephen',
    difficulty: 'medium',
    clues: [
      'I was chosen as one of the first deacons of the early church',
      'I was full of grace and power and performed wonders',
      'I gave a powerful speech about Israel\'s history',
      'I saw a vision of heaven as I faced death',
      'I was the first Christian martyr',
    ],
  },
  {
    name: 'Nicodemus',
    difficulty: 'medium',
    clues: [
      'I was a Pharisee and a member of the ruling council',
      'I came to see Jesus secretly at night',
      'I asked how a person could be born again',
      'I defended Jesus before the council saying we should hear him first',
      'I helped prepare Jesus\' body for burial with expensive spices',
    ],
  },
  {
    name: 'Lydia',
    difficulty: 'medium',
    clues: [
      'I was a businesswoman who sold expensive purple cloth',
      'I lived in the city of Philippi',
      'I met Paul by a riverside where women gathered to pray',
      'I was the first person to convert in Europe',
      'I opened my home to Paul and his companions',
    ],
  },
  {
    name: 'Lazarus',
    difficulty: 'easy',
    clues: [
      'I lived in the village of Bethany',
      'My sisters were Martha and Mary',
      'I became seriously ill and died',
      'My friend wept when he heard the news',
      'I was raised from the dead after four days in a tomb',
    ],
  },
  // ---- NEW CHARACTERS BELOW ----
  {
    name: 'Aaron',
    difficulty: 'medium',
    clues: [
      'I belonged to the tribe of Levi and served God from an early age',
      'I spoke on behalf of someone who felt inadequate with words',
      'I once gave in to the people and made an idol from gold jewellery',
      'I was the first high priest of Israel',
      'My brother was Moses, and together we confronted Pharaoh',
    ],
  },
  {
    name: 'Absalom',
    difficulty: 'hard',
    clues: [
      'I was known across Israel for my striking good looks and long hair',
      'I avenged a terrible crime committed against my sister',
      'I spent years in exile before returning to my father\'s kingdom',
      'I declared myself king and turned the nation against my own father',
      'I died when my hair got caught in a tree during battle against David\'s army',
    ],
  },
  {
    name: 'Balaam',
    difficulty: 'hard',
    clues: [
      'I was a pagan prophet hired by a king to curse a nation',
      'God blocked my path in a way I could not see at first',
      'My own donkey saw an angel before I did',
      'My donkey spoke to me with a human voice',
      'Instead of cursing Israel, God made me bless them repeatedly',
    ],
  },
  {
    name: 'Bathsheba',
    difficulty: 'medium',
    clues: [
      'A king noticed me from his rooftop while I was bathing',
      'My first husband was a loyal soldier serving on the front lines',
      'My husband was deliberately placed in danger and killed in battle',
      'I became a queen after marrying King David',
      'My son Solomon became the wisest king of Israel',
    ],
  },
  {
    name: 'Boaz',
    difficulty: 'medium',
    clues: [
      'I was a wealthy landowner in Bethlehem',
      'I noticed a foreign woman gathering leftover grain in my fields',
      'I made sure extra grain was left behind for her',
      'I acted as a kinsman-redeemer according to the law',
      'I married Ruth and became the great-grandfather of King David',
    ],
  },
  {
    name: 'Delilah',
    difficulty: 'medium',
    clues: [
      'I lived in the Valley of Sorek',
      'Powerful rulers offered me a fortune to uncover a secret',
      'I persistently pleaded until a strong man revealed his weakness',
      'I discovered that his strength was connected to his hair',
      'I betrayed Samson to the Philistines while he slept',
    ],
  },
  {
    name: 'Eli',
    difficulty: 'hard',
    clues: [
      'I served as both a priest and a judge in Israel',
      'A desperate woman praying in my temple was mistaken by me for a drunkard',
      'I raised a boy whose mother had dedicated him to God',
      'My own sons were wicked and I failed to restrain them',
      'I mentored the young Samuel and died upon hearing the Ark had been captured',
    ],
  },
  {
    name: 'Enoch',
    difficulty: 'hard',
    clues: [
      'I lived during the earliest generations of humanity',
      'I was known for my close relationship with God',
      'I walked with God for three hundred years',
      'I am one of only two people in the Bible who never died',
      'God took me directly to heaven, and I was no more',
    ],
  },
  {
    name: 'Hagar',
    difficulty: 'hard',
    clues: [
      'I was an Egyptian servant in a wealthy household',
      'My mistress gave me to her husband because she could not bear children',
      'I fled into the wilderness after mistreatment',
      'An angel found me by a spring and told me to return',
      'I was the mother of Ishmael, Abraham\'s first son',
    ],
  },
  {
    name: 'Isaac',
    difficulty: 'easy',
    clues: [
      'My birth was promised long before it happened',
      'My parents were very old when I was born',
      'My father once placed me on an altar in obedience to God',
      'I was deceived by one of my sons who wore goatskins on his arms',
      'My name means "laughter" and I was Abraham\'s son of promise',
    ],
  },
  {
    name: 'Ishmael',
    difficulty: 'hard',
    clues: [
      'I was born to a servant woman in my father\'s household',
      'An angel predicted I would be a wild and free man',
      'I was sent away into the desert with my mother as a child',
      'God heard our cries and showed my mother a well of water',
      'I was Abraham\'s first son, born to Hagar the Egyptian',
    ],
  },
  {
    name: 'Jael',
    difficulty: 'hard',
    clues: [
      'I was the wife of a Kenite man named Heber',
      'A fleeing enemy general came to my tent seeking refuge',
      'I offered him milk and covered him with a blanket',
      'I used a tent peg and a hammer to end a war',
      'I killed the Canaanite general Sisera, fulfilling Deborah\'s prophecy',
    ],
  },
  {
    name: 'Jehoshaphat',
    difficulty: 'hard',
    clues: [
      'I was a king of Judah who sought the Lord earnestly',
      'I sent officials throughout the land to teach the people God\'s law',
      'I allied with King Ahab of Israel, which a prophet warned against',
      'When three armies attacked me, I sent singers ahead of my troops',
      'God fought for me and my enemies destroyed each other without my army lifting a sword',
    ],
  },
  {
    name: 'Jethro',
    difficulty: 'hard',
    clues: [
      'I was a priest in the land of Midian',
      'A fugitive from Egypt came to live with me and tended my sheep',
      'I gave my daughter Zipporah in marriage to that man',
      'I visited my son-in-law in the wilderness and saw how overworked he was',
      'I advised Moses to delegate by appointing leaders over thousands, hundreds, fifties, and tens',
    ],
  },
  {
    name: 'Jezebel',
    difficulty: 'medium',
    clues: [
      'I was a foreign princess who married the king of Israel',
      'I promoted the worship of Baal and had many prophets of God killed',
      'I used my husband\'s seal to forge letters and steal a man\'s vineyard',
      'The prophet Elijah was my greatest enemy',
      'I was thrown from a window and fulfilled a gruesome prophecy about my death',
    ],
  },
  {
    name: 'Jonathan',
    difficulty: 'medium',
    clues: [
      'I was the son of Israel\'s first king',
      'I once attacked a Philistine outpost with just my armour-bearer',
      'I made a deep covenant of friendship with someone my father hated',
      'I gave my robe, sword, bow, and belt to my closest friend',
      'My best friend was David, and I died alongside my father Saul in battle',
    ],
  },
  {
    name: 'Josiah',
    difficulty: 'hard',
    clues: [
      'I became king at just eight years old',
      'During my reign, workers found a lost scroll of the Law in the temple',
      'I tore my robes in grief when I heard what the scroll said',
      'I led the greatest religious reformation Judah had ever seen',
      'I destroyed idols and pagan altars throughout the land and restored Passover worship',
    ],
  },
  {
    name: 'Lot',
    difficulty: 'medium',
    clues: [
      'I traveled with my uncle when God called him to a new land',
      'I chose to settle near a prosperous but wicked city',
      'Two angels came to rescue me from impending destruction',
      'My wife looked back despite being warned not to, and turned into a pillar of salt',
      'I escaped the destruction of Sodom as my uncle Abraham had pleaded for my life',
    ],
  },
  {
    name: 'Melchizedek',
    difficulty: 'hard',
    clues: [
      'I appeared in Scripture with no recorded genealogy or death',
      'I was both a king and a priest simultaneously',
      'I brought out bread and wine and blessed a great patriarch',
      'Abraham gave me a tenth of everything after a military victory',
      'I was the King of Salem and priest of God Most High, a foreshadow of Christ',
    ],
  },
  {
    name: 'Methuselah',
    difficulty: 'hard',
    clues: [
      'I lived in the era before the great flood',
      'My father was taken to heaven without dying',
      'My grandson built a famous vessel',
      'I died the same year a world-changing catastrophe struck',
      'I am the oldest person recorded in the Bible, living 969 years',
    ],
  },
  {
    name: 'Michal',
    difficulty: 'hard',
    clues: [
      'I fell in love with a young hero who slew a giant',
      'My father set a dangerous bride price hoping to get him killed',
      'I helped my husband escape through a window when soldiers came',
      'I was given to another man while my husband was a fugitive',
      'I was King Saul\'s daughter and David\'s first wife',
    ],
  },
  {
    name: 'Mordecai',
    difficulty: 'medium',
    clues: [
      'I raised my orphaned cousin as my own daughter',
      'I sat at the king\'s gate and uncovered an assassination plot',
      'A powerful official hated me because I refused to bow to him',
      'I urged my cousin to use her position to save our people',
      'I became second-in-command to the Persian king after Haman\'s downfall, and my cousin was Queen Esther',
    ],
  },
  {
    name: 'Naaman',
    difficulty: 'hard',
    clues: [
      'I was a mighty military commander respected by a foreign king',
      'Despite my power, I suffered from a devastating skin disease',
      'A young Israelite slave girl suggested I visit a prophet for healing',
      'I was offended when the prophet told me to wash in a river seven times',
      'I was healed of leprosy after washing in the Jordan River as the prophet Elisha instructed',
    ],
  },
  {
    name: 'Nathan',
    difficulty: 'hard',
    clues: [
      'I served as an advisor and spokesman of God to the king',
      'I told a powerful man a parable about a rich man stealing a poor man\'s lamb',
      'My story made the king pronounce judgement on himself',
      'I confronted King David over his sin with Bathsheba and Uriah',
      'I helped ensure Solomon was crowned king instead of his older brother Adonijah',
    ],
  },
  {
    name: 'Obadiah',
    difficulty: 'hard',
    clues: [
      'I served in the palace of one of Israel\'s most wicked kings',
      'I was a devout follower of God despite working for an idolatrous court',
      'I secretly hid prophets in caves and provided them food and water',
      'I feared for my life when asked to deliver a message to a famous prophet',
      'I hid a hundred of God\'s prophets from Queen Jezebel\'s persecution under King Ahab',
    ],
  },
  {
    name: 'Pharaoh (of Exodus)',
    difficulty: 'easy',
    clues: [
      'I ruled the most powerful kingdom in the ancient world',
      'I enslaved an entire people and forced them to build my cities',
      'My land was struck by ten devastating plagues',
      'I stubbornly refused to release my slaves despite every warning',
      'My army drowned in the Red Sea while chasing Moses and the Israelites',
    ],
  },
  {
    name: 'Potiphar',
    difficulty: 'hard',
    clues: [
      'I was a high-ranking official in the Egyptian government',
      'I purchased a young Hebrew slave who quickly earned my trust',
      'Everything in my household prospered because of this slave',
      'My wife falsely accused my servant of a terrible crime',
      'I threw Joseph into prison based on my wife\'s false testimony',
    ],
  },
  {
    name: 'Rachel',
    difficulty: 'medium',
    clues: [
      'I was a shepherdess tending my father\'s flock when I met my future husband',
      'A man worked seven years to marry me but was tricked with my sister instead',
      'He worked another seven years to finally have me as his wife',
      'I struggled for years with the sorrow of being unable to have children',
      'I was Jacob\'s beloved wife and the mother of Joseph and Benjamin',
    ],
  },
  {
    name: 'Rebekah',
    difficulty: 'medium',
    clues: [
      'A servant prayed for a sign at a well, and I fulfilled it by offering water to his camels',
      'I left my homeland to marry a man I had never met',
      'I carried twins who struggled within me before they were born',
      'I favoured my younger son and helped him deceive his father',
      'I was Isaac\'s wife and the mother of Jacob and Esau',
    ],
  },
  {
    name: 'Reuben',
    difficulty: 'hard',
    clues: [
      'I was the firstborn of twelve brothers',
      'I tried to save my younger brother from being killed by the others',
      'I suggested throwing him into a pit, planning to rescue him later',
      'I lost my birthright because of a serious sin against my father',
      'I was Jacob\'s eldest son and the founder of one of Israel\'s twelve tribes',
    ],
  },
  {
    name: 'Shadrach',
    difficulty: 'medium',
    clues: [
      'I was taken from my homeland as a young captive to serve a foreign empire',
      'I was given a new name by the Babylonians when I arrived',
      'I held an important government position in a pagan kingdom',
      'I refused to bow to a giant golden statue even under threat of death',
      'I walked through a fiery furnace unharmed with my friends Meshach and Abednego',
    ],
  },
  {
    name: 'Tamar',
    difficulty: 'hard',
    clues: [
      'I was married into a family but my husband died, and then his brother died too',
      'I was promised the youngest son but was never given him',
      'I disguised myself in desperation to secure my rights',
      'I was declared more righteous than my father-in-law by his own admission',
      'I am Judah\'s daughter-in-law, listed in the genealogy of Jesus in Matthew\'s Gospel',
    ],
  },
  {
    name: 'Uriah',
    difficulty: 'hard',
    clues: [
      'I was a Hittite but one of the most loyal soldiers in Israel\'s army',
      'I was called home from battle, but I refused to enjoy comforts while my comrades fought',
      'I slept at the palace door rather than go home to my wife',
      'I unknowingly carried the letter that sealed my own death',
      'King David sent me to the front lines to be killed so he could take my wife Bathsheba',
    ],
  },
  {
    name: 'Andrew',
    difficulty: 'medium',
    clues: [
      'I was a fisherman working on the Sea of Galilee',
      'I was originally a follower of John the Baptist',
      'I brought a boy with five loaves and two fish to Jesus',
      'I immediately went to tell my brother about finding the Messiah',
      'My brother was Simon Peter, and I was one of the first disciples Jesus called',
    ],
  },
  {
    name: 'Bartholomew',
    difficulty: 'hard',
    clues: [
      'I am often identified with another name in John\'s Gospel',
      'A friend brought me to meet Jesus of Nazareth',
      'I was sceptical and asked if anything good could come from Nazareth',
      'Jesus saw me under a fig tree before we even met',
      'I am also known as Nathanael, and Jesus called me a true Israelite with no deceit',
    ],
  },
  {
    name: 'Cornelius',
    difficulty: 'hard',
    clues: [
      'I was a Roman military officer stationed in Caesarea',
      'I was devout, generous to the poor, and prayed to God regularly',
      'An angel appeared and told me to send for a specific man',
      'My conversion caused controversy because I was not Jewish',
      'I was the first Gentile to receive the Holy Spirit, after Peter came to my house',
    ],
  },
  {
    name: 'Herod',
    difficulty: 'medium',
    clues: [
      'I was known for grand building projects including a magnificent temple renovation',
      'Wise men from the East came to my palace asking about a newborn king',
      'The news of a rival king filled me with paranoia and rage',
      'I secretly plotted to find and eliminate this child',
      'I ordered the massacre of infant boys in Bethlehem to protect my throne',
    ],
  },
  {
    name: 'James (brother of Jesus)',
    difficulty: 'hard',
    clues: [
      'I did not believe my brother\'s claims during his earthly ministry',
      'After the resurrection, I became a devoted follower',
      'I rose to lead the church in Jerusalem',
      'I presided over the Jerusalem Council that welcomed Gentile believers',
      'I wrote a New Testament letter emphasising that faith without works is dead',
    ],
  },
  {
    name: 'John (apostle)',
    difficulty: 'medium',
    clues: [
      'I was a fisherman and the brother of another apostle',
      'Jesus nicknamed my brother and me "Sons of Thunder"',
      'I leaned against Jesus at the Last Supper',
      'I was entrusted with the care of Jesus\' mother at the cross',
      'I wrote a Gospel, three letters, and the book of Revelation',
    ],
  },
  {
    name: 'Joseph of Arimathea',
    difficulty: 'hard',
    clues: [
      'I was a wealthy and respected member of the Jewish ruling council',
      'I was secretly a disciple, too afraid to make it known publicly',
      'After the crucifixion, I found the courage to approach Pontius Pilate',
      'I asked for permission to take Jesus\' body down from the cross',
      'I placed Jesus in my own new tomb carved from rock',
    ],
  },
  {
    name: 'Judas Iscariot',
    difficulty: 'easy',
    clues: [
      'I was entrusted with managing the money for our group',
      'I complained about expensive perfume being poured out',
      'I secretly met with religious leaders to make a deal',
      'I identified my master with a kiss in a garden',
      'I betrayed Jesus for thirty pieces of silver',
    ],
  },
  {
    name: 'Luke',
    difficulty: 'medium',
    clues: [
      'I was a well-educated professional in the ancient world',
      'I was a close companion of Paul on his missionary travels',
      'I carefully researched and compiled an orderly account of events',
      'I wrote a Gospel and its sequel about the early church',
      'I was a physician and the author of Luke and Acts',
    ],
  },
  {
    name: 'Mark',
    difficulty: 'medium',
    clues: [
      'I was a young man from Jerusalem whose mother hosted early church gatherings',
      'I joined my cousin Barnabas and Paul on their first missionary journey',
      'I left the mission early and returned home, upsetting Paul',
      'Paul later said I was useful to him in ministry',
      'I wrote the shortest Gospel and my full name was John Mark',
    ],
  },
  {
    name: 'Mary Magdalene',
    difficulty: 'easy',
    clues: [
      'Jesus freed me from seven demons that tormented me',
      'I became one of his most devoted followers',
      'I stood at the foot of the cross when most others had fled',
      'I went to the tomb early on Sunday morning to anoint a body',
      'I was the first person to see and speak with the risen Jesus',
    ],
  },
  {
    name: 'Matthew',
    difficulty: 'medium',
    clues: [
      'I had a profession that made me despised by my own people',
      'I sat at a tax booth when a rabbi walked by and changed my life',
      'I left everything and threw a great banquet for Jesus',
      'I wrote a Gospel that traces Jesus\' lineage back to Abraham',
      'I was a tax collector who became one of the twelve apostles',
    ],
  },
  {
    name: 'Philip',
    difficulty: 'hard',
    clues: [
      'I was one of the seven deacons chosen in the early church',
      'I preached the good news in Samaria with great success',
      'The Spirit directed me to a desert road to meet a traveller',
      'I found an Ethiopian official reading Isaiah in his chariot',
      'I explained the Scriptures and baptised the Ethiopian eunuch right there on the road',
    ],
  },
  {
    name: 'Pontius Pilate',
    difficulty: 'easy',
    clues: [
      'I held authority over Judea under the Roman Empire',
      'A crowd brought a prisoner to me demanding execution',
      'I could find no fault in the man they accused',
      'I washed my hands publicly to show I wanted no part of his death',
      'I authorised the crucifixion of Jesus of Nazareth',
    ],
  },
  {
    name: 'Priscilla',
    difficulty: 'hard',
    clues: [
      'I was a tentmaker who worked alongside my husband',
      'I was forced to leave Rome when the emperor expelled all Jews',
      'I met Paul in Corinth and we worked together in ministry',
      'My husband and I privately taught a gifted preacher named Apollos more accurately',
      'I hosted a church in my home and am often mentioned before my husband Aquila',
    ],
  },
  {
    name: 'Silas',
    difficulty: 'hard',
    clues: [
      'I was a respected leader in the Jerusalem church',
      'I was chosen to deliver an important letter to Gentile believers',
      'I joined Paul on his second missionary journey after Barnabas departed',
      'I was beaten and thrown into prison in Philippi',
      'Paul and I sang hymns at midnight in prison before an earthquake opened the doors',
    ],
  },
  {
    name: 'Simon the Zealot',
    difficulty: 'hard',
    clues: [
      'I was part of a fiercely nationalistic movement before meeting Jesus',
      'My political background was the opposite of a tax collector\'s',
      'I became one of Jesus\' twelve chosen apostles',
      'Very little is recorded about me in the Gospels beyond my name',
      'I was called "the Zealot" to distinguish me from Simon Peter',
    ],
  },
  {
    name: 'Thomas',
    difficulty: 'medium',
    clues: [
      'I was one of the twelve apostles also known by a twin-related name',
      'I bravely said "Let us go and die with him" when Jesus went to raise Lazarus',
      'I asked Jesus how we could know the way to where he was going',
      'I refused to believe in the resurrection until I saw proof myself',
      'When I finally saw the risen Jesus, I exclaimed "My Lord and my God!"',
    ],
  },
  {
    name: 'Timothy',
    difficulty: 'medium',
    clues: [
      'I was raised in the faith by my mother Eunice and grandmother Lois',
      'I joined Paul\'s mission team as a young man from Lystra',
      'Paul called me his true son in the faith',
      'I was put in charge of leading the church in Ephesus',
      'Paul wrote two letters to me that are books of the New Testament',
    ],
  },
  {
    name: 'Titus',
    difficulty: 'hard',
    clues: [
      'I was a Gentile believer who became a trusted ministry partner',
      'Paul brought me to Jerusalem as proof that Gentiles could follow Christ',
      'I was sent to Corinth to help resolve conflicts in the church',
      'I was appointed to lead and organise the church on an island',
      'Paul wrote me a letter about church leadership while I served on Crete',
    ],
  },
  {
    name: 'The Samaritan Woman',
    difficulty: 'medium',
    clues: [
      'I went to draw water during the heat of the day to avoid other people',
      'A Jewish man startled me by asking me for a drink of water',
      'He told me about living water that would quench thirst for ever',
      'He revealed that he knew I had been married five times',
      'I met Jesus at Jacob\'s well and told my whole town about him',
    ],
  },
  {
    name: 'Dorcas',
    difficulty: 'hard',
    clues: [
      'I was a disciple who lived in the coastal city of Joppa',
      'I was known throughout my community for acts of kindness and charity',
      'I made clothing and garments for the widows and the poor',
      'When I died, my friends urgently sent for Peter',
      'Peter prayed over me and I was raised back to life, also known as Tabitha',
    ],
  },
  {
    name: 'Ananias (of Damascus)',
    difficulty: 'hard',
    clues: [
      'I was an ordinary disciple living in Damascus, Syria',
      'God spoke to me in a vision and gave me a terrifying assignment',
      'I was told to visit a man who was known for persecuting believers',
      'I laid my hands on a blind man and his sight was restored',
      'I baptised Saul of Tarsus, who would become the apostle Paul',
    ],
  },
  {
    name: 'Apollos',
    difficulty: 'hard',
    clues: [
      'I was a learned Jew from the great city of Alexandria in Egypt',
      'I was eloquent and had a thorough knowledge of the Scriptures',
      'I taught about Jesus enthusiastically but only knew John\'s baptism',
      'A husband-and-wife team pulled me aside to teach me more accurately',
      'Priscilla and Aquila mentored me, and I became a powerful preacher in Corinth',
    ],
  },
  {
    name: 'Elisha',
    difficulty: 'medium',
    clues: [
      'I was ploughing a field with twelve yoke of oxen when a prophet found me',
      'I asked for a double portion of my master\'s spirit before he departed',
      'I purified a poisonous pot of stew and made an axe head float',
      'I healed a foreign military commander by telling him to wash in a river',
      'I received Elijah\'s mantle and became his prophetic successor',
    ],
  },
  {
    name: 'Cain',
    difficulty: 'easy',
    clues: [
      'I was the firstborn son of the first man and woman',
      'I worked the soil and offered crops to God as a sacrifice',
      'I grew furious when God accepted my brother\'s offering but not mine',
      'God warned me that sin was crouching at my door',
      'I killed my brother Abel and was marked by God as a wanderer',
    ],
  },
  {
    name: 'Eliezer',
    difficulty: 'hard',
    clues: [
      'I was the chief servant of a wealthy patriarch',
      'My master sent me on a journey to find a bride for his son',
      'I prayed for a very specific sign involving water and camels',
      'A young woman fulfilled the sign exactly as I had asked',
      'I brought Rebekah back to marry Isaac, Abraham\'s son',
    ],
  },
  {
    name: 'Abigail',
    difficulty: 'hard',
    clues: [
      'I was married to a wealthy but foolish and harsh man',
      'When my husband insulted a powerful warrior, I acted quickly to prevent bloodshed',
      'I gathered provisions and rode out to meet the angry man\'s army',
      'My wisdom and humility stopped David from committing violence in anger',
      'After my husband Nabal died, David sent for me and I became his wife',
    ],
  },
];

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateOptions(correctName, allCharacters) {
  const otherNames = allCharacters
    .filter((c) => c.name !== correctName)
    .map((c) => c.name);
  const shuffled = shuffleArray(otherNames).slice(0, 3);
  const options = shuffleArray([correctName, ...shuffled]);
  return options;
}

export default function WhoAmIGame() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [options, setOptions] = useState([]);
  const [revealedClues, setRevealedClues] = useState(1);
  const [gameState, setGameState] = useState('playing');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [usedIndices, setUsedIndices] = useState([]);

  const resultAnim = useRef(new Animated.Value(0)).current;
  const clueAnims = useRef([]).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;

  const startNewRound = useCallback(() => {
    let allIndices = Array.from({ length: CHARACTERS.length }, (_, i) => i);
    let currentUsed = usedIndices;
    if (currentUsed.length >= CHARACTERS.length) {
      currentUsed = [];
      setUsedIndices([]);
    }
    const unusedIndices = allIndices.filter((i) => !currentUsed.includes(i));

    let preferredDifficulties;
    if (round <= 10) {
      preferredDifficulties = ['easy'];
    } else if (round <= 25) {
      preferredDifficulties = ['easy', 'medium'];
    } else {
      preferredDifficulties = ['easy', 'medium', 'hard'];
    }

    let filtered = unusedIndices.filter((i) =>
      preferredDifficulties.includes(CHARACTERS[i].difficulty)
    );
    if (filtered.length === 0) {
      filtered = unusedIndices;
    }

    const idx = filtered[Math.floor(Math.random() * filtered.length)];
    const character = CHARACTERS[idx];

    setUsedIndices((prev) => [...prev, idx]);
    setCurrentCharacter(character);
    setOptions(generateOptions(character.name, CHARACTERS));
    setRevealedClues(1);
    setGameState('playing');
    setSelectedAnswer(null);
    resultAnim.setValue(0);

    clueAnims.length = 0;
    character.clues.forEach(() => {
      clueAnims.push(new Animated.Value(0));
    });
    Animated.timing(clueAnims[0], {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [usedIndices, round, resultAnim, clueAnims]);

  useEffect(() => {
    startNewRound();
  }, []);

  const handleRevealClue = useCallback(() => {
    if (!currentCharacter || revealedClues >= currentCharacter.clues.length) return;
    hapticFeedback.light();
    const nextIdx = revealedClues;
    setRevealedClues(nextIdx + 1);
    if (clueAnims[nextIdx]) {
      Animated.timing(clueAnims[nextIdx], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [currentCharacter, revealedClues, clueAnims]);

  const handleAnswer = useCallback(
    (answer) => {
      if (gameState !== 'playing' || !currentCharacter) return;

      setSelectedAnswer(answer);

      if (answer === currentCharacter.name) {
        hapticFeedback.success();
        const pts = Math.max(1, 5 - revealedClues);
        setScore((prev) => prev + pts);
        setGameState('correct');
        Animated.sequence([
          Animated.timing(scoreAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(scoreAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      } else {
        hapticFeedback.error();
        setGameState('wrong');
      }

      Animated.spring(resultAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    },
    [gameState, currentCharacter, revealedClues, resultAnim, scoreAnim]
  );

  const handleNextRound = useCallback(() => {
    hapticFeedback.light();
    setRound((prev) => prev + 1);
    startNewRound();
  }, [startNewRound]);

  if (!currentCharacter) return null;

  const bg = theme.background || (isDark ? '#0a0a1a' : '#f5f5ff');
  const textColor = theme.text || (isDark ? '#ffffff' : '#1a1a2e');
  const primary = theme.primary || '#6C63FF';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  const pointsForCurrentClue = Math.max(1, 5 - revealedClues);
  const canRevealMore = revealedClues < currentCharacter.clues.length && gameState === 'playing';

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
        <Text style={[styles.title, { color: textColor }]}>Who Am I?</Text>
        <Animated.View style={[styles.scoreContainer, { backgroundColor: cardBg, transform: [{ scale: scoreAnim }] }]}>
          <MaterialIcons name="stars" size={18} color={primary} />
          <Text style={[styles.scoreText, { color: textColor }]}>{score}</Text>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topInfo}>
          <View style={[styles.roundBadge, { backgroundColor: isDark ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.1)' }]}>
            <Text style={[styles.roundText, { color: primary }]}>Round {round}</Text>
          </View>
          {gameState === 'playing' && (
            <View style={[styles.pointsBadge, { backgroundColor: isDark ? 'rgba(255,214,10,0.15)' : 'rgba(255,214,10,0.12)' }]}>
              <MaterialIcons name="bolt" size={16} color="#FFB800" />
              <Text style={[styles.pointsText, { color: '#FFB800' }]}>{pointsForCurrentClue} pts</Text>
            </View>
          )}
        </View>

        <View style={[styles.cluesCard, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={styles.cluesHeader}>
            <MaterialIcons name="person-search" size={22} color={primary} />
            <Text style={[styles.cluesTitle, { color: textColor }]}>Clues</Text>
            <Text style={[styles.clueCount, { color: subtleText }]}>
              {revealedClues}/{currentCharacter.clues.length}
            </Text>
          </View>

          {currentCharacter.clues.map((clue, idx) => {
            if (idx >= revealedClues && gameState === 'playing') return null;
            const anim = clueAnims[idx];
            const isRevealed = idx < revealedClues;
            const opacity = (anim && isRevealed) ? anim : new Animated.Value(1);
            return (
              <Animated.View
                key={idx}
                style={[
                  styles.clueRow,
                  {
                    opacity,
                    transform: [
                      {
                        translateX: opacity.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.clueNumber,
                    {
                      backgroundColor: isDark
                        ? 'rgba(108,99,255,0.2)'
                        : 'rgba(108,99,255,0.12)',
                    },
                  ]}
                >
                  <Text style={[styles.clueNumberText, { color: primary }]}>{idx + 1}</Text>
                </View>
                <Text style={[styles.clueText, { color: textColor }]}>"{clue}"</Text>
              </Animated.View>
            );
          })}

          {canRevealMore && (
            <TouchableOpacity
              onPress={handleRevealClue}
              activeOpacity={0.7}
              style={[styles.revealButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
            >
              <MaterialIcons name="visibility" size={18} color={primary} />
              <Text style={[styles.revealText, { color: primary }]}>
                Reveal Next Clue (-1 pt)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {gameState === 'playing' && (
          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => handleAnswer(option)}
                activeOpacity={0.7}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {gameState !== 'playing' && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                backgroundColor: gameState === 'correct'
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
              name={gameState === 'correct' ? 'celebration' : 'close'}
              size={48}
              color={gameState === 'correct' ? '#34C759' : '#FF3B30'}
            />
            <Text style={[styles.resultTitle, { color: textColor }]}>
              {gameState === 'correct' ? 'Correct!' : 'Not Quite!'}
            </Text>
            <Text style={[styles.resultAnswer, { color: primary }]}>
              {currentCharacter.name}
            </Text>

            {gameState === 'correct' && (
              <Text style={[styles.resultPoints, { color: subtleText }]}>
                +{Math.max(1, 5 - revealedClues)} points ({revealedClues} clue{revealedClues !== 1 ? 's' : ''} used)
              </Text>
            )}

            {gameState === 'wrong' && (
              <View style={styles.allCluesWrap}>
                {currentCharacter.clues.map((clue, idx) => (
                  <Text key={idx} style={[styles.reviewClue, { color: subtleText }]}>
                    {idx + 1}. {clue}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={handleNextRound} activeOpacity={0.8}>
              <LinearGradient
                colors={[primary, isDark ? '#8B83FF' : '#5A52E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>Next Character</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
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
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  roundBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cluesCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  cluesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cluesTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  clueCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  clueNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  clueNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clueText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  revealText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionsGrid: {
    gap: 10,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  resultAnswer: {
    fontSize: 28,
    fontWeight: '800',
  },
  resultPoints: {
    fontSize: 14,
    fontWeight: '500',
  },
  allCluesWrap: {
    alignSelf: 'stretch',
    gap: 6,
    marginTop: 4,
  },
  reviewClue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
