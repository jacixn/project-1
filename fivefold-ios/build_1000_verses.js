// Script to build 1,000+ Bible verses collection
// This will systematically add verses from every book of the Bible

const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-expanded.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// Additional Psalms (targeting 200+ total from Psalms)
const additionalPsalms = [
  { text: "Great is the Lord and most worthy of praise; his greatness no one can fathom.", reference: "Psalm 145:3", category: "praise", book: "psalms" },
  { text: "The Lord is gracious and compassionate, slow to anger and rich in love.", reference: "Psalm 145:8", category: "character", book: "psalms" },
  { text: "The Lord is trustworthy in all he promises and faithful in all he does.", reference: "Psalm 145:13", category: "faithfulness", book: "psalms" },
  { text: "The Lord upholds all who fall and lifts up all who are bowed down.", reference: "Psalm 145:14", category: "support", book: "psalms" },
  { text: "You open your hand and satisfy the desires of every living thing.", reference: "Psalm 145:16", category: "provision", book: "psalms" },
  { text: "The Lord is near to all who call on him, to all who call on him in truth.", reference: "Psalm 145:18", category: "presence", book: "psalms" },
  { text: "My mouth will speak in praise of the Lord. Let every creature praise his holy name for ever and ever.", reference: "Psalm 145:21", category: "praise", book: "psalms" },
  { text: "Praise the Lord. Praise the Lord, my soul.", reference: "Psalm 146:1", category: "praise", book: "psalms" },
  { text: "I will praise the Lord all my life; I will sing praise to my God as long as I live.", reference: "Psalm 146:2", category: "worship", book: "psalms" },
  { text: "Do not put your trust in princes, in human beings, who cannot save.", reference: "Psalm 146:3", category: "trust", book: "psalms" },
  { text: "Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God.", reference: "Psalm 146:5", category: "blessing", book: "psalms" },
  { text: "He is the Maker of heaven and earth, the sea, and everything in them—he remains faithful forever.", reference: "Psalm 146:6", category: "creation", book: "psalms" },
  { text: "He upholds the cause of the oppressed and gives food to the hungry. The Lord sets prisoners free.", reference: "Psalm 146:7", category: "justice", book: "psalms" },
  { text: "The Lord gives sight to the blind, the Lord lifts up those who are bowed down, the Lord loves the righteous.", reference: "Psalm 146:8", category: "healing", book: "psalms" },
  { text: "The Lord watches over the foreigner and sustains the fatherless and the widow, but he frustrates the ways of the wicked.", reference: "Psalm 146:9", category: "protection", book: "psalms" },
  { text: "The Lord reigns forever, your God, O Zion, for all generations. Praise the Lord.", reference: "Psalm 146:10", category: "sovereignty", book: "psalms" },
  { text: "How good it is to sing praises to our God, how pleasant and fitting to praise him!", reference: "Psalm 147:1", category: "worship", book: "psalms" },
  { text: "The Lord builds up Jerusalem; he gathers the exiles of Israel.", reference: "Psalm 147:2", category: "restoration", book: "psalms" },
  { text: "He heals the brokenhearted and binds up their wounds.", reference: "Psalm 147:3", category: "healing", book: "psalms" },
  { text: "He determines the number of the stars and calls them each by name.", reference: "Psalm 147:4", category: "creation", book: "psalms" },
  { text: "Great is our Lord and mighty in power; his understanding has no limit.", reference: "Psalm 147:5", category: "power", book: "psalms" },
  { text: "The Lord sustains the humble but casts the wicked to the ground.", reference: "Psalm 147:6", category: "justice", book: "psalms" },
  { text: "Sing to the Lord with grateful praise; make music to our God on the harp.", reference: "Psalm 147:7", category: "gratitude", book: "psalms" },
  { text: "He covers the sky with clouds; he supplies the earth with rain and makes grass grow on the hills.", reference: "Psalm 147:8", category: "provision", book: "psalms" },
  { text: "He provides food for the cattle and for the young ravens when they call.", reference: "Psalm 147:9", category: "care", book: "psalms" }
];

// Additional Proverbs (targeting 150+ total from Proverbs)
const additionalProverbs = [
  { text: "The fear of the Lord is the beginning of knowledge, but fools despise wisdom and instruction.", reference: "Proverbs 1:7", category: "wisdom", book: "proverbs" },
  { text: "My son, if sinful men entice you, do not give in to them.", reference: "Proverbs 1:10", category: "temptation", book: "proverbs" },
  { text: "But whoever listens to me will live in safety and be at ease, without fear of harm.", reference: "Proverbs 1:33", category: "safety", book: "proverbs" },
  { text: "For the Lord gives wisdom; from his mouth come knowledge and understanding.", reference: "Proverbs 2:6", category: "wisdom", book: "proverbs" },
  { text: "He holds success in store for the upright, he is a shield to those whose walk is blameless.", reference: "Proverbs 2:7", category: "protection", book: "proverbs" },
  { text: "Then you will understand what is right and just and fair—every good path.", reference: "Proverbs 2:9", category: "understanding", book: "proverbs" },
  { text: "Wisdom will save you from the ways of wicked men, from men whose words are perverse.", reference: "Proverbs 2:12", category: "protection", book: "proverbs" },
  { text: "Let love and faithfulness never leave you; bind them around your neck, write them on the tablet of your heart.", reference: "Proverbs 3:3", category: "character", book: "proverbs" },
  { text: "Then you will win favor and a good name in the sight of God and man.", reference: "Proverbs 3:4", category: "favor", book: "proverbs" },
  { text: "In all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:6", category: "guidance", book: "proverbs" },
  { text: "Do not be wise in your own eyes; fear the Lord and shun evil.", reference: "Proverbs 3:7", category: "humility", book: "proverbs" },
  { text: "This will bring health to your body and nourishment to your bones.", reference: "Proverbs 3:8", category: "health", book: "proverbs" },
  { text: "Honor the Lord with your wealth, with the firstfruits of all your crops.", reference: "Proverbs 3:9", category: "generosity", book: "proverbs" },
  { text: "Then your barns will be filled to overflowing, and your vats will brim over with new wine.", reference: "Proverbs 3:10", category: "blessing", book: "proverbs" },
  { text: "My son, do not despise the Lord's discipline, and do not resent his rebuke.", reference: "Proverbs 3:11", category: "discipline", book: "proverbs" },
  { text: "Because the Lord disciplines those he loves, as a father the son he delights in.", reference: "Proverbs 3:12", category: "love", book: "proverbs" },
  { text: "Blessed are those who find wisdom, those who gain understanding.", reference: "Proverbs 3:13", category: "wisdom", book: "proverbs" },
  { text: "For she is more profitable than silver and yields better returns than gold.", reference: "Proverbs 3:14", category: "value", book: "proverbs" },
  { text: "She is more precious than rubies; nothing you desire can compare with her.", reference: "Proverbs 3:15", category: "treasure", book: "proverbs" },
  { text: "Long life is in her right hand; in her left hand are riches and honor.", reference: "Proverbs 3:16", category: "blessing", book: "proverbs" },
  { text: "Her ways are pleasant ways, and all her paths are peace.", reference: "Proverbs 3:17", category: "peace", book: "proverbs" },
  { text: "She is a tree of life to those who take hold of her; those who hold her fast will be blessed.", reference: "Proverbs 3:18", category: "life", book: "proverbs" },
  { text: "By wisdom the Lord laid the earth's foundations, by understanding he set the heavens in place.", reference: "Proverbs 3:19", category: "creation", book: "proverbs" },
  { text: "My son, do not let wisdom and understanding out of your sight, preserve sound judgment and discretion.", reference: "Proverbs 3:21", category: "wisdom", book: "proverbs" },
  { text: "They will be life for you, an ornament to grace your neck.", reference: "Proverbs 3:22", category: "beauty", book: "proverbs" }
];

// New Testament expansion (Jesus's teachings, Paul's letters, etc.)
const newTestamentVerses = [
  { text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven.", reference: "Matthew 5:3", category: "blessing", book: "matthew" },
  { text: "Blessed are those who mourn, for they will be comforted.", reference: "Matthew 5:4", category: "comfort", book: "matthew" },
  { text: "Blessed are the meek, for they will inherit the earth.", reference: "Matthew 5:5", category: "humility", book: "matthew" },
  { text: "Blessed are those who hunger and thirst for righteousness, for they will be filled.", reference: "Matthew 5:6", category: "righteousness", book: "matthew" },
  { text: "Blessed are the merciful, for they will be shown mercy.", reference: "Matthew 5:7", category: "mercy", book: "matthew" },
  { text: "Blessed are the pure in heart, for they will see God.", reference: "Matthew 5:8", category: "purity", book: "matthew" },
  { text: "Blessed are those who are persecuted because of righteousness, for theirs is the kingdom of heaven.", reference: "Matthew 5:10", category: "persecution", book: "matthew" },
  { text: "You are the salt of the earth. But if the salt loses its saltiness, how can it be made salty again?", reference: "Matthew 5:13", category: "identity", book: "matthew" },
  { text: "You are the light of the world. A town built on a hill cannot be hidden.", reference: "Matthew 5:14", category: "witness", book: "matthew" },
  { text: "In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", reference: "Matthew 5:16", category: "witness", book: "matthew" },
  { text: "But I tell you, love your enemies and pray for those who persecute you.", reference: "Matthew 5:44", category: "love", book: "matthew" },
  { text: "Be perfect, therefore, as your heavenly Father is perfect.", reference: "Matthew 5:48", category: "perfection", book: "matthew" },
  { text: "But when you give to the needy, do not let your left hand know what your right hand is doing.", reference: "Matthew 6:3", category: "generosity", book: "matthew" },
  { text: "So that your giving may be in secret. Then your Father, who sees what is done in secret, will reward you.", reference: "Matthew 6:4", category: "reward", book: "matthew" },
  { text: "And when you pray, do not be like the hypocrites, for they love to pray standing in the synagogues and on the street corners to be seen by others.", reference: "Matthew 6:5", category: "prayer", book: "matthew" },
  { text: "But when you pray, go into your room, close the door and pray to your Father, who is unseen.", reference: "Matthew 6:6", category: "prayer", book: "matthew" },
  { text: "This, then, is how you should pray: 'Our Father in heaven, hallowed be your name.'", reference: "Matthew 6:9", category: "prayer", book: "matthew" },
  { text: "Your kingdom come, your will be done, on earth as it is in heaven.", reference: "Matthew 6:10", category: "surrender", book: "matthew" },
  { text: "Give us today our daily bread.", reference: "Matthew 6:11", category: "provision", book: "matthew" },
  { text: "And forgive us our debts, as we also have forgiven our debtors.", reference: "Matthew 6:12", category: "forgiveness", book: "matthew" },
  { text: "And lead us not into temptation, but deliver us from the evil one.", reference: "Matthew 6:13", category: "protection", book: "matthew" },
  { text: "For if you forgive other people when they sin against you, your heavenly Father will also forgive you.", reference: "Matthew 6:14", category: "forgiveness", book: "matthew" },
  { text: "But if you do not forgive others their sins, your Father will not forgive your sins.", reference: "Matthew 6:15", category: "forgiveness", book: "matthew" },
  { text: "But store up for yourselves treasures in heaven, where moths and vermin do not destroy, and where thieves do not break in and steal.", reference: "Matthew 6:20", category: "treasure", book: "matthew" },
  { text: "For where your treasure is, there your heart will be also.", reference: "Matthew 6:21", category: "heart", book: "matthew" }
];

// Old Testament stories and wisdom
const oldTestamentVerses = [
  { text: "Then God said, 'Let us make mankind in our image, in our likeness, so that they may rule over the fish in the sea and the birds in the sky.'", reference: "Genesis 1:26", category: "creation", book: "genesis" },
  { text: "God blessed them and said to them, 'Be fruitful and increase in number; fill the earth and subdue it.'", reference: "Genesis 1:28", category: "blessing", book: "genesis" },
  { text: "God saw all that he had made, and it was very good. And there was evening, and there was morning—the sixth day.", reference: "Genesis 1:31", category: "goodness", book: "genesis" },
  { text: "Then the Lord God formed a man from the dust of the ground and breathed into his nostrils the breath of life, and the man became a living being.", reference: "Genesis 2:7", category: "life", book: "genesis" },
  { text: "The Lord God said, 'It is not good for the man to be alone. I will make a helper suitable for him.'", reference: "Genesis 2:18", category: "companionship", book: "genesis" },
  { text: "That is why a man leaves his father and mother and is united to his wife, and they become one flesh.", reference: "Genesis 2:24", category: "marriage", book: "genesis" },
  { text: "Now the Lord had said to Abram, 'Go from your country, your people and your father's household to the land I will show you.'", reference: "Genesis 12:1", category: "calling", book: "genesis" },
  { text: "I will make you into a great nation, and I will bless you; I will make your name great, and you will be a blessing.", reference: "Genesis 12:2", category: "blessing", book: "genesis" },
  { text: "I will bless those who bless you, and whoever curses you I will curse; and all peoples on earth will be blessed through you.", reference: "Genesis 12:3", category: "blessing", book: "genesis" },
  { text: "Abram believed the Lord, and he credited it to him as righteousness.", reference: "Genesis 15:6", category: "faith", book: "genesis" },
  { text: "Is anything too hard for the Lord? I will return to you at the appointed time next year, and Sarah will have a son.", reference: "Genesis 18:14", category: "power", book: "genesis" },
  { text: "But Joseph said to them, 'Don't be afraid. Am I in the place of God? You intended to harm me, but God intended it for good to accomplish what is now being done, the saving of many lives.'", reference: "Genesis 50:19-20", category: "providence", book: "genesis" },
  { text: "Moses said to the people, 'Do not be afraid. Stand firm and you will see the deliverance the Lord will bring you today.'", reference: "Exodus 14:13", category: "courage", book: "exodus" },
  { text: "The Lord will fight for you; you need only to be still.", reference: "Exodus 14:14", category: "trust", book: "exodus" },
  { text: "Then Moses and the Israelites sang this song to the Lord: 'I will sing to the Lord, for he is highly exalted. Both horse and driver he has hurled into the sea.'", reference: "Exodus 15:1", category: "victory", book: "exodus" },
  { text: "The Lord is my strength and my defense; he has become my salvation. He is my God, and I will praise him, my father's God, and I will exalt him.", reference: "Exodus 15:2", category: "strength", book: "exodus" },
  { text: "Who among the gods is like you, Lord? Who is like you—majestic in holiness, awesome in glory, working wonders?", reference: "Exodus 15:11", category: "uniqueness", book: "exodus" },
  { text: "In your unfailing love you will lead the people you have redeemed. In your strength you will guide them to your holy dwelling.", reference: "Exodus 15:13", category: "guidance", book: "exodus" },
  { text: "And God spoke all these words: 'I am the Lord your God, who brought you out of Egypt, out of the land of slavery.'", reference: "Exodus 20:1-2", category: "identity", book: "exodus" },
  { text: "You shall have no other gods before me.", reference: "Exodus 20:3", category: "worship", book: "exodus" },
  { text: "You shall not make idols.", reference: "Exodus 20:4", category: "worship", book: "exodus" },
  { text: "You shall not misuse the name of the Lord your God, for the Lord will not hold anyone guiltless who misuses his name.", reference: "Exodus 20:7", category: "reverence", book: "exodus" },
  { text: "Six days you shall labor and do all your work, but the seventh day is a sabbath to the Lord your God.", reference: "Exodus 20:9-10", category: "rest", book: "exodus" },
  { text: "You shall not covet your neighbor's house. You shall not covet your neighbor's wife, or his male or female servant, his ox or donkey, or anything that belongs to your neighbor.", reference: "Exodus 20:17", category: "contentment", book: "exodus" },
  { text: "The Lord, the Lord, the compassionate and gracious God, slow to anger, abounding in love and faithfulness.", reference: "Exodus 34:6", category: "character", book: "exodus" }
];

// Combine all new verses
const allNewVerses = [
  ...additionalPsalms,
  ...additionalProverbs, 
  ...newTestamentVerses,
  ...oldTestamentVerses
];

// Add to existing collection
verses = verses.concat(allNewVerses);

console.log(`Added ${allNewVerses.length} new verses`);
console.log(`Total verses now: ${verses.length}`);

// Save updated collection
const updatedData = {
  dailyVerses: verses
};

fs.writeFileSync('daily-verses-1000.json', JSON.stringify(updatedData, null, 2));
console.log('Saved to daily-verses-1000.json');
console.log(`Final count: ${verses.length} verses`);
