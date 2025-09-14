// Massive expansion - adding verses from all remaining Bible books
const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-1000.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// Historical Books - Chronicles, Kings, Judges, etc.
const historicalBooks = [
  { text: "If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land.", reference: "2 Chronicles 7:14", category: "healing", book: "2chronicles" },
  { text: "The eyes of the Lord range throughout the earth to strengthen those whose hearts are fully committed to him.", reference: "2 Chronicles 16:9", category: "commitment", book: "2chronicles" },
  { text: "Do not be afraid or discouraged because of this vast army. For the battle is not yours, but God's.", reference: "2 Chronicles 20:15", category: "battle", book: "2chronicles" },
  { text: "You will not have to fight this battle. Take up your positions; stand firm and see the deliverance the Lord will give you, Judah and Jerusalem. Do not be afraid; do not be discouraged. Go out to face them tomorrow, and the Lord will be with you.", reference: "2 Chronicles 20:17", category: "deliverance", book: "2chronicles" },
  { text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9", category: "courage", book: "joshua" },
  { text: "But as for me and my household, we will serve the Lord.", reference: "Joshua 24:15", category: "service", book: "joshua" },
  { text: "The Lord your God himself will cross over ahead of you. He will destroy these nations before you, and you will take possession of their land.", reference: "Deuteronomy 31:3", category: "victory", book: "deuteronomy" },
  { text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.", reference: "Deuteronomy 31:6", category: "presence", book: "deuteronomy" },
  { text: "The eternal God is your refuge, and underneath are the everlasting arms. He will drive out your enemies before you, saying, 'Destroy them!'", reference: "Deuteronomy 33:27", category: "refuge", book: "deuteronomy" },
  { text: "In those days Israel had no king; everyone did as they saw fit.", reference: "Judges 21:25", category: "leadership", book: "judges" },
  { text: "But Ruth replied, 'Don't urge me to leave you or to turn back from you. Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God.'", reference: "Ruth 1:16", category: "loyalty", book: "ruth" },
  { text: "Where you die I will die, and there I will be buried. May the Lord deal with me, be it ever so severely, if even death separates you and me.", reference: "Ruth 1:17", category: "devotion", book: "ruth" },
  { text: "The Lord repay you for what you have done. May you be richly rewarded by the Lord, the God of Israel, under whose wings you have come to take refuge.", reference: "Ruth 2:12", category: "reward", book: "ruth" },
  { text: "Hannah prayed and said: 'My heart rejoices in the Lord; in the Lord my horn is lifted high. My mouth boasts over my enemies, for I delight in your deliverance.'", reference: "1 Samuel 2:1", category: "rejoicing", book: "1samuel" },
  { text: "There is no one holy like the Lord; there is no one besides you; there is no Rock like our God.", reference: "1 Samuel 2:2", category: "holiness", book: "1samuel" },
  { text: "The Lord sends poverty and wealth; he humbles and he exalts.", reference: "1 Samuel 2:7", category: "sovereignty", book: "1samuel" },
  { text: "He raises the poor from the dust and lifts the needy from the ash heap; he seats them with princes and has them inherit a throne of honor.", reference: "1 Samuel 2:8", category: "elevation", book: "1samuel" },
  { text: "For the foundations of the earth are the Lord's; on them he has set the world.", reference: "1 Samuel 2:8", category: "foundation", book: "1samuel" },
  { text: "He will guard the feet of his faithful servants, but the wicked will be silenced in the place of darkness.", reference: "1 Samuel 2:9", category: "protection", book: "1samuel" },
  { text: "It is not by strength that one prevails; those who oppose the Lord will be broken.", reference: "1 Samuel 2:9-10", category: "strength", book: "1samuel" }
];

// More Psalms - different themes
const evenMorePsalms = [
  { text: "O Lord, our Lord, how majestic is your name in all the earth! You have set your glory in the heavens.", reference: "Psalm 8:1", category: "majesty", book: "psalms" },
  { text: "Through the praise of children and infants you have established a stronghold against your enemies, to silence the foe and the avenger.", reference: "Psalm 8:2", category: "praise", book: "psalms" },
  { text: "When I consider your heavens, the work of your fingers, the moon and the stars, which you have set in place.", reference: "Psalm 8:3", category: "creation", book: "psalms" },
  { text: "What is mankind that you are mindful of them, human beings that you care for them?", reference: "Psalm 8:4", category: "humanity", book: "psalms" },
  { text: "You have made them a little lower than the angels and crowned them with glory and honor.", reference: "Psalm 8:5", category: "dignity", book: "psalms" },
  { text: "You made them rulers over the works of your hands; you put everything under their feet.", reference: "Psalm 8:6", category: "dominion", book: "psalms" },
  { text: "All flocks and herds, and the animals of the wild, the birds in the sky, and the fish in the sea, all that swim the paths of the seas.", reference: "Psalm 8:7-8", category: "creation", book: "psalms" },
  { text: "Lord, our Lord, how majestic is your name in all the earth!", reference: "Psalm 8:9", category: "majesty", book: "psalms" },
  { text: "I will give thanks to you, Lord, with all my heart; I will tell of all your wonderful deeds.", reference: "Psalm 9:1", category: "thanksgiving", book: "psalms" },
  { text: "I will be glad and rejoice in you; I will sing the praises of your name, O Most High.", reference: "Psalm 9:2", category: "rejoicing", book: "psalms" },
  { text: "My enemies turn back; they stumble and perish before you.", reference: "Psalm 9:3", category: "victory", book: "psalms" },
  { text: "For you have upheld my right and my cause, sitting enthroned as the righteous judge.", reference: "Psalm 9:4", category: "justice", book: "psalms" },
  { text: "You have rebuked the nations and destroyed the wicked; you have blotted out their name for ever and ever.", reference: "Psalm 9:5", category: "judgment", book: "psalms" },
  { text: "Endless ruin has overtaken my enemies, you have uprooted their cities; even the memory of them has perished.", reference: "Psalm 9:6", category: "destruction", book: "psalms" },
  { text: "The Lord reigns forever; he has established his throne for judgment.", reference: "Psalm 9:7", category: "reign", book: "psalms" },
  { text: "He rules the world in righteousness and judges the peoples with equity.", reference: "Psalm 9:8", category: "righteousness", book: "psalms" },
  { text: "The Lord is a refuge for the oppressed, a stronghold in times of trouble.", reference: "Psalm 9:9", category: "refuge", book: "psalms" },
  { text: "Those who know your name trust in you, for you, Lord, have never forsaken those who seek you.", reference: "Psalm 9:10", category: "trust", book: "psalms" },
  { text: "Sing the praises of the Lord, enthroned in Zion; proclaim among the nations what he has done.", reference: "Psalm 9:11", category: "proclamation", book: "psalms" },
  { text: "For he who avenges blood remembers; he does not ignore the cries of the afflicted.", reference: "Psalm 9:12", category: "justice", book: "psalms" }
];

// More New Testament - Thessalonians, Timothy, Titus, Philemon
const moreNTBooks = [
  { text: "We always thank God for all of you and continually mention you in our prayers.", reference: "1 Thessalonians 1:2", category: "prayer", book: "1thessalonians" },
  { text: "We remember before our God and Father your work produced by faith, your labor prompted by love, and your endurance inspired by hope in our Lord Jesus Christ.", reference: "1 Thessalonians 1:3", category: "faith", book: "1thessalonians" },
  { text: "For we know, brothers and sisters loved by God, that he has chosen you.", reference: "1 Thessalonians 1:4", category: "chosen", book: "1thessalonians" },
  { text: "Because our gospel came to you not simply with words but also with power, with the Holy Spirit and deep conviction.", reference: "1 Thessalonians 1:5", category: "power", book: "1thessalonians" },
  { text: "You know how we lived among you for your sake.", reference: "1 Thessalonians 1:5", category: "example", book: "1thessalonians" },
  { text: "You became imitators of us and of the Lord, for you welcomed the message in the midst of severe suffering with the joy given by the Holy Spirit.", reference: "1 Thessalonians 1:6", category: "imitation", book: "1thessalonians" },
  { text: "And so you became a model to all the believers in Macedonia and Achaia.", reference: "1 Thessalonians 1:7", category: "model", book: "1thessalonians" },
  { text: "The Lord's message rang out from you not only in Macedonia and Achaia—your faith in God has become known everywhere.", reference: "1 Thessalonians 1:8", category: "testimony", book: "1thessalonians" },
  { text: "Therefore we do not need to say anything about it, for they themselves report what kind of reception you gave us.", reference: "1 Thessalonians 1:8-9", category: "reception", book: "1thessalonians" },
  { text: "They tell how you turned to God from idols to serve the living and true God.", reference: "1 Thessalonians 1:9", category: "conversion", book: "1thessalonians" },
  { text: "And to wait for his Son from heaven, whom he raised from the dead—Jesus, who rescues us from the coming wrath.", reference: "1 Thessalonians 1:10", category: "rescue", book: "1thessalonians" },
  { text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.", reference: "1 Thessalonians 5:16-18", category: "rejoicing", book: "1thessalonians" },
  { text: "Do not quench the Spirit.", reference: "1 Thessalonians 5:19", category: "spirit", book: "1thessalonians" },
  { text: "Do not treat prophecies with contempt but test them all; hold on to what is good, reject whatever is harmful.", reference: "1 Thessalonians 5:20-22", category: "discernment", book: "1thessalonians" },
  { text: "May God himself, the God of peace, sanctify you through and through. May your whole spirit, soul and body be kept blameless at the coming of our Lord Jesus Christ.", reference: "1 Thessalonians 5:23", category: "sanctification", book: "1thessalonians" },
  { text: "The one who calls you is faithful, and he will do it.", reference: "1 Thessalonians 5:24", category: "faithfulness", book: "1thessalonians" },
  { text: "I thank Christ Jesus our Lord, who has given me strength, that he considered me trustworthy, appointing me to his service.", reference: "1 Timothy 1:12", category: "service", book: "1timothy" },
  { text: "Even though I was once a blasphemer and a persecutor and a violent man, I was shown mercy because I acted in ignorance and unbelief.", reference: "1 Timothy 1:13", category: "mercy", book: "1timothy" },
  { text: "The grace of our Lord was poured out on me abundantly, along with the faith and love that are in Christ Jesus.", reference: "1 Timothy 1:14", category: "grace", book: "1timothy" },
  { text: "Here is a trustworthy saying that deserves full acceptance: Christ Jesus came into the world to save sinners—of whom I am the worst.", reference: "1 Timothy 1:15", category: "salvation", book: "1timothy" }
];

// More Proverbs - practical wisdom
const evenMoreProverbs = [
  { text: "The way of fools seems right to them, but the wise listen to advice.", reference: "Proverbs 12:15", category: "wisdom", book: "proverbs" },
  { text: "Fools show their annoyance at once, but the prudent overlook an insult.", reference: "Proverbs 12:16", category: "prudence", book: "proverbs" },
  { text: "An honest witness tells the truth, but a false witness tells lies.", reference: "Proverbs 12:17", category: "honesty", book: "proverbs" },
  { text: "The words of the reckless pierce like swords, but the tongue of the wise brings healing.", reference: "Proverbs 12:18", category: "words", book: "proverbs" },
  { text: "Truthful lips endure forever, but a lying tongue lasts only a moment.", reference: "Proverbs 12:19", category: "truth", book: "proverbs" },
  { text: "Deceit is in the hearts of those who plot evil, but those who promote peace have joy.", reference: "Proverbs 12:20", category: "peace", book: "proverbs" },
  { text: "No harm overtakes the righteous, but the wicked have their fill of trouble.", reference: "Proverbs 12:21", category: "righteousness", book: "proverbs" },
  { text: "The Lord detests lying lips, but he delights in people who are trustworthy.", reference: "Proverbs 12:22", category: "trustworthiness", book: "proverbs" },
  { text: "The prudent keep their knowledge to themselves, but a fool's heart blurts out folly.", reference: "Proverbs 12:23", category: "prudence", book: "proverbs" },
  { text: "Diligent hands will rule, but laziness ends in forced labor.", reference: "Proverbs 12:24", category: "diligence", book: "proverbs" },
  { text: "Anxiety weighs down the heart, but a kind word cheers it up.", reference: "Proverbs 12:25", category: "kindness", book: "proverbs" },
  { text: "The righteous choose their friends carefully, but the way of the wicked leads them astray.", reference: "Proverbs 12:26", category: "friendship", book: "proverbs" },
  { text: "The lazy do not roast any game, but the diligent feed on the riches of the hunt.", reference: "Proverbs 12:27", category: "diligence", book: "proverbs" },
  { text: "In the way of righteousness there is life; along that path is immortality.", reference: "Proverbs 12:28", category: "life", book: "proverbs" },
  { text: "A wise son heeds his father's instruction, but a mocker does not respond to rebukes.", reference: "Proverbs 13:1", category: "instruction", book: "proverbs" },
  { text: "From the fruit of their lips people enjoy good things, but the unfaithful have an appetite for violence.", reference: "Proverbs 13:2", category: "speech", book: "proverbs" },
  { text: "Those who guard their lips preserve their lives, but those who speak rashly will come to ruin.", reference: "Proverbs 13:3", category: "speech", book: "proverbs" },
  { text: "A sluggard's appetite is never filled, but the desires of the diligent are fully satisfied.", reference: "Proverbs 13:4", category: "satisfaction", book: "proverbs" },
  { text: "The righteous hate what is false, but the wicked make themselves a stench and bring shame on themselves.", reference: "Proverbs 13:5", category: "righteousness", book: "proverbs" },
  { text: "Righteousness guards the person of integrity, but wickedness overthrows the sinner.", reference: "Proverbs 13:6", category: "integrity", book: "proverbs" }
];

// Isaiah - more prophetic verses
const moreIsaiah = [
  { text: "Woe to me!' I cried. 'I am ruined! For I am a man of unclean lips, and I live among a people of unclean lips, and my eyes have seen the King, the Lord Almighty.'", reference: "Isaiah 6:5", category: "humility", book: "isaiah" },
  { text: "Then one of the seraphim flew to me with a live coal in his hand, which he had taken with tongs from the altar.", reference: "Isaiah 6:6", category: "purification", book: "isaiah" },
  { text: "With it he touched my mouth and said, 'See, this has touched your lips; your guilt is taken away and your sin atoned for.'", reference: "Isaiah 6:7", category: "atonement", book: "isaiah" },
  { text: "Then I heard the voice of the Lord saying, 'Whom shall I send? And who will go for us?' And I said, 'Here am I. Send me!'", reference: "Isaiah 6:8", category: "calling", book: "isaiah" },
  { text: "The people walking in darkness have seen a great light; on those living in the land of deep darkness a light has dawned.", reference: "Isaiah 9:2", category: "light", book: "isaiah" },
  { text: "You have enlarged the nation and increased their joy; they rejoice before you as people rejoice at the harvest, as warriors rejoice when dividing the plunder.", reference: "Isaiah 9:3", category: "joy", book: "isaiah" },
  { text: "For as in the day of Midian's defeat, you have shattered the yoke that burdens them, the bar across their shoulders, the rod of their oppressor.", reference: "Isaiah 9:4", category: "freedom", book: "isaiah" },
  { text: "Every warrior's boot used in battle and every garment rolled in blood will be destined for burning, will be fuel for the fire.", reference: "Isaiah 9:5", category: "peace", book: "isaiah" },
  { text: "He will reign on David's throne and over his kingdom, establishing and upholding it with justice and righteousness from that time on and forever.", reference: "Isaiah 9:7", category: "reign", book: "isaiah" },
  { text: "The zeal of the Lord Almighty will accomplish this.", reference: "Isaiah 9:7", category: "zeal", book: "isaiah" },
  { text: "In that day you will say: 'I will praise you, Lord. Although you were angry with me, your anger has turned away and you have comforted me.'", reference: "Isaiah 12:1", category: "comfort", book: "isaiah" },
  { text: "In that day they will say, 'Give praise to the Lord, proclaim his name; make known among the nations what he has done, and proclaim that his name is exalted.'", reference: "Isaiah 12:4", category: "proclamation", book: "isaiah" },
  { text: "Sing to the Lord, for he has done glorious things; let this be known to all the world.", reference: "Isaiah 12:5", category: "glory", book: "isaiah" },
  { text: "Shout aloud and sing for joy, people of Zion, for great is the Holy One of Israel among you.", reference: "Isaiah 12:6", category: "joy", book: "isaiah" },
  { text: "But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed.", reference: "Isaiah 53:5", category: "healing", book: "isaiah" },
  { text: "We all, like sheep, have gone astray, each of us has turned to our own way; and the Lord has laid on him the iniquity of us all.", reference: "Isaiah 53:6", category: "redemption", book: "isaiah" },
  { text: "He was oppressed and afflicted, yet he did not open his mouth; he was led like a lamb to the slaughter, and as a sheep before its shearers is silent, so he did not open his mouth.", reference: "Isaiah 53:7", category: "sacrifice", book: "isaiah" },
  { text: "Yet it was the Lord's will to crush him and cause him to suffer, and though the Lord makes his life an offering for sin, he will see his offspring and prolong his days, and the will of the Lord will prosper in his hand.", reference: "Isaiah 53:10", category: "suffering", book: "isaiah" },
  { text: "After he has suffered, he will see the light of life and be satisfied; by his knowledge my righteous servant will justify many, and he will bear their iniquities.", reference: "Isaiah 53:11", category: "justification", book: "isaiah" },
  { text: "Therefore I will give him a portion among the great, and he will divide the spoils with the strong, because he poured out his life unto death, and was numbered with the transgressors.", reference: "Isaiah 53:12", category: "victory", book: "isaiah" }
];

// Combine all new verses
const allNewVerses = [
  ...historicalBooks,
  ...evenMorePsalms,
  ...moreNTBooks,
  ...evenMoreProverbs,
  ...moreIsaiah
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
