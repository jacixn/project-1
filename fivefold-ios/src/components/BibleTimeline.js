import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Image,
  StatusBar,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');
const screenHeight = Dimensions.get('screen').height;

const BibleTimeline = ({ visible, onClose, onNavigateToVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedEra, setSelectedEra] = useState(null);
  const [panX] = useState(new Animated.Value(0));
  const [panY] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(1));
  const [bubbleAnimations] = useState(
    Array.from({ length: 14 }, () => ({
      float: new Animated.Value(0),
      pulse: new Animated.Value(1),
    }))
  );

  // BIBLE TIMELINE - The Epic Journey!
  const timelineData = [
    {
      id: 'creation',
      title: 'CREATION & EARLY WORLD',
      subtitle: 'Genesis 1–11',
      emoji: '🌍',
      bgEmoji: '✨',
      color: '#E91E63',
      gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
      position: { x: width * 0.25, y: 40 },
      size: 120,
      description: 'The amazing beginning of everything! From God creating the universe to humanity\'s first steps - and mistakes. This is where all the epic Bible adventures start!',
      stories: [
        {
          title: 'God Creates Everything!',
          when: 'Way back at the very beginning (some people think around 4000 BC, but nobody knows for sure!)',
          bibleStory: 'Genesis 1:1-31',
          characters: 'God, Adam, and Eve',
          story: 'In just six days, God made EVERYTHING - the whole universe, our planet Earth, all the animals, plants, and the very first people named Adam and Eve. He made them special, just like Him! This is where everything started.'
        },
        {
          title: 'Paradise: The Perfect Garden',
          when: 'Right after God made Adam and Eve',
          bibleStory: 'Genesis 2:8-25',
          characters: 'Adam and Eve',
          story: 'God made the most amazing garden called Eden - think of the most beautiful park you\'ve ever seen, but a million times better! Adam and Eve got to take care of it and hang out with God every day. It was perfect! God also created marriage here and gave them just one rule: "Don\'t eat fruit from that one special tree."'
        },
        {
          title: 'The Big Mistake',
          when: 'Still in the very early days of people',
          bibleStory: 'Genesis 3:1-24',
          characters: 'Adam, Eve, and a sneaky snake (which was really Satan in disguise)',
          story: 'A tricky snake convinced Eve to eat the forbidden fruit, and she shared it with Adam. This was the first time people disobeyed God, and it changed EVERYTHING. Suddenly they felt ashamed and had to leave their perfect garden home. This mistake brought sadness and death into the world, but God already had a plan to fix it.'
        },
        {
          title: 'The First Murder',
          when: 'Early human history (maybe before 3000 BC)',
          bibleStory: 'Genesis 4:1-16',
          characters: 'Cain and Abel (Adam and Eve\'s sons)',
          story: 'Cain and Abel were brothers who both gave gifts to God. God liked Abel\'s gift better, which made Cain super jealous. In his anger, Cain killed his own brother! God punished Cain by making him wander around with no home. This shows how quickly people started making really bad choices after leaving Eden.'
        },
        {
          title: 'The Great Flood and Noah\'s Huge Boat',
          when: 'Nobody knows exactly, but maybe around 2348 BC',
          bibleStory: 'Genesis 6-8',
          characters: 'Noah and his family (8 people total)',
          story: 'People became so mean and evil that God decided to start over with a giant flood that covered the whole earth. But Noah was a good guy, so God told him to build a MASSIVE boat (called an ark) and bring his family plus two of every kind of animal. It rained for 40 days and 40 nights! Only the people and animals on the boat survived. This shows that God doesn\'t let evil go on forever, but He saves those who follow Him.'
        },
        {
          title: 'God\'s Colorful Promise',
          when: 'Right after the flood ended',
          bibleStory: 'Genesis 9:8-17',
          characters: 'Noah and God',
          story: 'When Noah and everyone got off the boat, God made an amazing promise: "I will NEVER flood the whole earth again!" And to help everyone remember this promise, God put the very first rainbow in the sky. Every time we see a rainbow, we can remember that God keeps His promises!'
        },
        {
          title: 'The Tower That Reached Too High',
          when: 'Maybe around 2100 BC',
          bibleStory: 'Genesis 11:1-9',
          characters: 'All the people living then (Noah\'s descendants)',
          story: 'Back then, everyone spoke the same language. They got really proud and decided to build the tallest tower ever to show off how awesome they were. God wasn\'t happy about their pride, so He mixed up their languages so they couldn\'t understand each other anymore! The people scattered all over the earth, which is why we have so many different languages today. This shows that God is in charge, not people.'
        }
      ],
      connections: ['patriarchs']
    },
    {
      id: 'patriarchs',
      title: 'THE PATRIARCHS',
      subtitle: 'Genesis 12–50, Job',
      emoji: '👨‍👩‍👧‍👦',
      bgEmoji: '⭐',
      color: '#FF9800',
      gradient: ['#FFB74D', '#FF9800', '#F57C00'],
      position: { x: width * 0.75, y: 180 },
      size: 120,
      description: 'God chooses Abraham and his family for an incredible adventure! Through Abraham, Isaac, Jacob, and Joseph, God builds His special nation and shows His amazing faithfulness.',
      stories: [
        {
          title: 'God Calls Abraham on an Amazing Adventure',
          when: 'Around 2090-2080 BC',
          bibleStory: 'Genesis 12:1-9',
          characters: 'Abram (later called Abraham), Sarai (later called Sarah), and God',
          story: 'God told a man named Abram, "Leave your home and family and go to a new land I\'ll show you. I\'m going to make you famous and give you TONS of descendants, and through your family, I\'ll bless the whole world!" So Abram packed up everything and started walking to this mysterious new place called Canaan. This was the beginning of God\'s special plan to save the world through Abraham\'s family.'
        },
        {
          title: 'God Makes a Super Important Promise',
          when: 'Around 2080-2070 BC',
          bibleStory: 'Genesis 15 and 17:1-8',
          characters: 'Abraham and God',
          story: 'God made an official promise (called a covenant) with Abraham: "I\'ll give you more descendants than stars in the sky, this whole land will belong to your family, and through you I\'ll bless everyone on Earth!" God even changed Abram\'s name to "Abraham" (meaning "father of many") and Sarai\'s name to "Sarah." He also gave them a special sign called circumcision to remember this promise forever.'
        },
        {
          title: 'Abraham Gets Impatient and Has a Baby the Wrong Way',
          when: 'Around 2080 BC',
          bibleStory: 'Genesis 16:1-16',
          characters: 'Abraham, Hagar (Sarah\'s helper), baby Ishmael, and Sarah',
          story: 'Abraham and Sarah got tired of waiting for God\'s promised baby, so Sarah told Abraham to have a baby with her servant Hagar instead. The baby was named Ishmael, and he became the father of the Arab people. But this caused a lot of family drama! God said, "I\'ll bless Ishmael too, but my special promise will come through Sarah\'s baby, not this one."'
        },
        {
          title: 'God Destroys Two Really Evil Cities',
          when: 'Around 2067 BC',
          bibleStory: 'Genesis 19:24-29',
          characters: 'Abraham and his nephew Lot',
          story: 'Two cities called Sodom and Gomorrah were SO evil that God decided to destroy them with fire from the sky! But first, angels rescued Abraham\'s nephew Lot and his family. Unfortunately, Lot\'s wife looked back at the burning cities when she wasn\'t supposed to, and she turned into a pillar of salt! This shows that God punishes evil but saves good people.'
        },
        {
          title: 'The Miracle Baby Finally Arrives!',
          when: '2066 BC',
          bibleStory: 'Genesis 21:1-7',
          characters: 'Abraham, Sarah, and baby Isaac',
          story: 'When Abraham was 100 years old and Sarah was 90 (that\'s REALLY old!), God gave them the baby He promised - Isaac! Sarah laughed because she couldn\'t believe she was having a baby at her age. Isaac\'s birth proved that God always keeps His promises, even when it seems impossible.'
        },
        {
          title: 'The Scariest Test Ever',
          when: 'Around 2054 BC',
          bibleStory: 'Genesis 22:1-18',
          characters: 'Abraham and Isaac',
          story: 'God gave Abraham the hardest test imaginable - He told him to sacrifice his beloved son Isaac! Abraham trusted God so much that he was actually going to do it. But right at the last second, God stopped him and provided a ram (sheep) to sacrifice instead. This showed that Abraham had incredible faith, and it was a sneak peek of how God would one day provide Jesus as a sacrifice for everyone\'s sins.'
        },
        {
          title: 'Isaac Gets the Perfect Wife',
          when: '2026 BC',
          bibleStory: 'Genesis 24:62-67',
          characters: 'Isaac, Rebekah, and Abraham\'s servant',
          story: 'Abraham sent his trusted servant on a mission to find the perfect wife for Isaac. Through an amazing series of events (and lots of prayer!), the servant found Rebekah. She was kind, beautiful, and loved God. When Isaac met her, it was love at first sight! Their marriage continued God\'s special family line.'
        },
        {
          title: 'The Twin Brothers Who Couldn\'t Get Along',
          when: '2006 BC to around 1978 BC',
          bibleStory: 'Genesis 25:21-34 and 27:1-40',
          characters: 'Jacob, Esau, Isaac, and Rebekah',
          story: 'Isaac and Rebekah had twin boys - hairy Esau (who loved hunting) and smooth Jacob (who was sneaky). Even before they were born, God chose Jacob to carry on His promise. Jacob was so tricky that he bought Esau\'s inheritance for a bowl of soup and later disguised himself to steal Esau\'s blessing from their blind father! Esau was so mad he wanted to kill Jacob. This started the rivalry between Israel (Jacob\'s descendants) and Edom (Esau\'s descendants).'
        },
        {
          title: 'Jacob\'s BIG Family - The Start of 12 Tribes',
          when: 'Around 1920-1900 BC',
          bibleStory: 'Genesis 29-30',
          characters: 'Jacob, his wives Leah and Rachel, and his uncle Laban',
          story: 'Jacob ran away from angry Esau and lived with his uncle Laban. There he married two sisters, Leah and Rachel (after being tricked into marrying Leah first!). Through his wives and their servants, Jacob ended up with 12 sons and 1 daughter. These 12 sons became the founders of the 12 tribes of Israel! Even though the family had lots of drama and problems, God was building His special nation.'
        },
        {
          title: 'Jacob Wrestles with God and Gets a New Name',
          when: 'Around 1906 BC',
          bibleStory: 'Genesis 32:24-32 and 35:9-12',
          characters: 'Jacob (who becomes Israel)',
          story: 'On his way back home, Jacob spent a whole night wrestling with a mysterious man who was actually God in human form! Jacob wouldn\'t give up, even though his hip got hurt. God was so impressed with Jacob\'s determination that He gave him a new name: "Israel," which means "he wrestles with God." This is where the nation of Israel got its name!'
        },
        {
          title: 'Joseph and His Amazing Colorful Coat',
          when: 'Around 1898 BC',
          bibleStory: 'Genesis 37:3-28',
          characters: 'Joseph and his 11 brothers',
          story: 'Jacob loved his son Joseph SO much that he gave him a beautiful, colorful coat. This made Joseph\'s brothers super jealous, especially when Joseph told them about dreams where they all bowed down to him! The brothers got so mad they sold Joseph as a slave to traders going to Egypt. Then they lied to their dad and said Joseph was dead. It seemed terrible, but God had a secret plan!'
        },
        {
          title: 'From Slave to Super Important Leader',
          when: 'Around 1886-1875 BC',
          bibleStory: 'Genesis 41:37-45 and 45:1-8',
          characters: 'Joseph and Pharaoh (the king of Egypt)',
          story: 'Even as a slave in Egypt, God blessed Joseph. He became famous for explaining dreams! When Pharaoh had scary dreams about a coming famine (time with no food), Joseph explained them and helped save Egypt by storing food. Pharaoh was so impressed he made Joseph his second-in-command! When the famine came, Joseph\'s brothers came to buy food and got the shock of their lives when they discovered their "dead" brother was now one of the most powerful men in Egypt! Joseph forgave them and said, "You meant it for evil, but God used it for good!"'
        },
        {
          title: 'The Whole Family Moves to Egypt',
          when: 'Around 1875 BC',
          bibleStory: 'Genesis 46:1-7 and 47:11-12',
          characters: 'Jacob (Israel), Joseph, and Pharaoh',
          story: 'Because of the terrible famine, Joseph invited his whole family (70 people!) to move to Egypt where there was plenty of food. Pharaoh gave them the best land in Egypt, called Goshen. This move fulfilled God\'s earlier prediction that Abraham\'s descendants would live in a foreign country for a while. It was the beginning of the Israelites becoming a huge nation - but also the start of future troubles in Egypt.'
        },
        {
          title: 'Joseph\'s Death and Final Wish',
          when: '1806 BC',
          bibleStory: 'Genesis 50:22-26',
          characters: 'Joseph and his brothers',
          story: 'Joseph lived to be 110 years old and saw his great-great-grandchildren! Before he died, he made his family promise something important: "When God brings you back to the Promised Land someday, take my bones with you!" Joseph believed God\'s promises so much that even in death, he wanted to be buried in the land God promised Abraham. His death ended the Patriarch era, but by then, the Israelites had grown into a huge family living in Egypt.'
        }
      ],
      connections: ['exodus']
    },
    {
      id: 'exodus',
      title: 'THE GREAT EXODUS',
      subtitle: 'Moses and the Escape from Egypt',
      emoji: '🌊',
      bgEmoji: '⚡',
      color: '#F44336',
      gradient: ['#FF6B6B', '#F44336', '#D32F2F'],
      position: { x: width * 1.25, y: 40 },
      size: 120,
      description: 'The most epic rescue mission in history! God uses Moses to free His people from slavery in Egypt through incredible miracles and shows His awesome power to the whole world.',
      stories: [
        {
          title: 'God\'s People Become Slaves',
          when: '1800s-1500s BC',
          bibleStory: 'Exodus 1:6-14',
          characters: 'The Israelites and a mean new Pharaoh (king of Egypt)',
          story: 'After Joseph died, the Israelites kept having lots and lots of babies until there were TONS of them living in Egypt. But a new Pharaoh came to power who didn\'t remember how Joseph saved Egypt. He got scared that there were so many Israelites and thought, "What if they fight against us?" So he made them all slaves and forced them to work super hard making bricks and building cities. Then he got even meaner and ordered his soldiers to kill all the Hebrew baby boys! This terrible time was actually part of God\'s plan that He had told Abraham about long ago.'
        },
        {
          title: 'A Baby Hidden in a Basket',
          when: 'Around 1526 BC',
          bibleStory: 'Exodus 2:1-10',
          characters: 'Baby Moses, his mom Jochebed, his sister Miriam, and Pharaoh\'s daughter',
          story: 'During the scary time when soldiers were killing Hebrew babies, a Levite woman had a beautiful baby boy. She hid him for three months, but then he got too big and noisy! So she put him in a waterproof basket and floated it among the reeds by the river. Pharaoh\'s daughter found the basket while taking a bath and felt sorry for the crying baby. Miriam (Moses\' sister) was watching and cleverly suggested that Pharaoh\'s daughter hire a Hebrew woman to nurse the baby - and that woman was actually Moses\' own mom! So Moses grew up as Egyptian royalty but knew he was really a Hebrew. God had an amazing plan for this baby!'
        },
        {
          title: 'God Speaks from a Burning Bush',
          when: 'Around 1446 BC',
          bibleStory: 'Exodus 3:1-14',
          characters: 'Moses and God',
          story: 'After Moses grew up, he had to run away from Egypt and became a shepherd for 40 years! One day, he saw something incredible - a bush that was on fire but wasn\'t burning up! When he went to look closer, God spoke to him from the bush! God said, "Moses, I\'ve seen how badly my people are being treated in Egypt. I want YOU to go back and lead them out of slavery!" Moses was scared and made lots of excuses, but God said, "Don\'t worry, I\'ll be with you. My name is \'I AM\' - I\'m the God who always exists and keeps promises!" This was the beginning of the greatest rescue mission ever!'
        },
        {
          title: 'Ten Terrible Plagues Hit Egypt',
          when: 'Around 1446 BC',
          bibleStory: 'Exodus 7-12',
          characters: 'Moses, his brother Aaron, and stubborn Pharaoh',
          story: 'Moses and Aaron went to Pharaoh and said, "God says, \'Let My people go!\'" But Pharaoh said, "NO WAY!" So God sent ten awful plagues to show His power: 1) River turned to blood, 2) Millions of frogs everywhere, 3) Tiny gnats covering everything, 4) Swarms of flies, 5) All Egyptian animals got sick and died, 6) Painful boils on everyone, 7) Destructive hailstorm, 8) Locusts ate all the crops, 9) Complete darkness for three days, and finally 10) Death of every firstborn Egyptian (including Pharaoh\'s own son). Each time, Pharaoh would say he\'d let the Israelites go, but then change his mind! These plagues showed that God was way more powerful than all of Egypt\'s fake gods.'
        },
        {
          title: 'The First Passover - A Night to Remember Forever',
          when: '1446 BC, on the 14th day of Nisan',
          bibleStory: 'Exodus 12:1-14',
          characters: 'Moses and all the Israelites',
          story: 'Before the terrible 10th plague (death of the firstborn), God gave the Israelites special instructions: "Each family must kill a perfect lamb and paint its blood on your door frame. When I see the blood, I\'ll \'pass over\' your house and your firstborn will be safe." They also had to eat the lamb with unleavened bread (bread without yeast) and bitter herbs, and be ready to leave Egypt at any moment. That night, every Egyptian firstborn died, but God\'s people were safe because of the lamb\'s blood on their doors. This became the Passover meal that Jewish people still celebrate today, and it pointed forward to how Jesus (the perfect Lamb) would save us with His blood!'
        },
        {
          title: 'The Amazing Red Sea Crossing',
          when: '1446 BC',
          bibleStory: 'Exodus 12:31-42 and 14:1-31',
          characters: 'Moses, Pharaoh, and about 2 million Israelites',
          story: 'Finally, Pharaoh let God\'s people go! About 600,000 men plus their families (around 2 million people total!) left Egypt after being there for 430 years. But then Pharaoh changed his mind AGAIN and sent his whole army to bring them back! The Israelites were trapped - Red Sea in front, Egyptian army behind. It looked hopeless! But Moses said, "Don\'t be afraid! God will fight for you!" Then God did the most amazing miracle - He split the Red Sea in half so the Israelites could walk across on dry ground with walls of water on both sides! When the Egyptian army tried to follow, God let the walls of water crash back down, and all the soldiers drowned. The Israelites were finally free!'
        },
        {
          title: 'God Gives the Ten Commandments',
          when: '1446 BC',
          bibleStory: 'Exodus 19-20 and 24',
          characters: 'Moses, the Israelites, and God',
          story: 'Three months after escaping Egypt, the Israelites camped at the bottom of Mount Sinai. The mountain was covered with smoke, fire, and lightning - God was there! God called Moses up to the top and gave him the Ten Commandments and lots of other laws written on stone tablets. These weren\'t just rules to make life hard - they were God\'s instructions for how to live happily and safely. The Ten Commandments included things like "Love God most," "Don\'t worship idols," "Don\'t murder," "Don\'t steal," and "Honor your parents." The people promised to obey all of God\'s laws. This made them officially God\'s special nation with their own constitution!'
        },
        {
          title: 'The Terrible Golden Calf Mistake',
          when: '1446 BC',
          bibleStory: 'Exodus 32:1-20',
          characters: 'Moses, Aaron, and the Israelites',
          story: 'While Moses was up on the mountain for 40 days getting God\'s laws, the people got impatient and said to Aaron, "We don\'t know what happened to Moses! Make us a god to worship!" So Aaron collected everyone\'s gold jewelry and made a golden calf statue. The people said, "This is the god who brought us out of Egypt!" and threw a wild party around it. God was FURIOUS and wanted to destroy them all, but Moses begged God to forgive them. When Moses came down and saw what they were doing, he was so angry he smashed the stone tablets and melted the golden calf! Many people died as punishment for this terrible sin. It showed how quickly people can forget God\'s goodness and start worshiping fake gods instead.'
        },
        {
          title: 'Too Scared to Enter the Promised Land',
          when: 'Around 1445 BC',
          bibleStory: 'Numbers 13-14',
          characters: 'Moses, Joshua, Caleb, and ten other spies',
          story: 'When the Israelites finally reached the border of the Promised Land (Canaan), Moses sent 12 men to spy out the land and see what it was like. They came back with HUGE grapes and said, "The land is amazing - it really does flow with milk and honey!" But ten of the spies said, "The people there are GIANTS! We looked like grasshoppers next to them! We can\'t possibly win!" Only Joshua and Caleb said, "Don\'t be afraid! God is with us - He\'ll help us win!" Sadly, the people believed the ten scared spies instead of trusting God. God was so disappointed that He said, "Fine! You\'ll wander in the desert for 40 years until all the adults who didn\'t trust me have died. Only your children (and Joshua and Caleb) will get to enter the Promised Land."'
        },
        {
          title: '40 Years of Wandering in the Desert',
          when: '1446-1406 BC (40 long years!)',
          bibleStory: 'Numbers 14:26-35 and Deuteronomy 8:2-4',
          characters: 'Moses, Aaron, Joshua, Caleb, and all the Israelites',
          story: 'For 40 years, about 2 million people lived like nomads in the desert! But God took amazing care of them - He gave them a pillar of cloud to follow during the day and a pillar of fire at night. Every morning, He provided special bread called "manna" that appeared on the ground like dew. He also gave them quail (birds) to eat for meat, and their clothes and sandals never wore out! When they needed water, God provided it from rocks. During these 40 years, all the adults who refused to trust God died (except Joshua and Caleb), and their children grew up learning to depend on God for everything they needed.'
        },
        {
          title: 'Moses Makes a Costly Mistake',
          when: 'Around 1407 BC',
          bibleStory: 'Numbers 20:7-13',
          characters: 'Moses, Aaron, and the complaining Israelites',
          story: 'Near the end of the 40 years, the people ran out of water again and started complaining to Moses, "Why did you bring us out here to die?" Moses was getting really tired of their constant complaining! God told Moses, "Speak to that rock, and water will come out." But Moses was so frustrated that instead of speaking to the rock, he hit it twice with his stick and yelled at the people, "Must we bring water out of this rock for you rebels?" Water gushed out, but God was not happy. He said to Moses and Aaron, "Because you didn\'t honor me as holy in front of the people, you won\'t be allowed to enter the Promised Land either." Even great leaders like Moses have to obey God!'
        },
        {
          title: 'Moses Says Goodbye',
          when: '1406 BC',
          bibleStory: 'Deuteronomy 34:1-8',
          characters: 'Moses, Joshua, and God',
          story: 'At the end of 40 years, Moses was 120 years old but still strong and healthy. God took him up to the top of Mount Nebo and showed him the beautiful Promised Land spread out below. God said, "This is the land I promised to Abraham, Isaac, and Jacob. I\'m letting you see it, but you can\'t enter because of your disobedience at the rock." Then Moses died on that mountain, and God Himself buried him. The people cried for 30 days because Moses had been such an amazing leader. Joshua became the new leader to take the people into the Promised Land. Moses was the greatest prophet who ever lived - no one else ever knew God face to face like Moses did!'
        }
      ],
      connections: ['conquest']
    },
    {
      id: 'conquest',
      title: 'THE CONQUEST OF CANAAN',
      subtitle: 'Joshua Leads the Charge!',
      emoji: '⚔️',
      bgEmoji: '🏆',
      color: '#4CAF50',
      gradient: ['#66BB6A', '#4CAF50', '#388E3C'],
      position: { x: width * 1.75, y: 180 },
      size: 120,
      description: 'The ultimate battle campaign! Joshua leads God\'s people to conquer the Promised Land through incredible victories and miraculous interventions. The land promise finally fulfilled!',
      stories: [
        {
          title: 'Another Amazing River Crossing',
          when: '1406 BC',
          bibleStory: 'Joshua 3:7-17',
          characters: 'Joshua, the Israelites, and priests carrying the Ark of the Covenant',
          story: 'After 40 years in the desert, it was finally time to enter the Promised Land! But there was one big problem - the Jordan River was completely flooded and impossible to cross. Sound familiar? Just like at the Red Sea, God had an amazing plan! He told the priests to carry the special golden box called the Ark of the Covenant and step right into the rushing water. The moment their feet touched the water, the whole river stopped flowing and piled up like a wall! All 2 million Israelites walked across on completely dry ground. To help everyone remember this incredible miracle, they stacked up 12 big stones at a place called Gilgal. This miracle proved to everyone (including their enemies) that God was still with His people and that Joshua was their new leader!'
        },
        {
          title: 'The Walls Come Tumbling Down',
          when: '1406 BC',
          bibleStory: 'Joshua 6:1-20',
          characters: 'Joshua, Rahab the helpful woman, and the Israelites',
          story: 'The city of Jericho had massive walls and was locked up tight - nobody could get in or out because they were terrified of the Israelites! But God gave Joshua the weirdest battle plan ever: "March around the city once a day for six days. Don\'t say a word - just walk. On the seventh day, march around seven times, then have the priests blow their trumpets and everyone SHOUT as loud as you can!" It sounded crazy, but Joshua obeyed. On the seventh day, when the people shouted and the trumpets blared, the giant walls collapsed completely flat! The Israelites rushed in and captured the city. The only people who survived were Rahab and her family because she had helped the Israelite spies earlier. This victory showed that God would win their battles for them, not their own strength!'
        },
        {
          title: 'The Day the Sun Stood Still',
          when: 'Around 1405 BC',
          bibleStory: 'Joshua 10:7-14',
          characters: 'Joshua and five enemy kings',
          story: 'Some people called Gibeonites had made peace with Israel, which made five powerful Amorite kings really mad. These kings decided to attack Gibeon to punish them. The Gibeonites sent a message to Joshua: "Help us! We\'re your allies!" So Joshua and his army marched all night to surprise the enemy. During the battle, Joshua prayed one of the most amazing prayers ever: "Sun, stand still over Gibeon!" And God actually made the sun stop moving across the sky for about a whole extra day so the Israelites could finish winning the battle! God also threw huge hailstones from heaven that killed more enemies than the Israelite swords did. This incredible miracle showed that the Lord of the whole universe was fighting for Israel!'
        },
        {
          title: 'Conquering the Land and Dividing It Up',
          when: '1406-1399 BC',
          bibleStory: 'Joshua 11:23 and 18:1',
          characters: 'Joshua, Caleb, and all the tribes of Israel',
          story: 'For about 7 years, Joshua led the Israelites in battle after battle, defeating many Canaanite kings and capturing most of the Promised Land! They had three major military campaigns - central, southern, and northern - and won them all with God\'s help. When most of the fighting was done, it was time for the fun part: dividing up the land! Joshua gathered all the tribes at a place called Shiloh (where they set up the Tabernacle) and used a special method called "casting lots" (kind of like drawing names from a hat, but God controlled the results) to give each of the 12 tribes their own piece of land. Finally, after hundreds of years, God\'s promise to Abraham was coming true - his descendants had their own land! However, they didn\'t drive out ALL the Canaanites, which would cause problems later.'
        },
        {
          title: 'Joshua\'s Final Speech and Death',
          when: 'Around 1380 BC',
          bibleStory: 'Joshua 23:1-16 and 24:14-29',
          characters: 'Joshua and all the people of Israel',
          story: 'When Joshua was very old (110 years!), he gathered all the Israelites together for one last important meeting. He reminded them of all the amazing things God had done for them and gave them a serious warning: "God has been faithful to you, so you must be faithful to Him! Get rid of any idols and serve only the Lord!" Then Joshua said the famous words that people still remember today: "Choose this day whom you will serve... but as for me and my house, we will serve the Lord!" All the people promised, "We will serve the Lord our God and obey Him!" Shortly after this, Joshua died. As long as Joshua and the other old leaders who remembered Egypt were alive, the people served God faithfully. But Joshua\'s death marked the end of having one strong leader for all of Israel, and things were about to get much more complicated!'
        }
      ],
      connections: ['judges']
    },
    {
      id: 'judges',
      title: 'THE TIME OF THE JUDGES',
      subtitle: 'Heroes and Chaos!',
      emoji: '⚖️',
      bgEmoji: '🗡️',
      color: '#9B59B6',
      gradient: ['#9B59B6', '#BB8FCE'],
      position: { x: width * 2.25, y: 40 },
      size: 120,
      description: 'After Joshua died, the Israelites kept forgetting God and getting into trouble! God sent special heroes called Judges to rescue them over and over again. It was a wild time of cycles: sin, suffering, crying out to God, and then God sending a hero to save them!',
      stories: [
        {
          title: 'The Crazy Cycle Begins',
          when: 'Around 1375 BC',
          bibleStory: 'Judges 2:10-19',
          characters: 'Othniel (the first judge) and many others',
          story: 'After Joshua and all the old leaders died, something terrible happened - the Israelites forgot about God! They started worshiping the fake gods of their Canaanite neighbors instead. So God allowed enemy nations to attack and make life miserable for the Israelites. When things got really bad, the people would cry out, "Help us, God!" and God would feel sorry for them and send a special hero called a "judge" to rescue them. But then, after the judge died, the people would forget God again and the whole cycle would start over! This went on for over 300 years. The Bible says "everyone did what was right in his own eyes" - which means total chaos because people weren\'t following God\'s rules anymore.'
        },
        {
          title: 'Deborah and the Tent Peg Victory',
          when: 'Around 1200 BC',
          bibleStory: 'Judges 4-5',
          characters: 'Deborah (a female judge), Barak the general, Sisera the enemy commander, and Jael',
          story: 'During this crazy time, God chose a woman named Deborah to be a judge and prophet - which was pretty unusual back then! The Canaanite king Jabin had 900 iron chariots and was bullying Israel big time. Deborah told a general named Barak, "God says to attack with 10,000 men!" Barak was scared and said, "I\'ll only go if you come with me!" Deborah agreed but said, "Fine, but the victory will go to a woman, not you." In the battle, God confused the enemy army and their chariots got stuck in the mud! The enemy commander Sisera ran away on foot, but he made a BIG mistake - he hid in the tent of a woman named Jael. While he was sleeping, she drove a tent peg through his head! It sounds gross, but it showed that God can use anyone (even housewives) to win victories!'
        },
        {
          title: 'Gideon and the Tiny Army',
          when: 'Around 1100s BC',
          bibleStory: 'Judges 6-7',
          characters: 'Gideon and the Midianites',
          story: 'The Midianites were stealing all of Israel\'s crops and making everyone\'s life miserable. God chose a guy named Gideon to save Israel, but Gideon was scared and kept asking for signs to make sure it was really God talking to him. When Gideon finally gathered an army, he had 32,000 men - that sounds like a lot, right? But God said, "That\'s too many! I want everyone to know that I\'M the one who wins the battle, not your big army." So God had Gideon send most of the soldiers home until he only had 300 men left! Then God gave them the weirdest battle plan ever: each soldier got a torch hidden in a clay jar and a trumpet. In the middle of the night, they surrounded the enemy camp, broke their jars (so the torches blazed), blew their trumpets, and shouted! The Midianites woke up in total confusion, started fighting each other, and ran away! God won a huge victory with just 300 men and some torches!'
        },
        {
          title: 'Samson - The Strongest Man Who Made Bad Choices',
          when: 'Around 1080-1050 BC',
          bibleStory: 'Judges 13-16',
          characters: 'Samson, Delilah, and the Philistines',
          story: 'Samson was born to be special - he was a Nazirite, which meant he could never cut his hair and God gave him incredible strength! He could tear apart lions with his bare hands and kill 1,000 enemies with just a donkey\'s jawbone! But Samson had a big problem - he made terrible choices, especially about women. He fell in love with a sneaky woman named Delilah, who was secretly working for the Philistines (Israel\'s enemies). She kept nagging him, "Tell me the secret of your strength!" Finally, Samson told her, "It\'s my hair - if it gets cut, I\'ll lose my strength." So while he was sleeping, Delilah had someone cut his hair. When Samson woke up, his strength was gone! The Philistines captured him, poked out his eyes, and made him grind grain like an animal. But his hair grew back, and in one final moment, Samson prayed to God and pushed down the pillars of a huge temple, killing himself and thousands of Philistines. Samson\'s story shows that even when we mess up big time, God can still use us for His plans.'
        },
        {
          title: 'Ruth - A Beautiful Love Story',
          when: 'Around 1100 BC',
          bibleStory: 'The Book of Ruth',
          characters: 'Ruth, Naomi, and Boaz',
          story: 'During all this chaos, there was one beautiful story that gives us hope! A woman named Naomi had moved to a foreign country with her family because of famine. Her husband and two sons died, leaving her with just her two daughters-in-law. One of them, Ruth, was from the country of Moab, but she loved Naomi so much that she said, "Where you go, I\'ll go. Your people will be my people, and your God will be my God." So Ruth and Naomi moved back to Israel, where they were very poor. Ruth worked hard in the fields picking up leftover grain to feed them. A kind, wealthy man named Boaz noticed Ruth\'s loyalty and kindness. He fell in love with her and married her! They had a baby named Obed, who became King David\'s grandfather. This means Ruth, even though she wasn\'t born an Israelite, became part of Jesus\' family tree! It shows that God\'s love includes everyone who chooses to follow Him.'
        },
        {
          title: 'Samuel - The Boy Who Heard God\'s Voice',
          when: 'Around 1050 BC',
          bibleStory: '1 Samuel 3:19-21 and 7:3-6',
          characters: 'Samuel, Eli the priest',
          story: 'A woman named Hannah desperately wanted a baby, so she prayed and promised God, "If you give me a son, I\'ll dedicate him to serve you forever!" God answered her prayer with a boy named Samuel. When Samuel was just a little kid, his mom took him to live at the Tabernacle with an old priest named Eli. One night, young Samuel heard someone calling his name. He thought it was Eli, but Eli said, "That\'s not me - that\'s God calling you! Next time, say \'Speak, Lord, your servant is listening.\'" Samuel grew up to be a great prophet and judge. Unlike the other judges who were mostly warriors, Samuel led the people by teaching them God\'s word and helping them repent from worshiping idols. He defeated the Philistines not by fighting but by praying! Samuel was like a bridge between the crazy time of the judges and what was coming next.'
        },
        {
          title: '"We Want a King Like Everyone Else!"',
          when: 'Around 1052 BC',
          bibleStory: '1 Samuel 8:4-22',
          characters: 'Samuel and the Israelites',
          story: 'When Samuel got old, his sons were supposed to help him lead Israel, but they were greedy and unfair. The people got frustrated and said to Samuel, "We don\'t want judges anymore! Give us a king like all the other nations have!" This really hurt Samuel\'s feelings, but God told him, "Don\'t take it personally, Samuel. They\'re not rejecting you - they\'re rejecting ME as their king. They want to be like everyone else instead of being my special people." God told Samuel to warn them what having a human king would be like: "A king will make your sons fight in his wars, take your daughters to work in his palace, take the best of your crops and animals for himself, and you\'ll end up being his servants!" But the people said, "We don\'t care! We want a king anyway!" So God sadly agreed to give them what they wanted. This was the end of the time of the judges and the beginning of having kings rule Israel.'
        }
      ],
      connections: ['united-kingdom']
    },
    {
      id: 'united-kingdom',
      title: 'THE UNITED KINGDOM',
      subtitle: 'Israel\'s First Kings',
      emoji: '👑',
      bgEmoji: '🏰',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA500'],
      position: { x: width * 2.75, y: 180 },
      size: 120,
      description: 'From Saul to David to Solomon - this is when Israel had its greatest kings! It started with the people demanding a king, continued with David the giant-killer who united the nation, and reached its peak with Solomon\'s wisdom and the magnificent Temple. But it ended sadly when the kingdom split in two.',
      stories: [
        {
          title: 'Saul - Israel\'s First King',
          when: 'Around 1050 BC',
          bibleStory: '1 Samuel 10:1-24',
          characters: 'Saul and Samuel',
          story: 'Remember how the Israelites demanded a king? Well, God told Samuel to find a tall, handsome young man from the tribe of Benjamin named Saul. Samuel secretly anointed Saul with oil (which means God chose him to be king), and then later presented him to all the people. Saul was so tall he stood head and shoulders above everyone else! At first, Saul was a good king - he won battles against Israel\'s enemies and united the tribes. But this was just the beginning of a very complicated story. Saul would reign for about 40 years, and his story shows why Israel needed a king who truly followed God\'s heart.'
        },
        {
          title: 'David and the Giant Goliath',
          when: 'Around 1020 BC',
          bibleStory: '1 Samuel 17:32-51',
          characters: 'Young David, the giant Goliath, and King Saul',
          story: 'While Saul was king, the Philistines had a champion fighter who was absolutely HUGE - a giant named Goliath who was over 9 feet tall! Every day for 40 days, Goliath would shout at the Israelite army, "Send someone to fight me! If he wins, we\'ll be your slaves. If I win, you\'ll be ours!" All of Saul\'s soldiers were terrified. But then a teenage shepherd boy named David came to bring lunch to his brothers in the army. When David heard Goliath making fun of God, he got really mad and said, "I\'ll fight him!" Everyone thought David was crazy, but David said, "God helped me kill lions and bears when they attacked my sheep. He\'ll help me kill this giant too!" David refused armor and weapons - he just took his sling and five smooth stones. With one shot, the stone hit Goliath right in the forehead, and the giant fell down dead! The whole Philistine army ran away. This showed everyone that God doesn\'t need big armies or fancy weapons - He can win battles any way He wants!'
        },
        {
          title: 'Saul Gets Jealous and Everything Goes Wrong',
          when: '1020-1010 BC',
          bibleStory: '1 Samuel 18-31',
          characters: 'Saul, David, and Jonathan (Saul\'s son)',
          story: 'After David killed Goliath, he became super popular. Women would sing, "Saul has killed thousands, but David has killed tens of thousands!" This made King Saul incredibly jealous and angry. Saul started disobeying God\'s commands and even tried to kill David multiple times! David had to run away and hide in caves and forests. The sad part was that Jonathan, Saul\'s son, was David\'s best friend and tried to protect him. Things got worse when Saul started consulting a witch instead of asking God for help. In the end, Saul and Jonathan both died in a terrible battle against the Philistines on Mount Gilboa. Saul\'s story is really sad because he started out good but let jealousy and disobedience ruin everything.'
        },
        {
          title: 'David Becomes King of All Israel',
          when: '1010 BC (king of Judah), 1003 BC (king of all Israel)',
          bibleStory: '2 Samuel 5:1-5',
          characters: 'David and all the tribes of Israel',
          story: 'After Saul died, David first became king of just his own tribe (Judah) in the city of Hebron. But there was a civil war because some people still supported Saul\'s family. After seven years, all the tribes finally agreed that David should be king of everyone! They came to David and said, "We\'re all your relatives, and even when Saul was king, you were the one who really led us in battle. Plus, God said you would be our shepherd and ruler!" So David became king of all 12 tribes at age 30 and ruled for 40 years (1010-970 BC). Under David, Israel became united, powerful, and had its "golden age" of success and worship of God.'
        },
        {
          title: 'David Captures Jerusalem',
          when: 'Around 1003 BC',
          bibleStory: '2 Samuel 5:6-10',
          characters: 'David and the Jebusites',
          story: 'One of the first smart things David did as king was capture a city called Jebus (which we now call Jerusalem). The Jebusites who lived there were really cocky and said, "You\'ll never capture our city - it\'s too well protected!" But David and his men found a secret way in through the water tunnels, and they conquered the city! David made Jerusalem his capital city and it became known as the "City of David." This was a brilliant move because Jerusalem was right between the northern and southern tribes, so it helped unite the whole nation. Jerusalem became the most important city in Israel and is still considered holy today!'
        },
        {
          title: 'Bringing God\'s Special Box to Jerusalem',
          when: 'Around 1000 BC',
          bibleStory: '2 Samuel 6:12-19',
          characters: 'David, priests, and a man named Uzzah',
          story: 'David wanted Jerusalem to be not just the political capital but also the religious center, so he decided to bring the Ark of the Covenant there. The Ark was a special golden box that contained the stone tablets with the Ten Commandments - it represented God\'s presence with His people. At first, things went terribly wrong when a man named Uzzah touched the Ark (which was forbidden) and died instantly. David was scared and left the Ark at someone else\'s house for three months. When he saw that God blessed that family, David tried again - but this time he followed God\'s rules exactly. The priests carried the Ark properly, and David was so happy he danced with all his might in front of the whole parade! When the Ark reached Jerusalem, it meant God\'s presence was now in the capital city.'
        },
        {
          title: 'God\'s Amazing Promise to David',
          when: 'Around 1000 BC',
          bibleStory: '2 Samuel 7:8-16 and 1 Chronicles 17',
          characters: 'David, the prophet Nathan, and God',
          story: 'David wanted to build a beautiful temple for God since the Ark was still in a tent. He told the prophet Nathan about his idea, and at first Nathan said, "Great idea!" But that night, God spoke to Nathan and said, "Tell David that HE won\'t build a house for me - instead, I\'M going to build a house (meaning a family dynasty) for HIM!" God made an incredible promise: "David\'s descendants will rule Israel forever, and one of them will have a kingdom that never ends!" This was called the Davidic Covenant, and it was pointing ahead to Jesus, who would be called the "Son of David" and whose kingdom really would last forever. David was so amazed and grateful that he sat down and prayed one of the most beautiful thank-you prayers in the Bible.'
        },
        {
          title: 'David\'s Terrible Mistake and God\'s Forgiveness',
          when: 'Around 990 BC',
          bibleStory: '2 Samuel 11-12 and Psalm 51',
          characters: 'David, Bathsheba, Uriah, and the prophet Nathan',
          story: 'Even though David was called "a man after God\'s own heart," he made a really serious mistake. One evening, David saw a beautiful woman named Bathsheba taking a bath on her rooftop. Instead of looking away, David had her brought to his palace, and they committed adultery (had relations even though she was married to someone else). When Bathsheba became pregnant, David panicked and had her husband Uriah (one of his best soldiers) killed in battle to cover up his sin. David thought nobody would find out, but God sent the prophet Nathan to confront him with a story about a rich man who stole a poor man\'s only lamb. When David got angry about the story, Nathan said, "YOU are that man!" David immediately confessed, "I have sinned against the Lord." God forgave David, but there were still consequences - the baby died, and David\'s family would have lots of trouble from then on. David wrote Psalm 51 expressing his deep sorrow and asking God to create a clean heart in him.'
        },
        {
          title: 'Absalom\'s Rebellion Breaks David\'s Heart',
          when: 'Around 980 BC',
          bibleStory: '2 Samuel 15-18',
          characters: 'Absalom (David\'s son), David, and Joab',
          story: 'One of the consequences of David\'s sin was trouble in his own family. His son Absalom was handsome and charming, but he became bitter against his father and started a rebellion. Absalom went around Israel saying, "If I were king, I\'d treat people better than my father does!" Many people believed him and joined his revolt. David had to flee Jerusalem with his loyal followers - imagine how heartbroken he was to run away from his own son! There was a civil war, and in the final battle, Absalom was riding his mule under a tree when his long, beautiful hair got caught in the branches. David\'s general Joab found him hanging there and killed him, even though David had ordered them to be gentle with Absalom. When David heard his son was dead, he cried, "O my son Absalom! My son, my son Absalom! Would I had died instead of you!" It was one of the saddest moments in David\'s life.'
        },
        {
          title: 'Solomon Becomes the Wisest King Ever',
          when: '970 BC',
          bibleStory: '1 Kings 1:28-40 and 2:12',
          characters: 'Solomon, David, Bathsheba, and the prophet Nathan',
          story: 'When David got old, there was a fight about who would be the next king. David\'s son Adonijah tried to make himself king, but the prophet Nathan and Bathsheba reminded David that he had promised the throne to Solomon (who was David and Bathsheba\'s son). So David officially announced that Solomon would be king. Solomon was anointed and the people shouted, "Long live King Solomon!" Early in his reign, God appeared to Solomon in a dream and said, "Ask for whatever you want, and I\'ll give it to you." Solomon could have asked for money, power, or a long life, but instead he said, "Please give me wisdom to rule your people well." God was so pleased with this answer that He gave Solomon not only incredible wisdom but also riches and honor. Solomon became the wisest and richest king who ever lived!'
        },
        {
          title: 'Solomon Builds God\'s Amazing Temple',
          when: 'Started 966 BC, finished around 959 BC',
          bibleStory: '1 Kings 6-8 and 2 Chronicles 5-7',
          characters: 'Solomon and Hiram of Tyre',
          story: 'Solomon fulfilled his father David\'s dream by building the most magnificent temple for God that the world had ever seen! It took seven years to build and used the finest materials - cedar wood from Lebanon, tons of gold, and beautiful decorations. When it was finished, they had a huge dedication ceremony. Solomon prayed an amazing prayer, and then something incredible happened - God\'s glory came down like a cloud and filled the temple so completely that the priests couldn\'t even go inside! Fire came down from heaven and consumed the sacrifices. All the people fell on their faces and worshipped, saying, "He is good! His love endures forever!" The Temple became the center of Israel\'s worship and the most important building in the nation. It housed the Ark of the Covenant and was where people came to worship God and offer sacrifices.'
        },
        {
          title: 'Solomon\'s Success and Sad Ending',
          when: '970-931 BC (his whole reign)',
          bibleStory: '1 Kings 4:20-34 and 10:23-29, but also 1 Kings 11',
          characters: 'Solomon and the Queen of Sheba',
          story: 'Under Solomon, Israel reached its peak of power and prosperity. People lived safely "each under their own vine and fig tree." Solomon\'s wisdom was legendary - he could answer any question and knew about plants, animals, and many subjects. The famous Queen of Sheba traveled from far away just to test his wisdom, and she left amazed, saying, "I didn\'t believe the reports about you until I saw it with my own eyes!" Solomon also built many other impressive buildings besides the Temple. BUT sadly, Solomon\'s success went to his head. He married hundreds of foreign wives to make political alliances, and these wives brought their idol worship into Israel. In his old age, Solomon started worshipping false gods too! God was angry and told Solomon, "Because you\'ve done this, I\'m going to tear the kingdom away from your family. But for David\'s sake, I won\'t do it during your lifetime - it will happen to your son." So Solomon\'s reign ended with the promise of coming judgment.'
        },
        {
          title: 'The Kingdom Splits in Half',
          when: '931 BC',
          bibleStory: '1 Kings 12:1-20',
          characters: 'Rehoboam (Solomon\'s son) and Jeroboam',
          story: 'When Solomon died, his son Rehoboam became king. The people came to him and said, "Your father Solomon made us work too hard and pay too many taxes. If you\'ll be easier on us, we\'ll serve you faithfully." Rehoboam asked his advisors what to do. The older, wiser men said, "Be kind to them and they\'ll serve you forever." But the young men said, "Show them who\'s boss! Tell them you\'ll be even harder on them than your father was!" Foolishly, Rehoboam listened to the young men and said, "My father made you work hard, but I\'ll make you work harder! My father punished you with whips, but I\'ll punish you with scorpions!" The northern tribes were so angry they said, "We don\'t want David\'s family ruling us anymore!" and they made Jeroboam their king instead. So the kingdom split into two parts: the northern kingdom called "Israel" (10 tribes under Jeroboam) and the southern kingdom called "Judah" (2 tribes under Rehoboam). This division was God\'s punishment for Solomon\'s idolatry, and it would lead to centuries of conflict and trouble.'
        }
      ],
      connections: ['divided-kingdom']
    },
    {
      id: 'divided-kingdom',
      title: 'THE DIVIDED KINGDOM',
      subtitle: 'Two Nations, Many Troubles',
      emoji: '💔',
      bgEmoji: '⚔️',
      color: '#E74C3C',
      gradient: ['#E74C3C', '#C0392B'],
      position: { x: width * 2.75, y: 460 },
      size: 120,
      description: 'After Solomon\'s kingdom split in two, both Israel (north) and Judah (south) struggled with idol worship and wicked kings. God sent amazing prophets like Elijah and Elisha to call them back, but eventually both kingdoms were conquered and the people taken into exile.',
      stories: [
        {
          title: 'Jeroboam Makes Golden Calves Again',
          when: '931 BC',
          bibleStory: '1 Kings 12:26-33',
          characters: 'Jeroboam (king of northern Israel)',
          story: 'Remember how the kingdom split in two? Well, Jeroboam became king of the northern part (called Israel), but he had a big problem. All the people were supposed to go to Jerusalem (which was now in the southern kingdom of Judah) to worship God at the Temple. Jeroboam thought, "If my people keep going to Jerusalem, they might decide they want David\'s family to rule them again!" So he came up with a terrible solution - he made two golden calf statues and put one in the city of Bethel and one in Dan. Then he told the people, "It\'s too hard for you to go to Jerusalem. Here are your gods who brought you out of Egypt!" Sound familiar? It was just like what the Israelites did in the desert with Aaron! This was a huge sin that led the northern kingdom away from God right from the very beginning, and every single king who came after Jeroboam continued worshipping these fake gods.'
        },
        {
          title: 'Elijah - The Prophet Who Called Down Fire',
          when: 'Around 875-850 BC',
          bibleStory: '1 Kings 17 through 2 Kings 2',
          characters: 'Elijah, wicked King Ahab, and evil Queen Jezebel',
          story: 'During one of the worst times in Israel\'s history, when King Ahab and his wife Jezebel were forcing everyone to worship a fake god called Baal, God sent an amazing prophet named Elijah. First, Elijah told Ahab, "It\'s not going to rain for years until I say so!" Then God took care of Elijah in incredible ways - ravens brought him food every day, and he lived with a poor widow whose jar of flour and bottle of oil never ran empty! But the most exciting part was the showdown on Mount Carmel. Elijah challenged 450 prophets of Baal to a contest: "Let\'s each build an altar and see which god sends fire to burn up the sacrifice!" The Baal prophets danced and shouted and even cut themselves all day, but nothing happened. Then Elijah built his altar, poured tons of water all over it (so much that it filled up a trench around the altar), and prayed a simple prayer. WHOOSH! Fire came down from heaven and burned up not just the sacrifice, but the wood, the stones, the dirt, and even all the water! All the people shouted, "The Lord is God! The Lord is God!" and got rid of all the false prophets. It was one of the most dramatic moments in the Bible!'
        },
        {
          title: 'Elijah Goes to Heaven in a Whirlwind',
          when: 'Around 850 BC',
          bibleStory: '2 Kings 2:1-15',
          characters: 'Elijah and his student Elisha',
          story: 'Elijah had trained a younger prophet named Elisha to carry on his work. When it was time for Elijah to leave this world, something absolutely incredible happened - something that had only happened to one other person (Enoch) in all of history. Elijah and Elisha were walking together when suddenly a chariot made of fire with horses of fire appeared between them! A whirlwind came down from heaven and took Elijah up into the sky without him dying! As he was going up, his prophet\'s cloak fell down to Elisha. When Elisha picked up the cloak, he received a double portion of Elijah\'s power and became the new main prophet in Israel. Elijah going straight to heaven showed how special he was to God, and the Bible says he\'ll come back someday before Jesus returns!'
        },
        {
          title: 'Ahab and Jezebel - The Worst Royal Couple Ever',
          when: 'Around 874-850 BC',
          bibleStory: '1 Kings 16:29-33 and 21:25',
          characters: 'King Ahab, Queen Jezebel, and Elijah',
          story: 'King Ahab was already bad enough, but when he married Jezebel (a princess from another country), things got much, much worse! Jezebel worshipped Baal and convinced Ahab to build a temple for Baal right in Israel\'s capital city of Samaria. She also tried to kill all of God\'s prophets! Jezebel was so evil that she had an innocent man named Naboth murdered just so Ahab could steal his vineyard. When Elijah heard about this, he told Ahab, "Dogs will lick up your blood, and dogs will eat Jezebel by the city wall!" This all came true later - Ahab died in battle and his blood was licked up by dogs, and Jezebel was thrown out of a window and eaten by dogs, just as Elijah had predicted. Ahab and Jezebel represent the lowest point of evil in Israel\'s history.'
        },
        {
          title: 'Elisha - The Prophet of Miracles',
          when: 'Around 850-800 BC',
          bibleStory: '2 Kings 2-8 and 13',
          characters: 'Elisha, Naaman, and King Jehu',
          story: 'After Elijah was taken to heaven, Elisha became the main prophet and performed even more miracles than Elijah had! Some of the coolest ones were: he made bitter water sweet, he helped a poor widow by making her tiny bit of oil fill up tons of jars so she could sell it and pay her debts, he brought a dead boy back to life, he healed a foreign army commander named Naaman of leprosy by telling him to wash in the Jordan River seven times, and he even made an axe head float on water! Once, when enemy soldiers came to capture him, Elisha prayed and God opened his servant\'s eyes to see that the hills were full of horses and chariots of fire protecting them. Then Elisha prayed again and made the enemy army blind so he could lead them right to the Israelite king! Elisha also anointed a man named Jehu to be king, and Jehu got rid of Ahab\'s evil family and destroyed the worship of Baal. Through all these miracles, God was showing that He still cared about His people even when their kings were wicked.'
        },
        {
          title: 'The Northern Kingdom Gets Destroyed',
          when: '722 BC',
          bibleStory: '2 Kings 17:5-18',
          characters: 'King Hoshea (last king of Israel) and the Assyrian kings',
          story: 'For about 200 years, the northern kingdom of Israel had mostly wicked kings who led the people to worship idols instead of God. God sent prophet after prophet to warn them, but they wouldn\'t listen. Finally, God\'s patience ran out. The powerful Assyrian Empire attacked Israel and surrounded their capital city, Samaria, for three whole years! In 722 BC, the city finally fell. The Assyrians took most of the Israelites far away to other countries as prisoners and brought foreigners to live in their land (these foreigners mixed with the remaining Israelites and became known as Samaritans). The ten tribes of the northern kingdom were scattered and essentially disappeared from history. This was exactly what God had warned would happen if they didn\'t stop worshipping idols. Now only the southern kingdom of Judah was left, and they had better learn from Israel\'s terrible example!'
        },
        {
          title: 'God Saves Jerusalem from the Assyrians',
          when: '701 BC',
          bibleStory: '2 Kings 18-19, 2 Chronicles 32, and Isaiah 36-37',
          characters: 'King Hezekiah, the prophet Isaiah, and Sennacherib (king of Assyria)',
          story: 'After conquering Israel, the mighty Assyrian army came after Judah too! King Hezekiah was one of the few good kings - he had torn down all the idol worship places and led the people back to worshipping God. When the Assyrian king Sennacherib surrounded Jerusalem and sent threatening messages, Hezekiah didn\'t panic. Instead, he took the enemy\'s letter to the Temple, spread it out before God, and prayed, "Lord, you are the only true God! Please save us so all the nations will know that you are God!" The prophet Isaiah assured Hezekiah that God would protect Jerusalem. That very night, something amazing happened - the angel of the Lord went through the Assyrian camp and killed 185,000 enemy soldiers while they slept! When morning came, Sennacherib woke up to find most of his army dead. He packed up what was left and went home, never to threaten Jerusalem again. This miracle showed that when God\'s people trust Him completely, He can do absolutely anything to save them!'
        },
        {
          title: 'King Josiah Finds God\'s Lost Book',
          when: 'Around 622 BC',
          bibleStory: '2 Kings 22-23 and 2 Chronicles 34',
          characters: 'King Josiah, Hilkiah the priest, and Huldah the prophetess',
          story: 'King Josiah became king when he was only 8 years old! As he grew up, he decided to follow God instead of the evil ways of his father and grandfather. When he was about 26, he ordered workers to fix up the Temple, which had been neglected for years. While they were cleaning, the priest Hilkiah found something incredible - a scroll of God\'s Law that had been lost! When they read it to King Josiah, he was shocked and tore his clothes (which was how people showed they were very upset back then). He realized how badly Judah had been disobeying God\'s commands. So Josiah started the biggest cleanup in Judah\'s history! He smashed all the idols, tore down the altars to false gods, got rid of the mediums and fortune-tellers, and even celebrated the Passover in a way that hadn\'t been done since the days of the judges. A prophetess named Huldah told him that because of his good heart, God wouldn\'t punish Judah during his lifetime. Josiah\'s reforms were like hitting a giant "reset" button, bringing the people back to God one last time before disaster struck.'
        },
        {
          title: 'Judah Goes into Exile in Babylon',
          when: '605-586 BC',
          bibleStory: '2 Kings 24:10-16 and Daniel 1:1-6',
          characters: 'King Nebuchadnezzar of Babylon, Daniel, Ezekiel, and many others',
          story: 'Even after good King Josiah\'s reforms, the people of Judah went back to their old evil ways. So God allowed the Babylonian Empire (led by King Nebuchadnezzar) to conquer them, but it happened in stages over about 20 years. First, in 605 BC, Nebuchadnezzar took some of the smartest young people (including Daniel and his three friends) to Babylon to serve in his palace. Then in 597 BC, after Judah rebelled, he took more people away, including the prophet Ezekiel. Finally, in 586 BC, Nebuchadnezzar got so angry with Judah\'s constant rebellions that he completely destroyed Jerusalem and Solomon\'s beautiful Temple, and took most of the remaining people to Babylon as prisoners. It was absolutely heartbreaking - the holy city was in ruins, the Temple was gone, and God\'s people were living in a foreign land. But this wasn\'t the end of the story! The prophets had warned this would happen if the people didn\'t repent, but they had also promised that after 70 years, God would bring His people back home. Even in judgment, God had a plan for restoration.'
        }
      ],
      connections: []
    },
    {
      id: 'exile',
      title: 'EXILE - FAR FROM HOME',
      subtitle: '605–538 BC',
      emoji: '🏛️',
      bgEmoji: '💔',
      color: '#795548',
      gradient: ['#8D6E63', '#795548', '#5D4037'],
      position: { x: width * 2.25, y: 600 },
      size: 120,
      description: 'When God\'s people were taken far from their homeland to live in foreign countries. Even in the darkest times, God was still with them and had amazing plans!',
      stories: [
        {
          title: 'Kicked Out of Home',
          when: '586–538 BC',
          bibleStory: 'Psalm 137; Jeremiah 29:4–7',
          characters: 'The people of Judah (like Ezekiel and Daniel)',
          story: 'The Jewish people got kicked out of their homeland and had to live in Babylon. They sat by the rivers feeling super sad about losing Jerusalem - you can read about how heartbroken they were in Psalm 137. But the prophet Jeremiah gave them some tough-love advice: "Don\'t just sit around being miserable. Build houses, plant gardens, and try to make your new city better while you wait." He said God promised they\'d go home after 70 years. Since their temple was destroyed, they started meeting in new places called synagogues to pray and learn together. This really hard time actually helped them get rid of fake gods and focus on the real God, and they worked super hard to save and write down all their holy books.'
        },
        {
          title: 'Faithfulness in Babylon: The Fiery Furnace',
          when: 'Around 580s BC',
          bibleStory: 'Daniel 3:13–28',
          characters: 'Shadrach, Meshach, and Abednego; King Nebuchadnezzar',
          story: 'King Nebuchadnezzar built this massive golden statue and announced, "Everyone bow down to this thing!" But three Jewish guys who worked for the government - Shadrach, Meshach, and Abednego - said "Nope, we only worship God." The king got furious and cranked up a furnace so hot it killed the soldiers who threw them in! But here\'s the crazy part: they walked around inside the fire completely fine, and the king saw a fourth person in there with them (probably an angel). When they came out, not even their hair was burned or smoky! The king was so shocked he started praising their God.'
        },
        {
          title: 'Nebuchadnezzar\'s Dream & Going Crazy',
          when: 'Around 570 BC',
          bibleStory: 'Daniel 4:28–37',
          characters: 'Nebuchadnezzar, Daniel',
          story: 'King Nebuchadnezzar had this weird dream that Daniel explained: "You need to stop being so proud and remember that God is really in charge, or something bad will happen to you." But the king totally ignored the warning. One day while he was bragging about how amazing his kingdom was, God made him lose his mind for seven whole years! He lived outside like a wild animal, eating grass and growing long fingernails and hair. When he finally got his sanity back, he admitted that God was the real ruler of everything, not him.'
        },
        {
          title: 'The Handwriting on the Wall',
          when: '539 BC',
          bibleStory: 'Daniel 5:1–31',
          characters: 'King Belshazzar (Babylon), Daniel',
          story: 'King Belshazzar threw this huge party and decided to use the golden cups that were stolen from God\'s temple in Jerusalem. While everyone was drinking and partying, suddenly a ghostly hand appeared and wrote mysterious words on the palace wall: "Mene, Mene, Tekel, Parsin." All the king\'s wise guys had no clue what it meant, so they called Daniel. He looked at it and said, "This means your kingdom is finished - God has weighed you and found you wanting. Tonight your enemies will take over!" And guess what? That very same night, enemy soldiers snuck into the city, killed King Belshazzar, and Babylon was done for good.'
        },
        {
          title: 'Daniel in the Lions\' Den',
          when: 'Around 538 BC',
          bibleStory: 'Daniel 6:6–27',
          characters: 'Daniel, King Darius (the Mede)',
          story: 'When the Persians took over, some jealous government officials were mad that Daniel kept getting promoted. They tricked the new king Darius into making a really dumb law: "For the next 30 days, nobody can pray to anyone except you, the king." Daniel kept praying to God three times a day like always, so they threw him into a pit full of hungry lions. The king felt terrible about it and couldn\'t sleep all night. First thing in the morning, he ran to check on Daniel and yelled, "Daniel! Did your God save you?" Daniel called back, "Yeah! God sent an angel to shut the lions\' mouths!" The king was so relieved and amazed that he had the mean officials thrown to the lions instead, and then made everyone in his kingdom respect Daniel\'s God.'
        },
        {
          title: 'Queen Esther Saves Her People',
          when: 'Around 474 BC',
          bibleStory: 'Book of Esther',
          characters: 'Esther, King Xerxes (Ahasuerus), Mordecai, Haman',
          story: 'A Jewish girl named Esther became queen of the huge Persian empire, but she kept her background secret. There was this really nasty guy named Haman who hated Jewish people and convinced the king to sign a law saying all Jews should be killed on a certain day. Esther\'s cousin Mordecai found out and told her, "You have to do something! Maybe God made you queen for exactly this moment!" So Esther took a huge risk - she went to the king without being invited (which could get you killed), told him the truth about who she was, and exposed Haman\'s evil plan at a fancy dinner. The king was so angry he had Haman hanged on the very gallows Haman had built for Mordecai! The Jewish people were allowed to defend themselves and were saved. They still celebrate this incredible rescue every year during a holiday called Purim.'
        }
      ],
      connections: []
    },
    {
      id: 'return',
      title: 'RETURN FROM EXILE - COMING HOME',
      subtitle: '538–430 BC',
      emoji: '🏠',
      bgEmoji: '🎉',
      color: '#4CAF50',
      gradient: ['#66BB6A', '#4CAF50', '#388E3C'],
      position: { x: width * 1.5, y: 380 },
      size: 120,
      description: 'After 70 years in exile, God\'s people finally got to come home! They rebuilt the temple, restored Jerusalem\'s walls, and renewed their commitment to follow God\'s ways.',
      stories: [
        {
          title: 'The Decree of Cyrus and First Return',
          when: '538 BC',
          bibleStory: 'Ezra 1:1–5; 2 Chronicles 36:22–23',
          characters: 'Cyrus the Great (Persian king), Zerubbabel',
          story: 'After the Persians beat Babylon, King Cyrus did something nobody expected - he said, "Hey Jewish people, you can go home and rebuild your temple!" About 50,000 Jews packed up and headed back to Jerusalem with Zerubbabel (who was from King David\'s family) leading them. Cyrus even gave back all the golden cups and stuff that Nebuchadnezzar had stolen from their temple years earlier. This was exactly what the prophets Isaiah and Jeremiah had said would happen - it showed that God could make even foreign kings do what He wanted. After 70 years away from home, they were finally free to go back!'
        },
        {
          title: 'Rebuilding the Temple Foundation',
          when: '536 BC',
          bibleStory: 'Ezra 3:8–13',
          characters: 'Zerubbabel, Jeshua, returning exiles',
          story: 'When the Jewish people got back to Jerusalem, it was a mess - just piles of broken stones where their beautiful temple used to be. But they rolled up their sleeves and started building the foundation for a new temple. When they finished laying the foundation stones, something really touching happened: the young people were shouting and cheering with joy, but the old folks who remembered Solomon\'s original temple were crying because this new one looked so much smaller and less fancy. You could hear both the happy shouting and the sad crying at the same time! But then their enemies started causing trouble and made them stop building for several years.'
        },
        {
          title: 'The Second Temple Completed',
          when: '515 BC',
          bibleStory: 'Ezra 6:14–16; Haggai 2:3–9',
          characters: 'Zerubbabel, Prophets Haggai and Zechariah, Darius I',
          story: 'Around 520 BC, two prophets named Haggai and Zechariah gave the people a pep talk: "Come on, guys! Stop making excuses and finish God\'s house!" So they got back to work and completed the Second Temple in 515 BC. It wasn\'t as fancy as Solomon\'s temple, but Haggai told them, "Don\'t worry - this temple will be even more special in the future because the Messiah will come here!" They had a huge party to celebrate, with lots of sacrifices and a big Passover feast. Finally, they had a proper place to worship God again!'
        },
        {
          title: 'Ezra\'s Return and Reforms',
          when: '458 BC',
          bibleStory: 'Ezra 7–10',
          characters: 'Ezra (scribe and priest), Artaxerxes I (Persian king)',
          story: 'About 60 years later, a priest and Bible teacher named Ezra got permission from King Artaxerxes to lead more Jews back to Jerusalem. When Ezra arrived, he found a big problem: lots of Jewish people had married people from other nations who worshipped fake gods, and they weren\'t following God\'s rules anymore. Ezra was so upset he tore his clothes and pulled his hair! He called everyone together for a spiritual wake-up call, teaching them God\'s law and making them promise to follow it properly. It was a tough time - some people even had to leave their non-Jewish spouses to stay faithful to God. But it helped the community get serious about following God again.'
        },
        {
          title: 'Nehemiah Rebuilds Jerusalem\'s Walls',
          when: '445 BC',
          bibleStory: 'Nehemiah 1–6',
          characters: 'Nehemiah, Artaxerxes I, Sanballat, Tobiah',
          story: 'Nehemiah had a good job as the Persian king\'s personal cup-tester, but when he heard that Jerusalem\'s walls were still broken down, it broke his heart. He got permission from the king to go fix it. When he got to Jerusalem, he secretly walked around at night to see how bad the damage was, then rallied everyone: "Come on, let\'s rebuild these walls and make our city strong again!" Some local bullies named Sanballat and Tobiah tried everything to stop them - threats, tricks, even plots to hurt Nehemiah. But the people worked with tools in one hand and weapons in the other, and they finished the whole wall in just 52 days! Everyone was amazed that they did it so fast.'
        },
        {
          title: 'Ezra Reads the Law to the People',
          when: '445 BC',
          bibleStory: 'Nehemiah 8:1–12',
          characters: 'Ezra, Nehemiah',
          story: 'After the walls were done, all the people gathered in a big square and asked Ezra to read God\'s law to them. He stood on a wooden platform from early morning until noon, reading and explaining what it all meant. The whole crowd listened super carefully - men, women, and kids old enough to understand. When they realized how far they\'d gotten away from God\'s rules, many people started crying. But Ezra and Nehemiah told them, "Don\'t cry today! This is a happy day! Go eat good food and celebrate, because understanding God\'s word should make you joyful. Remember - the joy of the Lord is your strength!" This led to a big time of saying sorry to God and promising to follow His ways.'
        },
        {
          title: 'The Ministry of Malachi (Last Old Testament Prophet)',
          when: 'Around 430 BC',
          bibleStory: 'Malachi 1–4',
          characters: 'Malachi',
          story: 'About 15 years later, God sent one last prophet named Malachi to talk to His people. But Malachi had some tough things to say! He told them, "You guys are getting lazy with God again! You\'re bringing sick, ugly animals for sacrifices instead of your best ones. The priests are corrupt, people are getting divorced left and right, and you\'re not giving God what you owe Him!" But Malachi also gave them hope - he said God would send a special messenger (John the Baptist) to prepare the way for the Lord Himself to come to the temple. He also said Elijah would return before "the great and terrible day of the Lord." After Malachi finished speaking, God went silent for 400 years - no more prophets until Jesus came! It was like God was saying, "I\'ve told you everything you need to know. Now wait and watch for the Messiah."'
        }
      ],
      connections: []
    },
    {
      id: 'intertestamental',
      title: 'INTERTESTAMENTAL PERIOD - BETWEEN THE TESTAMENTS',
      subtitle: '430–5 BC',
      emoji: '🏛️',
      bgEmoji: '⚡',
      color: '#9C27B0',
      gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'],
      position: { x: width * 1.25, y: 600 },
      size: 120,
      description: 'The 400 years of silence between the Old and New Testaments. God didn\'t send any prophets, but He was still working behind the scenes to prepare the world for Jesus!',
      stories: [
        {
          title: 'Alexander the Great Conquers Judea',
          when: '332 BC',
          bibleStory: '(Prophecy in Daniel 8:5–7, 21)',
          characters: 'Alexander the Great',
          story: 'This young guy from Macedonia named Alexander was taking over the whole world, and in 332 BC he marched into Jerusalem and Judea without anyone even fighting back! The Jewish people just opened their gates and said "Welcome!" This started what we call the Hellenistic period, where Greek language and culture spread everywhere - even Jewish people started learning Greek and picking up Greek customs. Alexander was actually pretty nice to the Jews and let them keep their religion, but this Greek influence would cause big problems later. Daniel had predicted this would happen - he saw in a vision that a Greek leader would defeat the Persians, and that\'s exactly what Alexander did!'
        },
        {
          title: 'The Spread of Hellenistic Rule',
          when: '323–167 BC',
          bibleStory: '(Foretold generally in Daniel 8 and 11)',
          characters: 'Ptolemies, Seleucids, Antiochus IV Epiphanes',
          story: 'When Alexander died in 323 BC (he was only 32!), his generals fought over his empire and split it up. Poor Judea got stuck right in the middle between two big kingdoms: Egypt (run by the Ptolemies) and Syria (run by the Seleucids). First the Egyptians controlled them and were pretty nice about letting Jews be Jewish. But then the Syrians took over, and they were much meaner. More and more Jewish people started acting like Greeks, speaking Greek, and even playing Greek sports. Some Jews thought this was cool and modern, but others were horrified because it was pulling them away from God\'s ways.'
        },
        {
          title: 'Antiochus IV\'s Persecution',
          when: '167 BC',
          bibleStory: '(Prophecy in Daniel 11:31)',
          characters: 'Antiochus IV Epiphanes',
          story: 'King Antiochus IV of Syria was totally crazy and called himself "Epiphanes" which means "God made visible" - talk about having a big ego! In 167 BC he did the most horrible thing imaginable: he marched into God\'s temple in Jerusalem, set up an altar to the Greek god Zeus, and sacrificed a pig on it! Pigs were the most unclean animal to Jews, so this was like the ultimate insult. He also made it illegal to circumcise babies, keep the Sabbath, or follow any Jewish laws. If you got caught being Jewish, you\'d be killed. Many brave Jews chose to die rather than give up their faith. This was exactly the "abomination of desolation" that Daniel had warned about!'
        },
        {
          title: 'The Maccabean Revolt and Hanukkah',
          when: '167–164 BC',
          bibleStory: '(Historical books of 1–2 Maccabees)',
          characters: 'Mattathias, Judas Maccabeus',
          story: 'An old priest named Mattathias got so fed up with Antiochus\'s cruelty that he started a rebellion with his five sons. When Mattathias died, his son Judas took over - they called him "Maccabeus" which means "the Hammer" because he hit the enemy so hard! Using sneaky guerrilla warfare tactics, this small group of Jewish fighters beat the mighty Syrian army. In 164 BC they kicked the Syrians out of Jerusalem and cleaned up the temple. When they went to light the special lamp (menorah), they found only enough pure oil for one day, but it miraculously burned for eight days until they could make more! That\'s why Jewish people still celebrate Hanukkah (the Festival of Lights) for eight days every winter - it reminds them that God can do miracles even in the darkest times.'
        },
        {
          title: 'The Hasmonean Dynasty',
          when: '141–63 BC',
          bibleStory: '(Foretold generally in Daniel 11:34-35)',
          characters: 'Simon Thassi (founder), John Hyrcanus, others',
          story: 'After winning their independence, the Maccabee family (now called the Hasmoneans) became the rulers of Judea. Simon Maccabeus became both the high priest and the king in 141 BC - for the first time in centuries, the Jews had their own country again! They expanded their territory and things looked great. But over time, power went to their heads. The Hasmonean kings started acting more like Greek rulers than Jewish priests. Different religious groups (like the Pharisees and Sadducees) began fighting with each other about how to run things. The royal family members even started killing each other to grab power! All this fighting made the country weak and invited trouble from outside.'
        },
        {
          title: 'Roman Conquest of Judea',
          when: '63 BC',
          bibleStory: '(Foretold generally in Daniel 2:40)',
          characters: 'Pompey the Great',
          story: 'The Hasmonean brothers were having a nasty civil war, so they both asked the Romans to help them - big mistake! General Pompey showed up in 63 BC, looked at the situation, and said, "Thanks for inviting us, but we\'re taking over now!" His soldiers surrounded Jerusalem for three months, then broke through the walls. Pompey even marched right into the Holy of Holies in the temple (where only the high priest was supposed to go once a year), though he didn\'t steal anything. From that day on, Judea became part of the Roman Empire. The Jews lost their independence and had to pay heavy taxes to Rome, but at least the Romans brought peace and built good roads. This Roman rule would be the setting for everything that happens in the New Testament.'
        },
        {
          title: 'Herod the Great and the Roman Client Kingdom',
          when: '37–4 BC (his reign)',
          bibleStory: '(Alluded to in Matthew 2:1)',
          characters: 'Herod the Great',
          story: 'The Romans picked a guy named Herod to be king of Judea in 37 BC. Herod wasn\'t even fully Jewish - he was an Edomite, but he married into the old royal family to make himself look more legitimate. Herod was incredibly smart and built amazing things, including making the Second Temple absolutely gorgeous - it became one of the wonders of the ancient world! But he was also completely paranoid and cruel. He killed his own wife and three of his sons because he thought they were plotting against him. One Roman leader joked that it was safer to be Herod\'s pig than his son! Herod ruled when Jesus was born in Bethlehem, and he\'s the king who ordered all the baby boys in Bethlehem to be killed because he was afraid of this new "king of the Jews." Herod died in 4 BC, shortly after Jesus was born, and the Romans split his kingdom among his surviving sons.'
        }
      ],
      connections: []
    },
    {
      id: 'jesus',
      title: 'LIFE OF JESUS',
      subtitle: 'c. 5 BC – AD 30',
      emoji: '✝️',
      bgEmoji: '🌟',
      color: '#2196F3',
      gradient: ['#42A5F5', '#2196F3', '#1976D2'],
      position: { x: width * 0.75, y: 460 },
      size: 120,
      description: 'The most important person who ever lived! Jesus came to Earth as God\'s Son to save the world. His life, teachings, death, and resurrection changed everything forever!',
      stories: [
        {
          title: 'Angel Gabriel Foretells Births of John and Jesus',
          when: 'Around 6–5 BC',
          bibleStory: 'Luke 1:5–38',
          characters: 'Zechariah, Elizabeth, Mary, Angel Gabriel',
          story: 'After 400 years of complete silence from God (no prophets at all!), the angel Gabriel suddenly showed up in Judea. First, he visited an old priest named Zechariah and said, "Your wife Elizabeth is going to have a baby, even though she\'s too old! His name will be John, and he\'ll prepare the way for the Lord." Six months later, Gabriel appeared to a young girl named Mary in Nazareth and told her something incredible: "You\'re going to have a baby too, but this one will be the Son of God! The Holy Spirit will make this happen even though you\'ve never been with a man." Mary was scared but brave - she said, "Let it happen just like you said." Zechariah didn\'t believe at first and got struck mute until his son was born! These announcements meant the time everyone had been waiting for was finally here.'
        },
        {
          title: 'Birth of John the Baptist',
          when: 'Around 6 BC',
          bibleStory: 'Luke 1:57–66',
          characters: 'John the Baptist, Zechariah, Elizabeth',
          story: 'When baby John was born to the elderly Elizabeth and Zechariah, everyone was amazed! At the naming ceremony, Zechariah could finally speak again. He immediately started prophesying, saying John would be "the prophet of the Most High" who would prepare the way for the Lord. Word about this miracle baby spread all through the hill country of Judea. John would grow up to be the wild prophet who fulfilled Isaiah\'s prophecy about "a voice crying in the wilderness." His birth was like God saying, "Get ready - something huge is about to happen!"'
        },
        {
          title: 'Birth of Jesus Christ',
          when: 'Around 5 BC',
          bibleStory: 'Luke 2:1–7; Matthew 1:18–25',
          characters: 'Jesus, Mary, Joseph',
          story: 'Jesus was born in Bethlehem, just like the prophet Micah had said would happen hundreds of years earlier. A Roman emperor named Caesar Augustus ordered everyone to go back to their hometown for a census, so Mary and Joseph had to travel from Nazareth to Bethlehem (David\'s city) even though Mary was about to give birth. When they got there, every hotel was full, so Jesus was born in a stable and laid in an animal feeding box called a manger. This was the most important moment in all of history - God becoming a human baby! Angels appeared to shepherds in nearby fields and told them the good news: "The Savior has been born!" The shepherds rushed over to see baby Jesus and told everyone what the angels had said.'
        },
        {
          title: 'The Visit of the Magi and Flight to Egypt',
          when: 'Around 4 BC',
          bibleStory: 'Matthew 2:1–15',
          characters: 'Wise Men (Magi from the East), King Herod the Great, Joseph, Mary, Jesus',
          story: 'Some time after Jesus was born, wise men from far away (probably Persia or Babylon) followed a special star that led them to Jesus. They brought expensive gifts: gold (for a king), frankincense (for a priest), and myrrh (used for burials - pretty weird gifts for a baby, but they had special meaning). When King Herod heard about this new "King of the Jews," he got scared and jealous. He pretended to want to worship Jesus too, but really he was planning to kill Him. An angel warned Joseph in a dream, so that very night Joseph took Mary and baby Jesus and escaped to Egypt. Herod was so angry he ordered all the baby boys in Bethlehem to be killed - a horrible tragedy that fulfilled Jeremiah\'s prophecy about Rachel weeping for her children. After Herod died in 4 BC, an angel told Joseph it was safe to come back home.'
        },
        {
          title: 'Jesus Grows Up in Nazareth',
          when: '4 BC – AD 8',
          bibleStory: 'Matthew 2:19–23; Luke 2:39–40',
          characters: 'Jesus, Joseph, Mary',
          story: 'The family returned from Egypt but didn\'t go back to Bethlehem because Herod\'s mean son was now ruling Judea. Instead, they settled in a small town called Nazareth in Galilee, where Joseph worked as a carpenter. This fulfilled another prophecy that the Messiah would be called a "Nazarene." Jesus grew up like any normal kid - He got stronger, wiser, and everyone could see that God was with Him in a special way. These are called the "silent years" because the Bible doesn\'t tell us much about Jesus\' childhood, but it shows that the Son of God experienced regular human growing up - learning to walk, talk, and probably helping Joseph in his carpentry shop.'
        },
        {
          title: 'The Baptism of Jesus',
          when: 'AD 26',
          bibleStory: 'Matthew 3:13–17; Mark 1:9–11; Luke 3:21–22',
          characters: 'Jesus, John the Baptist',
          story: 'Jesus traveled from Galilee to the Jordan River to be baptized by John. When John saw Jesus coming, he pointed and shouted, "Look! The Lamb of God who takes away the sin of the world!" But when Jesus asked to be baptized, John felt weird about it - he said, "I should be baptized by You, not the other way around!" But Jesus insisted, saying it was the right thing to do to fulfill what God wanted. As soon as Jesus came up out of the water, the most incredible thing happened: the sky opened up, the Holy Spirit came down looking like a dove and landed on Jesus, and God the Father\'s voice spoke from heaven saying, "This is My beloved Son, and I\'m so pleased with Him!" This was like God officially announcing to the world that Jesus\' ministry was starting, and it showed all three persons of the Trinity at once.'
        },
        {
          title: 'First Miracle at Cana',
          when: 'AD 27',
          bibleStory: 'John 2:1–11',
          characters: 'Jesus, Mary (His mother)',
          story: 'Jesus and His disciples were invited to a wedding in the town of Cana in Galilee. During the celebration, they ran out of wine - which would have been super embarrassing for the host family! Mary, Jesus\' mother, noticed the problem and told Jesus about it. At first Jesus said, "My time hasn\'t come yet," but then He decided to help. He told the servants to fill six huge stone water jars (each held 20-30 gallons!) with water. Then He told them to dip some out and take it to the person in charge of the feast. When the man tasted it, it had turned into wine - and not just any wine, but the best wine of the whole party! This was Jesus\' very first miracle, and it showed His disciples that He really was special. The miracle saved the family from embarrassment and showed that Jesus cared about people\'s happiness, not just their spiritual needs.'
        },
        {
          title: 'Triumphal Entry (Palm Sunday)',
          when: 'AD 30, 1 week before His death and resurrection',
          bibleStory: 'Matthew 21:1–11; John 12:12–19',
          characters: 'Jesus, the crowd',
          story: 'Jesus was finally ready to enter Jerusalem as the Messiah King. He sent two disciples to get a young donkey that had never been ridden, fulfilling Zechariah\'s prophecy: "See, your king comes to you, gentle and riding on a donkey." As Jesus rode into the city, huge crowds of people spread their cloaks and palm branches on the road in front of Him. They shouted, "Hosanna! Blessed is He who comes in the name of the Lord! Blessed is the King of Israel!" The whole city was buzzing with excitement - "Who is this?" people asked. "This is Jesus, the prophet from Nazareth!" others answered. But even as the crowds celebrated, Jesus looked at Jerusalem and started crying because He knew they didn\'t understand what kind of king He really was. They wanted Him to kick out the Romans and set up an earthly kingdom, but He had come to die for their sins.'
        },
        {
          title: 'The Crucifixion of Jesus',
          when: 'Friday morning, Nisan 14, AD 30',
          bibleStory: 'Matthew 27:27–54; John 19:16–37',
          characters: 'Jesus, Pontius Pilate, Roman soldiers, Mary (Jesus\' mother), John',
          story: 'The Roman soldiers brutally whipped Jesus, stuck a crown of thorns on His head, and made fun of Him by putting a purple robe on Him and saying, "Hail, King of the Jews!" Then they made Him carry His heavy wooden cross through the streets of Jerusalem to a place called Golgotha (which means "The Skull"). At 9 in the morning, they nailed Jesus to the cross between two criminals. Even while He was dying, Jesus said amazing things: "Father, forgive them, for they don\'t know what they\'re doing." From noon until 3 PM, the whole land went dark. At the end, Jesus cried out, "It is finished!" When He died, the thick curtain in the temple that separated people from God\'s presence ripped in half from top to bottom, the earth shook, and rocks split apart. A Roman soldier who saw it all said, "This really was the Son of God!" Jesus died to pay the penalty for all the sins of the world.'
        },
        {
          title: 'The Resurrection of Jesus',
          when: 'Sunday, Nisan 16, AD 30',
          bibleStory: 'Matthew 28:1–10; Luke 24:1–12; John 20',
          characters: 'Mary Magdalene, other women, Peter, John, the angels',
          story: 'Early Sunday morning, just as the sun was coming up, Mary Magdalene and some other women went to the tomb with spices to anoint Jesus\' body. But when they got there, they found the huge stone had been rolled away and the tomb was empty! Two angels in shining clothes appeared and said, "Why are you looking for the living among the dead? He is not here - He has risen, just like He said!" The women were scared but also filled with joy. They ran to tell the disciples, but most of the men didn\'t believe them at first. Peter and John raced to the tomb and found it empty except for the burial cloths lying there. Later that day, Jesus appeared to Mary Magdalene near the tomb. Jesus also appeared to two disciples walking on the road to Emmaus, and that evening He appeared to all the disciples together. The resurrection of Jesus is the most important event in Christian faith - it proves that Jesus really is God\'s Son and that death has been defeated forever!'
        }
      ],
      connections: []
    },
    {
      id: 'early-church',
      title: 'EARLY CHURCH',
      subtitle: 'AD 30–35',
      emoji: '⛪',
      bgEmoji: '🔥',
      color: '#FF5722',
      gradient: ['#FF7043', '#FF5722', '#E64A19'],
      position: { x: width * 0.75, y: 800 },
      size: 120,
      description: 'The birth and explosive growth of the Christian Church! After Jesus went to heaven, the Holy Spirit came at Pentecost and the disciples boldly spread the gospel, performing miracles and facing persecution.',
      stories: [
        {
          title: 'Pentecost – The Church is Born',
          when: 'AD 30, Pentecost festival (around May/June)',
          bibleStory: 'Acts 2:1–41',
          characters: 'Peter, the Twelve, 120 disciples, Jewish pilgrims',
          story: 'Ten days after Jesus went up to heaven, His followers were all gathered together in Jerusalem for the Jewish festival of Pentecost. Suddenly, something incredible happened! They heard a sound like a powerful rushing wind filling the whole house, and what looked like tongues of fire appeared and rested on each person. Then they started speaking in languages they\'d never learned before - but these weren\'t just random sounds. Jewish people from all over the world were visiting Jerusalem for the festival, and each visitor could hear the disciples speaking in their own native language! Everyone was confused and amazed. Some people even thought the disciples were drunk. But Peter stood up and gave an powerful speech, explaining that this was exactly what the prophet Joel had predicted would happen. He told them about Jesus - how He died, rose from the dead, and was now in heaven. About 3,000 people believed Peter\'s message that day and got baptized! This was the birth of the Christian Church. These new believers spent their time learning from the apostles, praying together, sharing meals (including the Lord\'s Supper), and taking care of each other with incredible love.'
        },
        {
          title: 'Life of the Early Believers',
          when: 'AD 30–33',
          bibleStory: 'Acts 2:42–47; 4:32–37',
          characters: 'Peter, John, Barnabas',
          story: 'The early church in Jerusalem was like nothing anyone had ever seen before! These new Christians were so committed to following Jesus that they shared everything they had. If someone needed food, clothes, or a place to live, other believers would sell their own possessions to help. A man named Barnabas even sold a field he owned and gave all the money to help poor Christians. Every day they met together at the temple to worship and pray, and then they\'d gather in each other\'s homes to eat meals together with joy and thanksgiving. The apostles kept doing miracles that proved God was with them, and everyone in Jerusalem respected these Christians because of how genuinely they loved each other. More and more people joined the church every day because they could see that these believers had something real and beautiful. It wasn\'t perfect (there would be problems later), but it was a taste of what the world could be like when people really follow Jesus and love each other the way God intended.'
        },
        {
          title: 'Healing of the Lame Beggar and Apostolic Preaching',
          when: 'AD 30',
          bibleStory: 'Acts 3:1–26',
          characters: 'Peter, John, a lame man',
          story: 'One afternoon, Peter and John were going to the temple for prayer time. At the gate, they saw a man who had been unable to walk since he was born - he was there every day begging for money from people going into the temple. When he asked Peter and John for some coins, Peter said, "I don\'t have silver or gold, but I\'ll give you what I do have. In the name of Jesus Christ of Nazareth, get up and walk!" Peter grabbed the man\'s right hand and pulled him up, and instantly his feet and ankles became strong! The man jumped up, started walking around, and went into the temple courts with Peter and John, walking and jumping and praising God at the top of his lungs! Everyone who saw him was absolutely shocked - they all knew this was the same guy who had been sitting at the gate begging for years. A huge crowd gathered around Peter, John, and the healed man. Peter saw this as a perfect opportunity to tell them about Jesus. He explained that it wasn\'t their own power that healed the man, but the power of Jesus - the same Jesus they had rejected and crucified, but whom God raised from the dead. He urged them to turn from their sins and trust in Jesus. About 2,000 more people believed that day (bringing the total to about 5,000 men, plus women and children)!'
        },
        {
          title: 'First Persecution – Peter and John before the Sanhedrin',
          when: 'AD 30',
          bibleStory: 'Acts 4:1–22',
          characters: 'Peter, John, Caiaphas (high priest), Sanhedrin council',
          story: 'The temple guards and the Sadducees (a group of religious leaders who didn\'t believe in resurrection) were really annoyed that Peter and John were teaching people about Jesus rising from the dead. So they arrested them and threw them in jail overnight. The next day, they brought Peter and John before the Sanhedrin - the same court that had condemned Jesus! The religious leaders asked, "By what power or authority did you heal this man?" Peter, filled with the Holy Spirit, boldly answered that the man was healed by the power of Jesus Christ of Nazareth - "the stone you builders rejected, which has become the cornerstone." He declared that salvation could only be found in Jesus, no one else. The council members were amazed because Peter and John were just ordinary fishermen without formal religious training, yet they spoke with such wisdom and courage. They could see that these men had definitely been with Jesus. Since they couldn\'t deny that a real miracle had happened (the healed man was standing right there with them), and they were afraid of how the people would react if they punished the apostles, they decided to just threaten them and order them to stop teaching about Jesus. But Peter and John replied, "Do you think God wants us to obey you instead of Him? We can\'t stop talking about what we\'ve seen and heard!" So the council threatened them some more and let them go.'
        },
        {
          title: 'Ananias and Sapphira',
          when: 'AD 30–31',
          bibleStory: 'Acts 5:1–11',
          characters: 'Ananias, Sapphira, Peter',
          story: 'While most of the early Christians were genuinely generous and honest, one couple decided to try to look good while being dishonest. Ananias and his wife Sapphira sold some property and brought part of the money to the apostles, but they pretended they were giving the whole amount from the sale. Peter, knowing the truth through the Holy Spirit, confronted Ananias: "Why has Satan filled your heart to lie to the Holy Spirit? You didn\'t have to sell the land, and even after you sold it, the money was yours to do with as you wanted. But you\'ve decided to lie - not just to us, but to God Himself!" When Ananias heard this, he immediately fell down dead! Some young men wrapped up his body and buried him. About three hours later, Sapphira came in, not knowing what had happened to her husband. Peter asked her, "Tell me, did you sell the land for this much?" She said, "Yes, that\'s exactly what we got for it." Peter replied, "How could you and your husband agree to test the Spirit of the Lord? Look! The men who buried your husband are at the door, and they\'ll carry you out too!" Instantly, Sapphira also fell down dead. The same young men carried her out and buried her beside her husband. Everyone in the church and everyone who heard about this was terrified! This showed that God takes honesty and sincerity seriously, especially in His church. Even though this was scary, the church continued to grow because people saw that this faith was real and powerful.'
        },
        {
          title: 'Apostles Imprisoned and Angelic Release',
          when: 'AD 31',
          bibleStory: 'Acts 5:17–42',
          characters: 'Peter, Gamaliel',
          story: 'The high priest and the Sadducees were getting really jealous because so many people were following the apostles instead of listening to them. So they arrested all the apostles and threw them in the public jail. But during the night, an angel of the Lord opened the prison doors and led them out! The angel said, "Go stand in the temple courts and tell the people all about this new life in Jesus." So at daybreak, the apostles went right back to the temple and started teaching again. Meanwhile, the high priest called together the Sanhedrin for a trial, but when they sent officers to bring the apostles from jail, they found the jail securely locked with guards still standing at the doors - but no prisoners inside! Everyone was confused. Then someone came running in and said, "Look! The men you put in jail are standing in the temple courts teaching the people!" So the temple guards went and brought the apostles back - but gently, because they were afraid the crowd might stone them if they were too rough. The high priest angrily asked, "Didn\'t we strictly command you not to teach in this name?" But Peter and the other apostles replied, "We must obey God rather than human beings!" This made the council furious, and they wanted to kill the apostles. But a respected Pharisee named Gamaliel stood up and said, "Be careful what you do to these men. If this movement is just human, it will fail on its own. But if it\'s from God, you won\'t be able to stop it - you might even find yourselves fighting against God!" So they had the apostles flogged (whipped) and warned them again not to speak in Jesus\' name. But the apostles left the council rejoicing because they had been counted worthy to suffer for Jesus! And they never stopped teaching and preaching that Jesus is the Messiah.'
        },
        {
          title: 'Seven Deacons Appointed',
          when: 'AD 31',
          bibleStory: 'Acts 6:1–7',
          characters: 'Stephen, Philip, Prochorus, and others, the Twelve',
          story: 'As the church kept growing (there were now over 5,000 men, plus all their families), a problem came up. The Greek-speaking Jewish Christians complained that their widows were being overlooked in the daily distribution of food, while the Hebrew-speaking Jewish Christian widows were being taken care of properly. The twelve apostles realized they needed help managing all these practical needs. They called the believers together and said, "It wouldn\'t be right for us to give up preaching and teaching God\'s word in order to wait on tables. So choose seven men who are known to be full of the Spirit and wisdom, and we\'ll put them in charge of this need. Then we can spend our time in prayer and teaching." This sounded good to everyone, so they chose seven men, including Stephen (who was full of faith and the Holy Spirit) and Philip. The apostles prayed and laid their hands on these seven men, officially appointing them as deacons (which means "servants") to handle the practical needs of the church. This solved the problem perfectly! The apostles could focus on their spiritual leadership, the practical needs were met fairly, unity was restored, and the church continued to grow rapidly. Even many Jewish priests became believers! This was the first time the church created an organized structure to handle its growing needs, and it showed how the Holy Spirit guides believers to solve problems wisely.'
        },
        {
          title: 'Stephen – The First Christian Martyr',
          when: 'AD 32 or 33',
          bibleStory: 'Acts 6:8–15; 7:1–60',
          characters: 'Stephen, Saul of Tarsus, Sanhedrin',
          story: 'Stephen, one of the seven deacons, was full of God\'s grace and power. He did great miracles and had amazing debates with Greek-speaking Jews about Jesus. But some of these Jews got so angry they couldn\'t win arguments against Stephen\'s wisdom that they decided to get rid of him. They brought false witnesses who accused Stephen of speaking against Moses and God, and they dragged him before the Sanhedrin. When the council looked at Stephen, they saw that his face was shining like an angel\'s! The high priest asked, "Are these charges true?" Stephen then gave the longest speech recorded in the book of Acts, telling the whole history of Israel from Abraham to Jesus. He showed how throughout history, God\'s people had always rejected the messengers God sent to them - just like they had rejected Jesus. He ended by boldly saying, "You stubborn people! You\'re just like your ancestors - you always resist the Holy Spirit! You received God\'s law but haven\'t obeyed it. And now you\'ve betrayed and murdered the Righteous One!" This made the council absolutely furious. But Stephen, full of the Holy Spirit, looked up to heaven and said, "Look! I see heaven open and the Son of Man standing at the right hand of God!" The council members covered their ears, yelling at the top of their voices, and rushed at Stephen. They dragged him outside the city and began stoning him to death. As they were killing him, Stephen prayed just like Jesus had: "Lord Jesus, receive my spirit" and "Lord, do not hold this sin against them." A young Pharisee named Saul was there, watching over the coats of the people throwing stones and approving of Stephen\'s murder. Stephen became the first person to die for believing in Jesus, but his death had huge effects: it started a wave of persecution that scattered Christians throughout the region (which actually spread the gospel further), and it made a deep impression on Saul, who would later become the apostle Paul.'
        }
      ],
      connections: []
    },
    {
      id: 'apostolic-age',
      title: 'APOSTOLIC AGE',
      subtitle: 'AD 33–100',
      emoji: '📜',
      bgEmoji: '🌍',
      color: '#9C27B0',
      gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'],
      position: { x: width * 1.5, y: 1000 },
      size: 120,
      description: 'The explosive spread of Christianity throughout the Roman Empire! From Paul\'s conversion to John\'s final vision, this era saw the gospel reach the ends of the earth through persecution, miracles, and unwavering faith.',
      stories: [
        {
          title: 'The Great Persecution and Scattering',
          when: 'AD 33',
          bibleStory: 'Acts 8:1–4',
          characters: 'Saul of Tarsus',
          story: 'Right after Stephen got killed for believing in Jesus, things got really scary for Christians in Jerusalem. A guy named Saul (who later became Paul) was like the main bad guy - he was going house to house, dragging Christian men and women off to prison! It was terrible. But here\'s the crazy part: instead of destroying Christianity, this actually helped it spread! All the believers had to run away to different places like Judea and Samaria, and everywhere they went, they told people about Jesus. It was like scattering seeds all over the place. One guy named Philip went to Samaria and tons of people became Christians there. Even though it was scary and hard, "those who were scattered went about preaching the word." The persecution actually ended up helping God\'s plan to spread the gospel beyond Jerusalem, just like Jesus had told them to do.'
        },
        {
          title: 'Philip and the Ethiopian Official',
          when: 'AD 34',
          bibleStory: 'Acts 8:26–39',
          characters: 'Philip, Ethiopian official',
          story: 'God\'s Spirit told Philip to go walk on this desert road, and he met this super important guy from Ethiopia who worked for the queen. The Ethiopian was reading a scroll about a suffering servant (from the book of Isaiah) but couldn\'t figure out what it meant. Philip ran up and explained that it was talking about Jesus! The Ethiopian was so excited that when they found some water, he asked to be baptized right away. After Philip baptized him, something supernatural happened - Philip just disappeared! The Ethiopian went home really happy. This was probably the first African person to become a Christian, and it showed that the good news about Jesus was reaching all the way to the ends of the earth, just like God had promised.'
        },
        {
          title: 'Saul\'s Conversion on the Damascus Road',
          when: 'AD 34',
          bibleStory: 'Acts 9:1–19; 22:6–16; 26:12–18',
          characters: 'Saul (Paul), Jesus, Ananias of Damascus',
          story: 'Remember Saul, the guy who was hunting down Christians? Well, he was traveling to Damascus to arrest more believers when something incredible happened. A bright light flashed around him and he heard Jesus\' voice saying, "Saul, Saul, why are you hurting me?" Saul fell to the ground and realized he was talking to Jesus himself! The light made him blind, so his friends had to lead him into the city. For three days he couldn\'t see and didn\'t eat anything. Then Jesus sent a Christian named Ananias to pray for him. When Ananias put his hands on Saul, it was like scales fell off his eyes and he could see again! Saul completely changed from being Christianity\'s worst enemy to being one of its best friends. He started calling himself Paul and began telling everyone about Jesus. This was one of the most important moments in Christian history because Paul would go on to spread the gospel all over the world!'
        },
        {
          title: 'Peter Preaches to the Gentiles (Cornelius\'s Household)',
          when: 'AD 37–40',
          bibleStory: 'Acts 10:1–48',
          characters: 'Peter, Cornelius',
          story: 'There was this Roman soldier named Cornelius who believed in God but wasn\'t Jewish. An angel told him to find Peter. At the same time, Peter had a weird dream about a sheet full of animals that Jews weren\'t supposed to eat, and God told him not to call anything dirty that God had made clean. When Peter met Cornelius and his family, he preached about Jesus dying and coming back to life. Something amazing happened - the Holy Spirit came on all the non-Jewish people there, just like what happened on the day of Pentecost! They even started speaking in different languages. Peter realized that God wanted non-Jewish people to become Christians too, without having to become Jewish first. This was huge news! It meant that anyone, no matter where they were from or what their background was, could follow Jesus. The door was now wide open for people from every nation to become Christians.'
        },
        {
          title: 'The Term "Christians" First Used at Antioch',
          when: 'AD 42–44',
          bibleStory: 'Acts 11:19–26',
          characters: 'Barnabas, Saul (Paul)',
          story: 'In a city called Antioch (in Syria), some believers started telling Greek people about Jesus, and lots of them believed. The church in Jerusalem sent a guy named Barnabas to check it out, and he brought Saul (Paul) to help teach all the new believers. They worked there for a whole year with this amazing mixed group of Jewish and non-Jewish believers. It was in Antioch that followers of Jesus were first called "Christians" - meaning "little Christs" or "followers of Christ." The name probably came from people in the city who noticed these believers were always talking about Christ. This showed that Christianity was becoming its own thing, separate from Judaism. Antioch became like a home base for sending out missionaries to tell other people about Jesus.'
        },
        {
          title: 'James the Apostle Martyred; Peter Rescued',
          when: 'AD 44',
          bibleStory: 'Acts 12:1–11',
          characters: 'King Herod Agrippa I, Apostle James son of Zebedee, Peter',
          story: 'King Herod Agrippa I (the grandson of the Herod from when Jesus was born) wanted to make the Jewish leaders happy, so he killed James (one of Jesus\' 12 disciples) with a sword. James became the first apostle to be martyred. When Herod saw this pleased people, he arrested Peter too, planning to execute him after Passover. But the church prayed really hard for Peter all night long. The night before his trial, an angel came to the prison, made Peter\'s chains fall off, and led him right past all the sleeping guards! Peter showed up at a house where believers were praying for him, and they were so shocked they could hardly believe it was really him. Later, Herod got so proud that an angel struck him down and he died. This showed that while God allowed James to die as a martyr, He miraculously saved Peter because He had more work for him to do. It also showed the incredible power of prayer!'
        },
        {
          title: 'Paul\'s First Missionary Journey',
          when: 'AD 47–49',
          bibleStory: 'Acts 13–14',
          characters: 'Paul (Saul), Barnabas, John Mark',
          story: 'The church in Antioch felt God telling them to send Barnabas and Paul on a special mission trip. They went to Cyprus first, where they met a sorcerer and converted a Roman governor. Then they went to what\'s now Turkey. In different cities, Paul would go to the synagogues and preach. Some people believed (especially non-Jews), but others got angry and caused trouble. In one city called Lystra, Paul healed a man who couldn\'t walk, and the people thought Paul and Barnabas were gods! But then some troublemakers came and got the crowd so angry they threw rocks at Paul and left him for dead. Amazingly, he survived and kept preaching! They visited several cities, started new churches, and appointed leaders in each place. When they came back to Antioch, they reported how God had "opened a door of faith to the Gentiles." This trip was super important because it was the first organized mission to tell non-Jewish people about Jesus.'
        },
        {
          title: 'The Jerusalem Council (Gentiles and the Law)',
          when: 'AD 49',
          bibleStory: 'Acts 15:1–29; Galatians 2:1–10',
          characters: 'James (Jesus\' brother), Peter, Paul, Barnabas',
          story: 'As more and more non-Jewish people became Christians, some Jewish Christians started arguing: "Do these new believers have to follow all our Jewish laws and get circumcised to really be Christians?" Paul and Barnabas strongly disagreed, so they went to Jerusalem to meet with the apostles and church leaders. This became known as the Jerusalem Council - like the first big church meeting ever! Peter spoke up and said, "Hey, God gave His Spirit to the non-Jews just like He did to us Jews. We\'re all saved the same way - by believing in Jesus, not by following a bunch of rules." Paul and Barnabas told about all the amazing miracles God did among the Gentiles. James (Jesus\' brother, who was now leading the Jerusalem church) agreed and said they shouldn\'t make it hard for non-Jews to become Christians. They just asked them to avoid a few things that would cause problems when Jews and non-Jews ate together. This decision was huge! It meant you didn\'t have to become Jewish to be a Christian, and it kept the church from splitting into two separate groups.'
        },
        {
          title: 'Paul\'s Second Missionary Journey',
          when: 'AD 50–52',
          bibleStory: 'Acts 15:36–18:22',
          characters: 'Paul, Silas, Timothy, Luke, Aquila, Priscilla',
          story: 'Paul wanted to visit all the churches from his first trip, but he and Barnabas had an argument about bringing John Mark along. So they split up - Barnabas took Mark to Cyprus, and Paul took a new partner named Silas. In one town, they met a young guy named Timothy who joined their team. Then something amazing happened - Paul had a dream about a man from Macedonia (in Europe) asking for help. So they sailed across and brought Christianity to Europe for the first time! In Philippi, they met a businesswoman named Lydia who became a Christian, and they converted a jailer\'s whole family after an earthquake miraculously opened their prison doors. In different cities they faced both success and persecution. Paul spent a year and a half in Corinth, making tents with a couple named Aquila and Priscilla while building a strong church there. This trip was incredible because it brought Christianity to Europe and resulted in some of Paul\'s letters to churches that we still read today.'
        },
        {
          title: 'Paul\'s Arrest in Jerusalem',
          when: 'AD 57',
          bibleStory: 'Acts 21:27–36; 22:22–29',
          characters: 'Paul, Roman tribune Claudius Lysias',
          story: 'When Paul visited the temple in Jerusalem, some Jews from Asia saw him and started shouting that he was teaching against Jewish law and had brought non-Jews into the temple (which wasn\'t true - they just saw him in the city with a non-Jewish friend earlier). A huge crowd grabbed Paul and started beating him up. Roman soldiers had to rescue him and put him in chains. Paul asked if he could speak to the crowd, and when he told his story in Hebrew, they listened... until he mentioned that God sent him to non-Jewish people. Then they went crazy again, shouting and throwing dirt in the air! The Roman commander was about to have Paul whipped to make him confess, but Paul revealed he was a Roman citizen, which meant they couldn\'t legally torture him. This was the beginning of a long series of trials that would eventually take Paul to Rome to appear before Caesar himself.'
        },
        {
          title: 'Martyrdom of Peter and Paul',
          when: 'AD 64–67',
          bibleStory: '2 Timothy 4:6–8; John 21:18–19',
          characters: 'Apostle Peter, Apostle Paul, Emperor Nero',
          story: 'According to early church tradition, both Peter and Paul were killed during Nero\'s brutal persecution in Rome. After a great fire destroyed much of Rome in AD 64, Nero blamed the Christians and started a horrible persecution. Peter was crucified upside down (because he didn\'t feel worthy to die exactly like Jesus), and Paul was beheaded (because as a Roman citizen, he got a quicker death). Before Paul died, he wrote his final letter (2 Timothy) where he said, "I have fought the good fight, I have finished the race, I have kept the faith." Their deaths showed their complete dedication to Jesus and marked the end of the original apostles\' leadership. But their teachings, letters, and example continued to inspire Christians everywhere. As an old saying goes, "The blood of the martyrs is the seed of the church" - their sacrifice actually helped Christianity grow even more!'
        },
        {
          title: 'Destruction of Jerusalem and the Second Temple',
          when: 'AD 70',
          bibleStory: 'Luke 19:41–44; 21:20–24',
          characters: 'Roman General Titus, Jewish rebels',
          story: 'Just like Jesus had predicted about 40 years earlier, Jerusalem was completely destroyed by the Romans. The Jews had revolted against Rome in AD 66, and Roman armies under General Titus came to put down the rebellion. After a horrible siege that lasted several months, Jerusalem was conquered and the beautiful Second Temple was completely destroyed - not one stone was left on another, exactly as Jesus said would happen! This was devastating for the Jewish people because it meant the end of temple sacrifices and the whole sacrificial system. For Christians, it showed that Jesus\' prophecies came true and helped separate Christianity completely from Judaism. Many Christians had already fled the city because they remembered Jesus\' warnings to run when they saw armies surrounding Jerusalem. This event marked the end of the old covenant age and confirmed that God\'s people were no longer tied to one city or building, but were found in every nation through faith in Jesus.'
        },
        {
          title: 'Death of the Apostle John – End of the Apostolic Age',
          when: 'AD 100',
          bibleStory: '(Implied end of Revelation)',
          characters: 'John',
          story: 'Around AD 100, John died peacefully in Ephesus, probably the only apostle who wasn\'t martyred. With his death, the Apostolic Age officially ended - all the people who had actually seen Jesus with their own eyes were now gone. But Christianity was stronger than ever! The New Testament was complete and being copied and shared everywhere. The foundations of Christian teaching were rock-solid. The next generation of church leaders (called Church Fathers) took over, guided by the Holy Spirit and all the writings the apostles had left behind. By the end of the first century, Christianity had spread throughout the Roman Empire and beyond, and was ready to grow even more. What started with 12 scared disciples hiding in a small room had become a worldwide movement that would eventually transform the entire Roman Empire and change the world forever. The apostolic age showed that even when things look really bad - persecution, arrests, shipwrecks, martyrdom - God can use everything, even the worst situations, to spread His love and truth to more and more people. It\'s an incredible story of how ordinary people, filled with God\'s Spirit, can change the world!'
        }
      ],
      connections: []
    },
    {
      id: 'end-times',
      title: 'END TIMES',
      subtitle: 'Prophesied Events in Revelation',
      emoji: '👑',
      bgEmoji: '🌟',
      color: '#FFD700',
      gradient: ['#FFF176', '#FFD700', '#FFC107'],
      position: { x: width * 2.75, y: 1000 },
      size: 120,
      description: 'The ultimate conclusion of God\'s plan! Jesus returns as King of Kings, evil is defeated forever, and God creates a perfect new heaven and new earth where He lives with His people for eternity.',
      stories: [
        {
          title: 'The Second Coming of Jesus Christ',
          when: 'Future – time unknown',
          bibleStory: 'Matthew 24:30–31; Revelation 19:11–16',
          characters: 'Jesus Christ',
          story: 'The Bible tells us that one day, Jesus is going to return to earth in the most amazing way possible! John\'s vision in Revelation shows Jesus riding on a white horse as the King of Kings and Lord of Lords, leading armies from heaven. But this won\'t be like when He came as a baby in Bethlehem - this time He\'s coming as a powerful King to defeat all evil! He\'ll defeat the Antichrist (a super evil leader called "the Beast") and all the wicked nations in a final battle called Armageddon. Jesus promised His disciples that He would come back in power and great glory, and this is when that promise gets fulfilled! When He returns, all the Christians who have died will be brought back to life, and the Christians who are still alive will be transformed to have perfect bodies. This begins Jesus\' direct rule on earth for 1,000 years (called the Millennium). For Christians, this is called "the blessed hope" because it means that no matter how bad things get in the world, Jesus will ultimately win and make everything right again! Evil will not have the last word - Jesus will restore everything just like it\'s supposed to be.'
        },
        {
          title: 'The Final Judgment',
          when: 'Future – after Christ\'s return',
          bibleStory: 'Revelation 20:11–15; Matthew 25:31–46',
          characters: 'God the Judge, all humanity',
          story: 'After Jesus has ruled on earth, there will be one final, massive court session where everyone who ever lived will stand before God\'s great white throne. This is called the Final Judgment, and it\'s like the ultimate report card day for all of human history! Special books will be opened, including the most important one called the "Book of Life." People who rejected God will be judged according to everything they did wrong and will be sent to the lake of fire (also called the "second death") along with the devil, the Antichrist, and even death itself. Jesus described this like a shepherd separating sheep from goats - the "sheep" (people who followed Jesus) get to enter eternal life with God, but the "goats" (people who rejected Him) face eternal punishment. This shows God\'s perfect justice and proves that He is completely holy and fair. For people whose names are written in the Book of Life because they trusted in Jesus, this is the doorway to forever happiness with God! For those who said "no" to God\'s love their whole lives, this is when they face the consequences of their choices. After this judgment, sin and sadness will be completely finished forever in God\'s universe.'
        },
        {
          title: 'New Heavens and New Earth',
          when: 'Future – after Final Judgment',
          bibleStory: 'Revelation 21:1–7; 22:1–5; Isaiah 65:17',
          characters: 'God, all the people He saved',
          story: 'After the final judgment, God is going to do the most amazing thing ever - He\'s going to create a brand new heaven and a brand new earth! The old world with all its sin, death, and sadness will be completely gone. John saw an incredible vision of the New Jerusalem (like the ultimate perfect city) coming down from heaven, all prepared like a beautiful bride on her wedding day. The best part? God is going to live right there with people! He promises to wipe away every single tear from their eyes, and there will be no more death, no more crying, no more pain - all the bad stuff will be gone forever! The New Jerusalem is described with the most beautiful things you can imagine - streets made of pure gold and gates made of giant pearls - showing just how incredibly glorious and pure God\'s kingdom will be. There won\'t even need to be a temple because God and Jesus will be right there with everyone! The curse that came from sin in the Garden of Eden will be completely gone, and the Tree of Life will be there again, giving fruit and healing to everyone. All the people God saved will actually get to see His face and rule with Him forever and ever! This is the ultimate happy ending - God and His people living together forever in a perfect world where everything is exactly the way it\'s supposed to be. It\'s like the Garden of Eden, but even better, and it will last forever and ever with no possibility of anything ever going wrong again!'
        }
      ],
      connections: []
    }
  ];

  // Smooth floating animation for bubbles (no rotation)
  useEffect(() => {
    const animations = bubbleAnimations.map((anim, index) => {
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.float, {
            toValue: 1,
            duration: 4000 + (index * 300),
            useNativeDriver: true,
          }),
          Animated.timing(anim.float, {
            toValue: 0,
            duration: 4000 + (index * 300),
            useNativeDriver: true,
          }),
        ])
      );

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.pulse, {
            toValue: 1.03,
            duration: 3000 + (index * 200),
            useNativeDriver: true,
          }),
          Animated.timing(anim.pulse, {
            toValue: 1,
            duration: 3000 + (index * 200),
            useNativeDriver: true,
          }),
        ])
      );

      floatAnimation.start();
      pulseAnimation.start();

      return { floatAnimation, pulseAnimation };
    });

    return () => {
      animations.forEach(({ floatAnimation, pulseAnimation }) => {
        floatAnimation.stop();
        pulseAnimation.stop();
      });
    };
  }, []);

  const handleBubblePress = (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);
    
    // Epic selection animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Generate beautiful animated geometric shapes background
  const renderGeometricShapesBackground = () => {
    const shapes = [];
    const shapeTypes = ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star', 'pentagon'];
    const colors = [
      '#F4E4BC', '#E8D5A3', '#DCC68A', '#D0B871', '#C4A958', 
      '#B89B3F', '#AC8C26', '#F0E68C', '#DAA520', '#CD853F',
      '#D2B48C', '#F5DEB3', '#FFE4B5', '#FFEFD5', '#FFF8DC'
    ];
    
    // Generate small static shapes (minimal animations for performance)
    for (let i = 0; i < 30; i++) {
      const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 40 + 15; // Bigger: Size between 15-55
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (3200 - size); // Extended for Apostolic Age positioning
      const rotation = Math.random() * 360;
      const opacity = Math.random() * 0.4 + 0.1; // Opacity between 0.1-0.5
      
      // Only animate every 6th shape with very simple movement
      let animatedTransform = [];
      let shapeComponent = View;
      
      if (i % 6 === 0) {
        // Create minimal animation for only some shapes
        const floatAnim = new Animated.Value(0);
        
        // Very simple, slow floating animation
        const startSimpleAnimation = () => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(floatAnim, {
                toValue: 1,
                duration: 15000, // Very slow: 15 seconds
                useNativeDriver: true,
              }),
              Animated.timing(floatAnim, {
                toValue: 0,
                duration: 15000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        };
        
        // Start animation after delay
        setTimeout(startSimpleAnimation, Math.random() * 5000);
        
        animatedTransform = [
          {
            translateY: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 20], // Very small movement
            }),
          },
        ];
        
        shapeComponent = Animated.View;
      }
      
      let shapeElement;
      
      if (shapeType === 'triangle') {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            styles.triangleShape,
            {
              left: x,
              top: y,
              opacity: opacity,
              transform: [...animatedTransform, { rotate: `${rotation}deg` }],
              borderBottomColor: color,
              borderLeftWidth: size * 0.6,
              borderRightWidth: size * 0.6,
              borderBottomWidth: size,
            }
          ]
        });
      } else if (shapeType === 'star') {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            styles.starShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [...animatedTransform, { rotate: `${rotation}deg` }],
            }
          ]
        });
      } else {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [...animatedTransform, { rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 
                          shapeType === 'pentagon' ? size / 3 : 0,
            }
          ]
        });
      }
      
      shapes.push(shapeElement);
    }
    
    // Add medium static accent shapes (minimal animations)
    for (let i = 0; i < 10; i++) {
      const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 60 + 40; // Bigger: Medium sizes 40-100
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (3200 - size); // Extended for Apostolic Age positioning
      const opacity = Math.random() * 0.3 + 0.05; // More visible
      
      // Medium shapes are completely static (no animations)
      const rotation = Math.random() * 360;
      
      shapes.push(
        <View
          key={`medium-shape-${i}`}
          style={[
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 
                          shapeType === 'pentagon' ? size / 3 : 0,
            }
          ]}
        />
      );
    }
    
    // Add large static background shapes (no animations)
    for (let i = 0; i < 8; i++) {
      const shapeType = ['circle', 'square', 'hexagon'][Math.floor(Math.random() * 3)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 100 + 100; // Much bigger: Large sizes 100-200
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (3200 - size); // Extended for Apostolic Age positioning
      const opacity = Math.random() * 0.15 + 0.03; // More visible
      
      // Large shapes are completely static (no animations)
      const rotation = Math.random() * 360;
      
      shapes.push(
        <View
          key={`large-shape-${i}`}
          style={[
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 0,
            }
          ]}
        />
      );
    }
    
    return (
      <View style={styles.geometricShapesContainer}>
        {shapes}
      </View>
    );
  };

  // Render beautiful curved flowing path like a golden river through the desert
  const renderCurvedFlowingPath = () => {
    if (timelineData.length < 2) return null;

    return (
      <View style={styles.curvedPathContainer}>
        {timelineData.map((era, index) => {
          if (index === timelineData.length - 1) return null; // No path after last era
          
          const nextEra = timelineData[index + 1];
          
          // Calculate edge-to-edge connection points for better visual connection
          let startX, startY, endX, endY;
          
          // Determine connection points based on relative positions
          if (Math.abs(nextEra.position.x - era.position.x) < 50) {
            // Eras are vertically aligned - use center points for clean vertical connection
            startX = era.position.x + era.size / 2;
            endX = nextEra.position.x + nextEra.size / 2;
          } else if (nextEra.position.x > era.position.x) {
            // Next era is to the right - connect from right edge to left edge
            startX = era.position.x + era.size;
            endX = nextEra.position.x;
          } else {
            // Next era is to the left - connect from left edge to right edge  
            startX = era.position.x;
            endX = nextEra.position.x + nextEra.size;
          }
          
          if (nextEra.position.y > era.position.y) {
            // Next era is below - connect from bottom edge to top edge
            startY = era.position.y + era.size;
            endY = nextEra.position.y;
          } else {
            // Next era is above - connect from top edge to bottom edge
            startY = era.position.y;
            endY = nextEra.position.y + nextEra.size;
          }
          
          // For cases where eras are at similar heights, use center points
          if (Math.abs(nextEra.position.y - era.position.y) < 50) {
            startY = era.position.y + era.size / 2;
            endY = nextEra.position.y + nextEra.size / 2;
          }
          
          // Calculate arrow position at 80% along the path for better visibility
          const arrowX = startX + (endX - startX) * 0.8;
          const arrowY = startY + (endY - startY) * 0.8;
          
          // Calculate arrow angle
          const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
          
          // Create smooth curved path segments
          const segments = [];
          const numSegments = 12; // More segments = smoother curve
          
          for (let i = 0; i < numSegments; i++) {
            const t = i / (numSegments - 1);
            
            // Create beautiful flowing curve with control points
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
            const curveOffset = 40; // How much the curve flows
            
            // Quadratic bezier curve for smooth flow
            const controlX = midX + (index % 2 === 0 ? curveOffset : -curveOffset);
            const controlY = midY - curveOffset / 2;
            
            const x = Math.pow(1-t, 2) * startX + 2 * (1-t) * t * controlX + t * t * endX;
            const y = Math.pow(1-t, 2) * startY + 2 * (1-t) * t * controlY + t * t * endY;
            
            if (i < numSegments - 1) {
              const nextT = (i + 1) / (numSegments - 1);
              const nextX = Math.pow(1-nextT, 2) * startX + 2 * (1-nextT) * nextT * controlX + nextT * nextT * endX;
              const nextY = Math.pow(1-nextT, 2) * startY + 2 * (1-nextT) * nextT * controlY + nextT * nextT * endY;
              
              const segmentLength = Math.sqrt(Math.pow(nextX - x, 2) + Math.pow(nextY - y, 2));
              const segmentAngle = Math.atan2(nextY - y, nextX - x) * (180 / Math.PI);
              
              segments.push(
                <View key={`segment-${index}-${i}`}>
                  {/* Outer glow - theme colored */}
                  <View style={{
                    position: 'absolute',
                    left: x - 2,
                    top: y - 2,
                    width: segmentLength + 4,
                    height: 12,
                    backgroundColor: theme.primary + '20', // Theme primary with transparency
                    borderRadius: 6,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary, // Theme primary shadow
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                  }} />
                  
                  {/* Middle glow */}
                  <View style={{
                    position: 'absolute',
                    left: x - 1,
                    top: y - 1,
                    width: segmentLength + 2,
                    height: 8,
                    backgroundColor: theme.primary + '40', // Theme primary with more opacity
                    borderRadius: 4,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 12,
                  }} />
                  
                  {/* Main flowing path */}
                  <View style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: segmentLength,
                    height: 5,
                    backgroundColor: theme.primary + 'DD', // Theme primary with high opacity
                    borderRadius: 2.5,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary, // Theme primary shadow
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }} />
                  
                  {/* Inner bright core */}
                  <View style={{
                    position: 'absolute',
                    left: x,
                    top: y + 1,
                    width: segmentLength,
                    height: 3,
                    backgroundColor: theme.primary, // Theme primary full color
                    borderRadius: 1.5,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                  }} />
                </View>
              );
            }
          }

    return (
            <View key={`curved-path-${index}`}>
              {segments}
              
              {/* Flowing theme particles along the curve */}
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.25,
                top: startY + (endY - startY) * 0.2 - 15,
                width: 12,
                height: 12,
                backgroundColor: theme.primary, // Theme primary color
                borderRadius: 6,
                opacity: 0.9,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                transform: [
                  {
                    translateX: bubbleAnimations[index % bubbleAnimations.length]?.float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 30],
                    }) || 0,
                  },
                  {
                    translateY: bubbleAnimations[index % bubbleAnimations.length]?.float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }) || 0,
                  },
                ],
              }} />
              
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.6,
                top: startY + (endY - startY) * 0.5 - 20,
                width: 10,
                height: 10,
                backgroundColor: theme.primary + 'DD', // Theme primary with transparency
                borderRadius: 5,
                opacity: 0.8,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                transform: [
                  {
                    translateX: bubbleAnimations[(index + 1) % bubbleAnimations.length]?.float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -25],
                    }) || 0,
                  },
                  {
                    translateY: bubbleAnimations[(index + 1) % bubbleAnimations.length]?.float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 15],
                    }) || 0,
                  },
                ],
              }} />
              
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.85,
                top: startY + (endY - startY) * 0.8 - 10,
                width: 8,
                height: 8,
                backgroundColor: theme.primary + 'AA', // Theme primary with transparency
                borderRadius: 4,
                opacity: 0.7,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                transform: [
                  {
                    translateX: bubbleAnimations[(index + 2) % bubbleAnimations.length]?.float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 20],
                    }) || 0,
                  },
                ],
              }} />
              {/* Big Glowing Arrow - Positioned along the path for visibility */}
              <View style={{
                position: 'absolute',
                left: arrowX - 25,
                top: arrowY - 20,
                width: 50,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: `${angle}deg` }],
                zIndex: 5, // Above everything else
              }}>
                {/* Outer Glow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 45,
                  borderTopWidth: 20,
                  borderBottomWidth: 20,
                  borderLeftColor: '#FFD700' + '40', // Bright gold glow
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                }} />
                
                {/* Middle Glow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 35,
                  borderTopWidth: 15,
                  borderBottomWidth: 15,
                  borderLeftColor: '#DAA520' + '80',
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#DAA520',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 15,
                }} />
                
                {/* Main Arrow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 28,
                  borderTopWidth: 12,
                  borderBottomWidth: 12,
                  borderLeftColor: '#8B4513',
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 2, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 5,
                  elevation: 8,
                }} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTimelineBubble = (era, index) => {
    const anim = bubbleAnimations[index] || { float: new Animated.Value(0), pulse: new Animated.Value(1) };
    const isSelected = selectedEra?.id === era.id;

    return (
      <Animated.View
        key={era.id}
        style={[
          styles.timelineBubbleContainer,
          {
            left: era.position.x - era.size / 2,
            top: era.position.y,
            transform: [
              {
                translateY: anim.float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
              {
                scale: anim.pulse.interpolate({
                  inputRange: [1, 1.03],
                  outputRange: [isSelected ? 1.1 : 1, isSelected ? 1.13 : 1.03],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.timelineSticker]}
          onPress={() => handleBubblePress(era)}
          activeOpacity={0.8}
        >
                    {/* Floating Aura Rings */}
          <Animated.View style={[styles.auraRing1, {
            width: era.size + 40,
            height: era.size + 40,
            borderRadius: (era.size + 40) / 2,
            backgroundColor: `${theme.primary}15`,
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1, 1.1],
              }),
            }],
          }]} />
          
          <Animated.View style={[styles.auraRing2, {
                width: era.size + 20, 
                height: era.size + 20, 
                borderRadius: (era.size + 20) / 2,
            backgroundColor: `${theme.primary}25`,
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1.05, 0.95],
              }),
            }],
          }]} />
          
          {/* Rotating Sparkle Particles */}
          {Array.from({ length: 6 }).map((_, sparkleIndex) => (
            <Animated.View
              key={sparkleIndex}
              style={[
                styles.sparkleParticle,
                {
                  transform: [
                    {
                      rotate: anim.float.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${sparkleIndex * 60}deg`, `${sparkleIndex * 60 + 360}deg`],
                      }),
                    },
                    {
                      translateX: era.size * 0.6,
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sparkle, { backgroundColor: theme.primary }]} />
            </Animated.View>
          ))}
          
          {/* Main Sticker with Enhanced Effects */}
          <Animated.View style={{
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1, 1.05],
              }),
            }],
          }}>
                    <Image
          source={era.id === 'creation'
            ? require('../assets/creation-sticker.png')
            : era.id === 'patriarchs'
            ? require('../assets/patriarchs-sticker.png')
            : era.id === 'exodus'
            ? require('../assets/exodus-sticker.png')
            : era.id === 'conquest'
            ? require('../assets/conquest-sticker.png')
            : era.id === 'judges'
            ? require('../assets/judges-sticker.png')
            : era.id === 'united-kingdom'
            ? require('../assets/united-kingdom-sticker.png')
            : era.id === 'divided-kingdom'
            ? require('../assets/divided-kingdom-sticker.png')
            : era.id === 'exile'
            ? require('../assets/exile-sticker.png')
            : era.id === 'return'
            ? require('../assets/return-sticker.png')
            : era.id === 'intertestamental'
            ? require('../assets/intertestamental-sticker.png')
            : era.id === 'jesus'
            ? require('../assets/jesus-sticker.png')
            : era.id === 'early-church'
            ? require('../assets/early-church-sticker.png')
            : era.id === 'apostolic-age'
            ? require('../assets/apostolic-sticker.png')
            : require('../assets/end-times-sticker.png')
          } 
              style={[styles.stickerImage, { 
                width: era.size, 
                height: era.size,
                // Add a subtle glow filter effect
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
              }]}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Enhanced Selection Glow */}
          {isSelected && (
                        <Animated.View style={[styles.selectionGlow, { 
              width: era.size + 60, 
              height: era.size + 60, 
              borderRadius: (era.size + 60) / 2,
              borderColor: theme.primary,
              backgroundColor: `${theme.primary}10`,
              transform: [{
                scale: new Animated.Value(1).interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              }],
              }]} />
            )}
        </TouchableOpacity>
        
        {/* Floating Title */}
        <Animated.View
          style={[
            styles.bubbleTitle,
            {
              transform: [
                {
                  translateY: anim.float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={30} tint={isDark ? "systemMaterialDark" : "systemMaterialLight"} style={styles.titleBlur}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              {era.title}
            </Text>
                          <Text style={[styles.subtitleText, { color: theme.primary }]}>
              {era.subtitle}
            </Text>
          </BlurView>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderSelectedEraDetail = () => {
    if (!selectedEra) return null;

    return (
      <Animated.View
        style={[
          styles.eraDetailContainer,
          {
            opacity: selectedEra ? 1 : 0,
            transform: [
              {
                translateY: selectedEra ? 0 : 50,
              },
            ],
          },
        ]}
      >
        <BlurView intensity={35} tint={isDark ? "systemMaterialDark" : "systemMaterialLight"} style={styles.eraDetailCard}>
          <LinearGradient
            colors={[`${selectedEra.color}25`, `${selectedEra.color}15`, 'transparent']}
            style={styles.eraDetailGradient}
          >
            {/* Header */}
            <View style={styles.eraDetailHeader}>
              <View style={[styles.eraDetailIcon, { backgroundColor: `${selectedEra.color}30` }]}>
                <Text style={styles.eraDetailEmoji}>{selectedEra.emoji}</Text>
                <Text style={styles.eraDetailBgEmoji}>{selectedEra.bgEmoji}</Text>
              </View>
              <View style={styles.eraDetailTitles}>
                <Text style={[styles.eraDetailTitle, { color: '#1a1a1a' }]}>
                  {selectedEra.title}
                </Text>
                <Text style={[styles.eraDetailSubtitle, { color: '#1a1a1a' }]}>
                  {selectedEra.subtitle}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.eraDetailDescription, { color: '#1a1a1a' }]}>
              {selectedEra.description}
            </Text>

            {/* Stories - Beautiful Bible Adventures */}
            <View style={styles.storiesContainer}>
              <Text style={[styles.storiesTitle, { color: '#1a1a1a' }]}>
                BIBLE ADVENTURES
              </Text>
              <ScrollView 
                style={styles.storiesScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {selectedEra.stories?.map((storyItem, index) => (
                  <View
                    key={index}
                    style={[
                      styles.storyCard,
                      {
                        backgroundColor: `${selectedEra.color}15`,
                        borderColor: `${selectedEra.color}30`,
                      },
                    ]}
                  >
                    <Text style={[styles.storyTitle, { color: '#1a1a1a' }]}>
                      {storyItem.title}
                    </Text>
                    
                    <View style={styles.storyDetails}>
                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#1a1a1a' }]}>When:</Text>
                        <Text style={[styles.storyValue, { color: '#1a1a1a' }]}>{storyItem.when}</Text>
              </View>
                      
                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#1a1a1a' }]}>Bible Story:</Text>
                        <Text style={[styles.storyValue, { color: '#1a1a1a', fontWeight: '600' }]}>{storyItem.bibleStory}</Text>
                      </View>
                      
                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#1a1a1a' }]}>Characters:</Text>
                        <Text style={[styles.storyValue, { color: '#1a1a1a' }]}>{storyItem.characters}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.storyText, { color: '#1a1a1a' }]}>
                      {storyItem.story}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${selectedEra.color}20` }]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedEra(null);
              }}
            >
              <MaterialIcons name="close" size={20} color={selectedEra.color} />
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  // Smooth pan responder for intuitive mindmap movement
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: () => {
      hapticFeedback.light();
      panX.setOffset(panX._value);
      panY.setOffset(panY._value);
      panX.setValue(0);
      panY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Smooth, responsive movement
      panX.setValue(gestureState.dx);
      panY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (evt, gestureState) => {
      panX.flattenOffset();
      panY.flattenOffset();
      
      // Smooth deceleration with boundaries
      const maxX = 100;
      const maxY = 200;
      const minX = -100;
      const minY = -200;
      
      let finalX = panX._value;
      let finalY = panY._value;
      
      // Add momentum
      finalX += gestureState.vx * 100;
      finalY += gestureState.vy * 100;
      
      // Clamp to boundaries
      finalX = Math.max(minX, Math.min(maxX, finalX));
      finalY = Math.max(minY, Math.min(maxY, finalY));
      
      Animated.spring(panX, {
        toValue: finalX,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
      
      Animated.spring(panY, {
        toValue: finalY,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}} transparent={false}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={{ backgroundColor: theme.background }}>
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Timeline</Text>
            <View style={{ width: 24 }} />
        </View>
        </SafeAreaView>
        
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>

      {/* Interactive Mindmap with Smooth Scrolling */}
      <ScrollView
        style={styles.mindmapScrollContainer}
        contentContainerStyle={styles.mindmapContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={true}
        bouncesZoom={true}
        minimumZoomScale={0.8}
        maximumZoomScale={2.0}
        pinchGestureEnabled={true}
        scrollEventThrottle={16}
      >
        {/* Scattered Geometric Shapes Background */}
        {renderGeometricShapesBackground()}
        
        {/* Beautiful Curved Flowing Path */}
        {renderCurvedFlowingPath()}

        {/* Floating Bubbles */}
        {timelineData.map((era, index) => renderTimelineBubble(era, index))}
        
        {/* Floating Particles */}
        <View style={styles.particlesContainer}>
          {Array.from({ length: 18 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: Math.random() * (width * 3.0),
                  top: Math.random() * 400,
                  backgroundColor: timelineData[index % timelineData.length]?.color + '40',
                  transform: [
                    {
                      translateY: bubbleAnimations[index % bubbleAnimations.length]?.float.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }) || 0,
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      {/* Era Detail Panel */}
      {renderSelectedEraDetail()}
      </View>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  decorativeElements: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    bottom: -100,
    height: screenHeight + 150,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
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
  backButton: {
    width: 60, // Bigger
    height: 60, // Bigger
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  backButtonGlow: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  helpButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  helpButtonBlur: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  // Interactive Mindmap
  mindmapScrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mindmapContent: {
    width: width * 2.9 + 150, // Much tighter - just enough for rightmost era + minimal padding
    height: 1600,
    position: 'relative',
    backgroundColor: 'transparent', // Make content transparent too
  },
  
  // Geometric Shapes Background
  geometricShapesContainer: {
    position: 'absolute',
    top: -200, // Start above visible area
    left: -200, // Start left of visible area
    width: width * 3.1 + 300, // Tighter coverage matching reduced content width
    height: 3200 + 400, // Extended for Apostolic Age positioning
    zIndex: -1, // Behind everything else
  },
  geometricShape: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  triangleShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  starShape: {
    transform: [{ rotate: '45deg' }],
  },
  
  // Curved Flowing Path
  curvedPathContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Behind the stickers so they can be tapped
  },
  connectionContainer: {
    position: 'absolute',
  },
  connectionGlow: {
    position: 'absolute',
    borderRadius: 4,
    opacity: 0.6,
    elevation: 2,
  },
  connectionLine: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.9,
    elevation: 4,
  },
  arrowHead: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    elevation: 6,
  },
  flowParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
    elevation: 6,
  },
  
  // Timeline Bubbles
  timelineBubbleContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10, // Above the curved path
  },
  timelineSticker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 12,
    shadowColor: '#000',
    zIndex: 10, // Above the curved path
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  stickerImage: {
    zIndex: 10,
    elevation: 15,
  },
  auraRing1: {
    position: 'absolute',
    opacity: 0.6,
    zIndex: 1,
  },
  auraRing2: {
    position: 'absolute',
    opacity: 0.8,
    zIndex: 2,
  },
  sparkleParticle: {
    position: 'absolute',
    zIndex: 3,
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
    elevation: 5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  selectionGlow: {
    position: 'absolute',
    borderWidth: 3,
    opacity: 0.8,
    zIndex: 0,
    elevation: 20,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 4,
    opacity: 1,
    zIndex: 0,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  bubbleTitle: {
    marginTop: 12,
    alignItems: 'center',
  },
  titleBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: 'hidden', // This ensures BlurView respects borderRadius
  },
  titleText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  
  // Floating Particles
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  
  // Era Detail Panel
  eraDetailContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    maxHeight: '75%',
  },
  eraDetailCard: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  eraDetailGradient: {
    padding: 20,
  },
  eraDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eraDetailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  eraDetailEmoji: {
    fontSize: 24,
    zIndex: 2,
  },
  eraDetailBgEmoji: {
    position: 'absolute',
    fontSize: 40,
    opacity: 0.3,
    zIndex: 1,
  },
  eraDetailTitles: {
    flex: 1,
  },
  eraDetailTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  eraDetailSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eraDetailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  
  // Stories Container
  storiesContainer: {
    marginBottom: 16,
    flex: 1,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  storiesScrollView: {
    maxHeight: 300,
  },
  storyCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  storyDetails: {
    marginBottom: 12,
  },
  storyDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    marginRight: 8,
  },
  storyValue: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  storyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  
});

export default BibleTimeline;