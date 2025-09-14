// Continue building to 1,000+ verses - adding remaining Bible books
const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-1000.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// Jeremiah - major prophet
const jeremiahVerses = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.", reference: "Jeremiah 29:11", category: "hope", book: "jeremiah" },
  { text: "Then you will call on me and come and pray to me, and I will listen to you.", reference: "Jeremiah 29:12", category: "prayer", book: "jeremiah" },
  { text: "You will seek me and find me when you seek me with all your heart.", reference: "Jeremiah 29:13", category: "seeking", book: "jeremiah" },
  { text: "I will be found by you, declares the Lord, and will bring you back from captivity.", reference: "Jeremiah 29:14", category: "restoration", book: "jeremiah" },
  { text: "Before I formed you in the womb I knew you, before you were born I set you apart; I appointed you as a prophet to the nations.", reference: "Jeremiah 1:5", category: "calling", book: "jeremiah" },
  { text: "Do not say, 'I am too young.' You must go to everyone I send you to and say whatever I command you.", reference: "Jeremiah 1:7", category: "obedience", book: "jeremiah" },
  { text: "Do not be afraid of them, for I am with you and will rescue you, declares the Lord.", reference: "Jeremiah 1:8", category: "courage", book: "jeremiah" },
  { text: "Then the Lord reached out his hand and touched my mouth and said to me, 'I have put my words in your mouth.'", reference: "Jeremiah 1:9", category: "anointing", book: "jeremiah" },
  { text: "The heart is deceitful above all things and beyond cure. Who can understand it?", reference: "Jeremiah 17:9", category: "heart", book: "jeremiah" },
  { text: "I the Lord search the heart and examine the mind, to reward each person according to their conduct, according to what their deeds deserve.", reference: "Jeremiah 17:10", category: "judgment", book: "jeremiah" },
  { text: "Blessed is the one who trusts in the Lord, whose confidence is in him.", reference: "Jeremiah 17:7", category: "trust", book: "jeremiah" },
  { text: "They will be like a tree planted by the water that sends out its roots by the stream.", reference: "Jeremiah 17:8", category: "growth", book: "jeremiah" },
  { text: "It does not fear when heat comes; its leaves are always green. It has no worries in a year of drought and never fails to bear fruit.", reference: "Jeremiah 17:8", category: "resilience", book: "jeremiah" },
  { text: "Call to me and I will answer you and tell you great and unsearchable things you do not know.", reference: "Jeremiah 33:3", category: "revelation", book: "jeremiah" },
  { text: "This is what the Lord says, he who made the earth, the Lord who formed it and established it—the Lord is his name.", reference: "Jeremiah 33:2", category: "creation", book: "jeremiah" }
];

// Ezekiel - visions and restoration
const ezekielVerses = [
  { text: "I will give you a new heart and put a new spirit in you; I will remove from you your heart of stone and give you a heart of flesh.", reference: "Ezekiel 36:26", category: "transformation", book: "ezekiel" },
  { text: "And I will put my Spirit in you and move you to follow my decrees and be careful to keep my laws.", reference: "Ezekiel 36:27", category: "spirit", book: "ezekiel" },
  { text: "Then you will live in the land I gave your ancestors; you will be my people, and I will be your God.", reference: "Ezekiel 36:28", category: "covenant", book: "ezekiel" },
  { text: "The hand of the Lord was on me, and he brought me out by the Spirit of the Lord and set me in the middle of a valley; it was full of bones.", reference: "Ezekiel 37:1", category: "vision", book: "ezekiel" },
  { text: "He asked me, 'Son of man, can these bones live?' I said, 'Sovereign Lord, you alone know.'", reference: "Ezekiel 37:3", category: "faith", book: "ezekiel" },
  { text: "Then he said to me, 'Prophesy to these bones and say to them, 'Dry bones, hear the word of the Lord!'", reference: "Ezekiel 37:4", category: "prophecy", book: "ezekiel" },
  { text: "This is what the Sovereign Lord says to these bones: I will make breath enter you, and you will come to life.", reference: "Ezekiel 37:5", category: "resurrection", book: "ezekiel" },
  { text: "I will attach tendons to you and make flesh come upon you and cover you with skin; I will put breath in you, and you will come to life. Then you will know that I am the Lord.", reference: "Ezekiel 37:6", category: "restoration", book: "ezekiel" },
  { text: "So I prophesied as I was commanded. And as I was prophesying, there was a noise, a rattling sound, and the bones came together, bone to bone.", reference: "Ezekiel 37:7", category: "obedience", book: "ezekiel" },
  { text: "I looked, and tendons and flesh appeared on them and skin covered them, but there was no breath in them.", reference: "Ezekiel 37:8", category: "process", book: "ezekiel" },
  { text: "Then he said to me, 'Prophesy to the breath; prophesy, son of man, and say to it, 'This is what the Sovereign Lord says: Come, breath, from the four winds and breathe into these slain, that they may live.'", reference: "Ezekiel 37:9", category: "life", book: "ezekiel" },
  { text: "So I prophesied as he commanded me, and breath entered them; they came to life and stood up on their feet—a vast army.", reference: "Ezekiel 37:10", category: "revival", book: "ezekiel" },
  { text: "Then he said to me: 'Son of man, these bones are the people of Israel. They say, 'Our bones are dried up and our hope is gone; we are cut off.'", reference: "Ezekiel 37:11", category: "despair", book: "ezekiel" },
  { text: "Therefore prophesy and say to them: 'This is what the Sovereign Lord says: My people, I am going to open your graves and bring you up from them; I will bring you back to the land of Israel.'", reference: "Ezekiel 37:12", category: "hope", book: "ezekiel" },
  { text: "Then you, my people, will know that I am the Lord, when I open your graves and bring you up from them.", reference: "Ezekiel 37:13", category: "knowledge", book: "ezekiel" }
];

// More John - love and light
const moreJohn = [
  { text: "In the beginning was the Word, and the Word was with God, and the Word was God.", reference: "John 1:1", category: "word", book: "john" },
  { text: "He was with God in the beginning.", reference: "John 1:2", category: "eternity", book: "john" },
  { text: "Through him all things were made; without him nothing was made that has been made.", reference: "John 1:3", category: "creation", book: "john" },
  { text: "In him was life, and that life was the light of all mankind.", reference: "John 1:4", category: "life", book: "john" },
  { text: "The light shines in the darkness, and the darkness has not overcome it.", reference: "John 1:5", category: "light", book: "john" },
  { text: "There was a man sent from God whose name was John.", reference: "John 1:6", category: "mission", book: "john" },
  { text: "He came as a witness to testify concerning that light, so that through him all might believe.", reference: "John 1:7", category: "witness", book: "john" },
  { text: "He himself was not the light; he came only as a witness to the light.", reference: "John 1:8", category: "testimony", book: "john" },
  { text: "The true light that gives light to everyone was coming into the world.", reference: "John 1:9", category: "truth", book: "john" },
  { text: "He was in the world, and though the world was made through him, the world did not recognize him.", reference: "John 1:10", category: "recognition", book: "john" },
  { text: "He came to that which was his own, but his own did not receive him.", reference: "John 1:11", category: "rejection", book: "john" },
  { text: "Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God.", reference: "John 1:12", category: "adoption", book: "john" },
  { text: "Children born not of natural descent, nor of human decision or a husband's will, but born of God.", reference: "John 1:13", category: "birth", book: "john" },
  { text: "The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth.", reference: "John 1:14", category: "incarnation", book: "john" },
  { text: "Out of his fullness we have all received grace in place of grace already given.", reference: "John 1:16", category: "grace", book: "john" },
  { text: "For the law was given through Moses; grace and truth came through Jesus Christ.", reference: "John 1:17", category: "grace", book: "john" },
  { text: "No one has ever seen God, but the one and only Son, who is himself God and is in closest relationship with the Father, has made him known.", reference: "John 1:18", category: "revelation", book: "john" },
  { text: "The next day John saw Jesus coming toward him and said, 'Look, the Lamb of God, who takes away the sin of the world!'", reference: "John 1:29", category: "lamb", book: "john" },
  { text: "This is the one I meant when I said, 'A man who comes after me has surpassed me because he was before me.'", reference: "John 1:30", category: "priority", book: "john" },
  { text: "I myself did not know him, but the reason I came baptizing with water was that he might be revealed to Israel.", reference: "John 1:31", category: "revelation", book: "john" }
];

// More Psalms - different themes
const finalPsalms = [
  { text: "Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers.", reference: "Psalm 1:1", category: "blessing", book: "psalms" },
  { text: "But whose delight is in the law of the Lord, and who meditates on his law day and night.", reference: "Psalm 1:2", category: "meditation", book: "psalms" },
  { text: "That person is like a tree planted by streams of water, which yields its fruit in season and whose leaf does not wither—whatever they do prospers.", reference: "Psalm 1:3", category: "prosperity", book: "psalms" },
  { text: "Not so the wicked! They are like chaff that the wind blows away.", reference: "Psalm 1:4", category: "judgment", book: "psalms" },
  { text: "Therefore the wicked will not stand in the judgment, nor sinners in the assembly of the righteous.", reference: "Psalm 1:5", category: "righteousness", book: "psalms" },
  { text: "For the Lord watches over the way of the righteous, but the way of the wicked leads to destruction.", reference: "Psalm 1:6", category: "protection", book: "psalms" },
  { text: "Why do the nations conspire and the peoples plot in vain?", reference: "Psalm 2:1", category: "conspiracy", book: "psalms" },
  { text: "The kings of the earth rise up and the rulers band together against the Lord and against his anointed, saying.", reference: "Psalm 2:2", category: "rebellion", book: "psalms" },
  { text: "Let us break their chains and throw off their shackles.", reference: "Psalm 2:3", category: "freedom", book: "psalms" },
  { text: "The One enthroned in heaven laughs; the Lord scoffs at them.", reference: "Psalm 2:4", category: "sovereignty", book: "psalms" },
  { text: "He rebukes them in his anger and terrifies them in his wrath, saying.", reference: "Psalm 2:5", category: "wrath", book: "psalms" },
  { text: "I have installed my king on Zion, my holy mountain.", reference: "Psalm 2:6", category: "kingship", book: "psalms" },
  { text: "I will proclaim the Lord's decree: He said to me, 'You are my son; today I have become your father.'", reference: "Psalm 2:7", category: "sonship", book: "psalms" },
  { text: "Ask me, and I will make the nations your inheritance, the ends of the earth your possession.", reference: "Psalm 2:8", category: "inheritance", book: "psalms" },
  { text: "You will break them with a rod of iron; you will dash them to pieces like pottery.", reference: "Psalm 2:9", category: "authority", book: "psalms" },
  { text: "Therefore, you kings, be wise; be warned, you rulers of the earth.", reference: "Psalm 2:10", category: "wisdom", book: "psalms" },
  { text: "Serve the Lord with fear and celebrate his rule with trembling.", reference: "Psalm 2:11", category: "reverence", book: "psalms" },
  { text: "Kiss his son, or he will be angry and your way will lead to your destruction, for his wrath can flare up in a moment. Blessed are all who take refuge in him.", reference: "Psalm 2:12", category: "refuge", book: "psalms" },
  { text: "Lord, how many are my foes! How many rise up against me!", reference: "Psalm 3:1", category: "enemies", book: "psalms" },
  { text: "Many are saying of me, 'God will not deliver him.'", reference: "Psalm 3:2", category: "doubt", book: "psalms" }
];

// More Proverbs - final wisdom collection
const finalProverbs = [
  { text: "The beginning of wisdom is this: Get wisdom, and whatever you get, get insight.", reference: "Proverbs 4:7", category: "wisdom", book: "proverbs" },
  { text: "Prize her highly, and she will exalt you; she will honor you if you embrace her.", reference: "Proverbs 4:8", category: "honor", book: "proverbs" },
  { text: "She will place on your head a graceful garland; she will bestow on you a beautiful crown.", reference: "Proverbs 4:9", category: "beauty", book: "proverbs" },
  { text: "Hear, my son, and accept my words, that the years of your life may be many.", reference: "Proverbs 4:10", category: "longevity", book: "proverbs" },
  { text: "I have taught you the way of wisdom; I have led you in the paths of uprightness.", reference: "Proverbs 4:11", category: "teaching", book: "proverbs" },
  { text: "When you walk, your step will not be hampered, and if you run, you will not stumble.", reference: "Proverbs 4:12", category: "stability", book: "proverbs" },
  { text: "Keep hold of instruction; do not let go; guard her, for she is your life.", reference: "Proverbs 4:13", category: "instruction", book: "proverbs" },
  { text: "Do not enter the path of the wicked, and do not walk in the way of the evil.", reference: "Proverbs 4:14", category: "avoidance", book: "proverbs" },
  { text: "Avoid it; do not go on it; turn away from it and pass on.", reference: "Proverbs 4:15", category: "turning", book: "proverbs" },
  { text: "For they cannot sleep unless they have done wrong; they are robbed of sleep unless they have made someone stumble.", reference: "Proverbs 4:16", category: "wickedness", book: "proverbs" },
  { text: "For they eat the bread of wickedness and drink the wine of violence.", reference: "Proverbs 4:17", category: "violence", book: "proverbs" },
  { text: "But the path of the righteous is like the light of dawn, which shines brighter and brighter until full day.", reference: "Proverbs 4:18", category: "righteousness", book: "proverbs" },
  { text: "The way of the wicked is like deep darkness; they do not know over what they stumble.", reference: "Proverbs 4:19", category: "darkness", book: "proverbs" },
  { text: "My son, be attentive to my words; incline your ear to my sayings.", reference: "Proverbs 4:20", category: "attention", book: "proverbs" },
  { text: "Let them not escape from your sight; keep them within your heart.", reference: "Proverbs 4:21", category: "retention", book: "proverbs" },
  { text: "For they are life to those who find them, and healing to all their flesh.", reference: "Proverbs 4:22", category: "healing", book: "proverbs" },
  { text: "Keep your heart with all vigilance, for from it flow the springs of life.", reference: "Proverbs 4:23", category: "vigilance", book: "proverbs" },
  { text: "Put away from you crooked speech, and put devious talk far from you.", reference: "Proverbs 4:24", category: "speech", book: "proverbs" },
  { text: "Let your eyes look directly forward, and your gaze be straight before you.", reference: "Proverbs 4:25", category: "focus", book: "proverbs" },
  { text: "Ponder the path of your feet; then all your ways will be sure.", reference: "Proverbs 4:26", category: "consideration", book: "proverbs" }
];

// Song of Songs - love and beauty
const songOfSongs = [
  { text: "Let him kiss me with the kisses of his mouth—for your love is more delightful than wine.", reference: "Song of Songs 1:2", category: "love", book: "songofsolomon" },
  { text: "Pleasing is the fragrance of your perfumes; your name is like perfume poured out. No wonder the young women love you!", reference: "Song of Songs 1:3", category: "attraction", book: "songofsolomon" },
  { text: "Take me away with you—let us hurry! Let the king bring me into his chambers.", reference: "Song of Songs 1:4", category: "desire", book: "songofsolomon" },
  { text: "Dark am I, yet lovely, daughters of Jerusalem, dark like the tents of Kedar, like the tent curtains of Solomon.", reference: "Song of Songs 1:5", category: "beauty", book: "songofsolomon" },
  { text: "Do not stare at me because I am dark, because I am darkened by the sun.", reference: "Song of Songs 1:6", category: "acceptance", book: "songofsolomon" },
  { text: "Tell me, you whom I love, where you graze your flock and where you rest your sheep at midday.", reference: "Song of Songs 1:7", category: "seeking", book: "songofsolomon" },
  { text: "If you do not know, most beautiful of women, follow the tracks of the sheep and graze your young goats by the tents of the shepherds.", reference: "Song of Songs 1:8", category: "guidance", book: "songofsolomon" },
  { text: "I liken you, my darling, to a mare among Pharaoh's chariot horses.", reference: "Song of Songs 1:9", category: "comparison", book: "songofsolomon" },
  { text: "Your cheeks are beautiful with earrings, your neck with strings of jewels.", reference: "Song of Songs 1:10", category: "adornment", book: "songofsolomon" },
  { text: "We will make you earrings of gold, studded with silver.", reference: "Song of Songs 1:11", category: "gifts", book: "songofsolomon" },
  { text: "While the king was at his table, my perfume spread its fragrance.", reference: "Song of Songs 1:12", category: "presence", book: "songofsolomon" },
  { text: "My beloved is to me a sachet of myrrh resting between my breasts.", reference: "Song of Songs 1:13", category: "intimacy", book: "songofsolomon" },
  { text: "My beloved is to me a cluster of henna blossoms from the vineyards of En Gedi.", reference: "Song of Songs 1:14", category: "sweetness", book: "songofsolomon" },
  { text: "How beautiful you are, my darling! Oh, how beautiful! Your eyes are doves.", reference: "Song of Songs 1:15", category: "beauty", book: "songofsolomon" },
  { text: "How handsome you are, my beloved! Oh, how charming! And our bed is verdant.", reference: "Song of Songs 1:16", category: "charm", book: "songofsolomon" }
];

// Combine all new verses
const allNewVerses = [
  ...jeremiahVerses,
  ...ezekielVerses,
  ...moreJohn,
  ...finalPsalms,
  ...finalProverbs,
  ...songOfSongs
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
console.log('Updated daily-verses-1000.json');
console.log(`Final count: ${verses.length} verses`);

// Check if we've reached 1000+
if (verses.length >= 1000) {
  console.log('🎉 SUCCESS! We have reached 1,000+ verses!');
  const years = Math.floor(verses.length / 365);
  const days = verses.length % 365;
  console.log(`Cycle length: ${years} years and ${days} days`);
} else {
  console.log(`Still need ${1000 - verses.length} more verses to reach 1,000`);
  const currentYears = Math.floor(verses.length / 365);
  const currentDays = verses.length % 365;
  console.log(`Current cycle length: ${currentYears} years and ${currentDays} days`);
}
