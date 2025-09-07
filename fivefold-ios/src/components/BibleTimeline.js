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
    Array.from({ length: 11 }, () => ({
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
        // Stories will be added when user provides the content
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
      const x = Math.random() * (width * 6.0 - size); // Extended to cover new era
      const y = Math.random() * (2500 - size); // Extend much taller
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
      const x = Math.random() * (width * 6.0 - size); // Extended to cover new era
      const y = Math.random() * (2500 - size); // Extend much taller
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
      const x = Math.random() * (width * 6.0 - size); // Extended to cover new era
      const y = Math.random() * (2500 - size); // Extend much taller
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
          if (nextEra.position.x > era.position.x) {
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
            : require('../assets/jesus-sticker.png')
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
    width: width * 4.0,
    height: 1200,
    position: 'relative',
    backgroundColor: 'transparent', // Make content transparent too
  },
  
  // Geometric Shapes Background
  geometricShapesContainer: {
    position: 'absolute',
    top: -200, // Start above visible area
    left: -200, // Start left of visible area
    width: width * 6.0 + 400, // Extended to cover new era
    height: 2500 + 400, // Much taller with extra padding
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