// Final push to 1,000+ verses - adding remaining books
const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-1000.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// Revelation - prophetic and worship verses
const revelationVerses = [
  { text: "Blessed is the one who reads aloud the words of this prophecy, and blessed are those who hear it and take to heart what is written in it, because the time is near.", reference: "Revelation 1:3", category: "blessing", book: "revelation" },
  { text: "Grace and peace to you from him who is, and who was, and who is to come, and from the seven spirits before his throne.", reference: "Revelation 1:4", category: "peace", book: "revelation" },
  { text: "To him who loves us and has freed us from our sins by his blood, and has made us to be a kingdom and priests to serve his God and Father—to him be glory and power for ever and ever! Amen.", reference: "Revelation 1:5-6", category: "freedom", book: "revelation" },
  { text: "'Look, he is coming with the clouds,' and 'every eye will see him, even those who pierced him'; and all peoples on earth 'will mourn because of him.' So shall it be! Amen.", reference: "Revelation 1:7", category: "coming", book: "revelation" },
  { text: "'I am the Alpha and the Omega,' says the Lord God, 'who is, and who was, and who is to come, the Almighty.'", reference: "Revelation 1:8", category: "eternal", book: "revelation" },
  { text: "When I saw him, I fell at his feet as though dead. Then he placed his right hand on me and said: 'Do not be afraid. I am the First and the Last.'", reference: "Revelation 1:17", category: "comfort", book: "revelation" },
  { text: "I am the Living One; I was dead, and now look, I am alive for ever and ever! And I hold the keys of death and Hades.", reference: "Revelation 1:18", category: "victory", book: "revelation" },
  { text: "These are the words of him who holds the seven stars in his right hand and walks among the seven golden lampstands.", reference: "Revelation 2:1", category: "presence", book: "revelation" },
  { text: "Yet I hold this against you: You have forsaken the love you had at first.", reference: "Revelation 2:4", category: "love", book: "revelation" },
  { text: "Consider how far you have fallen! Repent and do the things you did at first. If you do not repent, I will come to you and remove your lampstand from its place.", reference: "Revelation 2:5", category: "repentance", book: "revelation" },
  { text: "Whoever has ears, let them hear what the Spirit says to the churches. To the one who is victorious, I will give the right to eat from the tree of life, which is in the paradise of God.", reference: "Revelation 2:7", category: "victory", book: "revelation" },
  { text: "Do not be afraid of what you are about to suffer. I tell you, the devil will put some of you in prison to test you, and you will suffer persecution for ten days. Be faithful, even to the point of death, and I will give you life as your victor's crown.", reference: "Revelation 2:10", category: "faithfulness", book: "revelation" },
  { text: "Whoever has ears, let them hear what the Spirit says to the churches. The one who is victorious will not be hurt at all by the second death.", reference: "Revelation 2:11", category: "protection", book: "revelation" },
  { text: "Here I am! I stand at the door and knock. If anyone hears my voice and opens the door, I will come in and eat with that person, and they with me.", reference: "Revelation 3:20", category: "invitation", book: "revelation" },
  { text: "To the one who is victorious, I will give the right to sit with me on my throne, just as I was victorious and sat down with my Father on his throne.", reference: "Revelation 3:21", category: "throne", book: "revelation" },
  { text: "After this I looked, and there before me was a door standing open in heaven. And the voice I had first heard speaking to me like a trumpet said, 'Come up here, and I will show you what must take place after this.'", reference: "Revelation 4:1", category: "vision", book: "revelation" },
  { text: "At once I was in the Spirit, and there before me was a throne in heaven with someone sitting on it.", reference: "Revelation 4:2", category: "throne", book: "revelation" },
  { text: "And the one who sat there had the appearance of jasper and ruby. A rainbow that shone like an emerald encircled the throne.", reference: "Revelation 4:3", category: "glory", book: "revelation" },
  { text: "You are worthy, our Lord and God, to receive glory and honor and power, for you created all things, and by your will they were created and have their being.", reference: "Revelation 4:11", category: "worship", book: "revelation" },
  { text: "And they sang a new song, saying: 'You are worthy to take the scroll and to open its seals, because you were slain, and with your blood you purchased for God persons from every tribe and language and people and nation.'", reference: "Revelation 5:9", category: "redemption", book: "revelation" }
];

// Daniel - prophecy and faithfulness
const danielVerses = [
  { text: "But Daniel resolved not to defile himself with the royal food and wine, and he asked the chief official for permission not to defile himself this way.", reference: "Daniel 1:8", category: "resolve", book: "daniel" },
  { text: "To these four young men God gave knowledge and understanding of all kinds of literature and learning. And Daniel could understand visions and dreams of all kinds.", reference: "Daniel 1:17", category: "wisdom", book: "daniel" },
  { text: "In every matter of wisdom and understanding about which the king questioned them, he found them ten times better than all the magicians and enchanters in his whole kingdom.", reference: "Daniel 1:20", category: "excellence", book: "daniel" },
  { text: "Daniel answered, 'No wise man, enchanter, magician or diviner can explain to the king the mystery he has asked about, but there is a God in heaven who reveals mysteries.'", reference: "Daniel 2:27-28", category: "revelation", book: "daniel" },
  { text: "He changes times and seasons; he deposes kings and raises up others. He gives wisdom to the wise and knowledge to the discerning.", reference: "Daniel 2:21", category: "sovereignty", book: "daniel" },
  { text: "He reveals deep and hidden things; he knows what lies in darkness, and light dwells with him.", reference: "Daniel 2:22", category: "knowledge", book: "daniel" },
  { text: "I thank and praise you, God of my ancestors: You have given me wisdom and power, you have made known to me what we asked of you, you have made known to us the dream of the king.", reference: "Daniel 2:23", category: "gratitude", book: "daniel" },
  { text: "Shadrach, Meshach and Abednego replied to him, 'King Nebuchadnezzar, we do not need to defend ourselves before you in this matter.'", reference: "Daniel 3:16", category: "courage", book: "daniel" },
  { text: "If we are thrown into the blazing furnace, the God we serve is able to deliver us from it, and he will deliver us from Your Majesty's hand.", reference: "Daniel 3:17", category: "deliverance", book: "daniel" },
  { text: "But even if he does not, we want you to know, Your Majesty, that we will not serve your gods or worship the image of gold you have set up.", reference: "Daniel 3:18", category: "faithfulness", book: "daniel" },
  { text: "Then Nebuchadnezzar said, 'Praise be to the God of Shadrach, Meshach and Abednego, who has sent his angel and rescued his servants! They trusted in him and defied the king's command and were willing to give up their lives rather than serve or worship any god except their own God.'", reference: "Daniel 3:28", category: "rescue", book: "daniel" },
  { text: "Now when Daniel learned that the decree had been published, he went home to his upstairs room where the windows opened toward Jerusalem. Three times a day he got down on his knees and prayed, giving thanks to his God, just as he had done before.", reference: "Daniel 6:10", category: "prayer", book: "daniel" },
  { text: "My God sent his angel, and he shut the mouths of the lions. They have not hurt me, because I was found innocent in his sight. Nor have I ever done any wrong before you, Your Majesty.", reference: "Daniel 6:22", category: "protection", book: "daniel" },
  { text: "In my vision at night I looked, and there before me was one like a son of man, coming with the clouds of heaven. He approached the Ancient of Days and was led into his presence.", reference: "Daniel 7:13", category: "vision", book: "daniel" },
  { text: "He was given authority, glory and sovereign power; all nations and peoples of every language worshiped him. His dominion is an everlasting dominion that will not pass away, and his kingdom is one that will never be destroyed.", reference: "Daniel 7:14", category: "kingdom", book: "daniel" }
];

// More Psalms (continuing with different themes)
const morePsalmsWorship = [
  { text: "Make a joyful noise unto the Lord, all ye lands.", reference: "Psalm 100:1", category: "joy", book: "psalms" },
  { text: "Serve the Lord with gladness: come before his presence with singing.", reference: "Psalm 100:2", category: "service", book: "psalms" },
  { text: "Know ye that the Lord he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture.", reference: "Psalm 100:3", category: "identity", book: "psalms" },
  { text: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.", reference: "Psalm 100:4", category: "thanksgiving", book: "psalms" },
  { text: "For the Lord is good; his mercy is everlasting; and his truth endureth to all generations.", reference: "Psalm 100:5", category: "goodness", book: "psalms" },
  { text: "Bless the Lord, O my soul: and all that is within me, bless his holy name.", reference: "Psalm 103:1", category: "blessing", book: "psalms" },
  { text: "Bless the Lord, O my soul, and forget not all his benefits.", reference: "Psalm 103:2", category: "remembrance", book: "psalms" },
  { text: "Who forgiveth all thine iniquities; who healeth all thy diseases.", reference: "Psalm 103:3", category: "healing", book: "psalms" },
  { text: "Who redeemeth thy life from destruction; who crowneth thee with lovingkindness and tender mercies.", reference: "Psalm 103:4", category: "redemption", book: "psalms" },
  { text: "Who satisfieth thy mouth with good things; so that thy youth is renewed like the eagle's.", reference: "Psalm 103:5", category: "renewal", book: "psalms" },
  { text: "The Lord executeth righteousness and judgment for all that are oppressed.", reference: "Psalm 103:6", category: "justice", book: "psalms" },
  { text: "He made known his ways unto Moses, his acts unto the children of Israel.", reference: "Psalm 103:7", category: "revelation", book: "psalms" },
  { text: "The Lord is merciful and gracious, slow to anger, and plenteous in mercy.", reference: "Psalm 103:8", category: "mercy", book: "psalms" },
  { text: "He will not always chide: neither will he keep his anger for ever.", reference: "Psalm 103:9", category: "forgiveness", book: "psalms" },
  { text: "He hath not dealt with us after our sins; nor rewarded us according to our iniquities.", reference: "Psalm 103:10", category: "grace", book: "psalms" },
  { text: "For as the heaven is high above the earth, so great is his mercy toward them that fear him.", reference: "Psalm 103:11", category: "mercy", book: "psalms" },
  { text: "As far as the east is from the west, so far hath he removed our transgressions from us.", reference: "Psalm 103:12", category: "forgiveness", book: "psalms" },
  { text: "Like as a father pitieth his children, so the Lord pitieth them that fear him.", reference: "Psalm 103:13", category: "compassion", book: "psalms" },
  { text: "For he knoweth our frame; he remembereth that we are dust.", reference: "Psalm 103:14", category: "understanding", book: "psalms" },
  { text: "As for man, his days are as grass: as a flower of the field, so he flourisheth.", reference: "Psalm 103:15", category: "mortality", book: "psalms" }
];

// More Proverbs (practical wisdom)
const moreProverbsWisdom = [
  { text: "When pride comes, then comes disgrace, but with humility comes wisdom.", reference: "Proverbs 11:2", category: "humility", book: "proverbs" },
  { text: "The integrity of the upright guides them, but the unfaithful are destroyed by their duplicity.", reference: "Proverbs 11:3", category: "integrity", book: "proverbs" },
  { text: "Wealth is worthless in the day of wrath, but righteousness delivers from death.", reference: "Proverbs 11:4", category: "righteousness", book: "proverbs" },
  { text: "The righteousness of the blameless makes their paths straight, but the wicked are brought down by their own wickedness.", reference: "Proverbs 11:5", category: "paths", book: "proverbs" },
  { text: "The righteousness of the upright delivers them, but the unfaithful are trapped by evil desires.", reference: "Proverbs 11:6", category: "deliverance", book: "proverbs" },
  { text: "Hopes placed in mortals die with them; all the promise of their power comes to nothing.", reference: "Proverbs 11:7", category: "hope", book: "proverbs" },
  { text: "The righteous person is rescued from trouble, and it falls on the wicked instead.", reference: "Proverbs 11:8", category: "rescue", book: "proverbs" },
  { text: "With their mouths the godless destroy their neighbors, but through knowledge the righteous escape.", reference: "Proverbs 11:9", category: "knowledge", book: "proverbs" },
  { text: "When the righteous prosper, the city rejoices; when the wicked perish, there are shouts of joy.", reference: "Proverbs 11:10", category: "prosperity", book: "proverbs" },
  { text: "Through the blessing of the upright a city is exalted, but by the mouth of the wicked it is destroyed.", reference: "Proverbs 11:11", category: "blessing", book: "proverbs" },
  { text: "Whoever derides their neighbor has no sense, but the one who has understanding holds their tongue.", reference: "Proverbs 11:12", category: "understanding", book: "proverbs" },
  { text: "A gossip betrays a confidence, but a trustworthy person keeps a secret.", reference: "Proverbs 11:13", category: "trust", book: "proverbs" },
  { text: "For lack of guidance a nation falls, but victory is won through many advisers.", reference: "Proverbs 11:14", category: "guidance", book: "proverbs" },
  { text: "Whoever puts up security for a stranger will surely suffer, but whoever refuses to shake hands in pledge is safe.", reference: "Proverbs 11:15", category: "security", book: "proverbs" },
  { text: "A kindhearted woman gains honor, but ruthless men gain only wealth.", reference: "Proverbs 11:16", category: "kindness", book: "proverbs" },
  { text: "Those who are kind benefit themselves, but the cruel bring ruin on themselves.", reference: "Proverbs 11:17", category: "kindness", book: "proverbs" },
  { text: "A wicked person earns deceptive wages, but the one who sows righteousness reaps a sure reward.", reference: "Proverbs 11:18", category: "reward", book: "proverbs" },
  { text: "Truly the righteous attain life, but whoever pursues evil finds death.", reference: "Proverbs 11:19", category: "life", book: "proverbs" },
  { text: "The Lord detests those whose hearts are perverse, but he delights in those whose ways are blameless.", reference: "Proverbs 11:20", category: "delight", book: "proverbs" },
  { text: "Be sure of this: The wicked will not go unpunished, but those who are righteous will go free.", reference: "Proverbs 11:21", category: "justice", book: "proverbs" }
];

// More New Testament (Acts, Timothy, Titus, etc.)
const moreNewTestament = [
  { text: "But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.", reference: "Acts 1:8", category: "power", book: "acts" },
  { text: "All of them were filled with the Holy Spirit and began to speak in other tongues as the Spirit enabled them.", reference: "Acts 2:4", category: "spirit", book: "acts" },
  { text: "Peter replied, 'Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins. And you will receive the gift of the Holy Spirit.'", reference: "Acts 2:38", category: "repentance", book: "acts" },
  { text: "They devoted themselves to the apostles' teaching and to fellowship, to the breaking of bread and to prayer.", reference: "Acts 2:42", category: "devotion", book: "acts" },
  { text: "Everyone was filled with awe at the many wonders and signs performed by the apostles.", reference: "Acts 2:43", category: "wonder", book: "acts" },
  { text: "All the believers were together and had everything in common.", reference: "Acts 2:44", category: "community", book: "acts" },
  { text: "They sold property and possessions to give to anyone who had need.", reference: "Acts 2:45", category: "generosity", book: "acts" },
  { text: "Every day they continued to meet together in the temple courts. They broke bread in their homes and ate together with glad and sincere hearts.", reference: "Acts 2:46", category: "fellowship", book: "acts" },
  { text: "Praising God and enjoying the favor of all the people. And the Lord added to their number daily those who were being saved.", reference: "Acts 2:47", category: "growth", book: "acts" },
  { text: "Silver or gold I do not have, but what I do have I give you. In the name of Jesus Christ of Nazareth, walk.", reference: "Acts 3:6", category: "healing", book: "acts" },
  { text: "Salvation is found in no one else, for there is no other name under heaven given to mankind by which we must be saved.", reference: "Acts 4:12", category: "salvation", book: "acts" },
  { text: "After they prayed, the place where they were meeting was shaken. And they were all filled with the Holy Spirit and spoke the word of God boldly.", reference: "Acts 4:31", category: "boldness", book: "acts" },
  { text: "All the believers were one in heart and mind. No one claimed that any of their possessions was their own, but they shared everything they had.", reference: "Acts 4:32", category: "unity", book: "acts" },
  { text: "With great power the apostles continued to testify to the resurrection of the Lord Jesus. And God's grace was so powerfully at work in them all.", reference: "Acts 4:33", category: "testimony", book: "acts" },
  { text: "There were no needy persons among them. For from time to time those who owned land or houses sold them, brought the money from the sales.", reference: "Acts 4:34", category: "provision", book: "acts" },
  { text: "And put it at the apostles' feet, and it was distributed to anyone who had need.", reference: "Acts 4:35", category: "distribution", book: "acts" },
  { text: "But Saul began to destroy the church. Going from house to house, he dragged off both men and women and put them in prison.", reference: "Acts 8:3", category: "persecution", book: "acts" },
  { text: "Those who had been scattered preached the word wherever they went.", reference: "Acts 8:4", category: "preaching", book: "acts" },
  { text: "Philip went down to a city in Samaria and proclaimed the Messiah there.", reference: "Acts 8:5", category: "proclamation", book: "acts" },
  { text: "When the crowds heard Philip and saw the signs he performed, they all paid close attention to what he said.", reference: "Acts 8:6", category: "attention", book: "acts" }
];

// Combine all new verses
const allNewVerses = [
  ...revelationVerses,
  ...danielVerses,
  ...morePsalmsWorship,
  ...moreProverbsWisdom,
  ...moreNewTestament
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
}
