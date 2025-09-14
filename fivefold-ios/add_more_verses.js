// Add more verses to reach 1,000+
const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-1000.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// More Psalms (continuing the collection)
const morePsalms = [
  { text: "Praise the Lord. Praise God in his sanctuary; praise him in his mighty heavens.", reference: "Psalm 150:1", category: "praise", book: "psalms" },
  { text: "Praise him for his acts of power; praise him for his surpassing greatness.", reference: "Psalm 150:2", category: "praise", book: "psalms" },
  { text: "Praise him with the sounding of the trumpet, praise him with the harp and lyre.", reference: "Psalm 150:3", category: "worship", book: "psalms" },
  { text: "Praise him with timbrel and dancing, praise him with the strings and pipe.", reference: "Psalm 150:4", category: "celebration", book: "psalms" },
  { text: "Praise him with the clash of cymbals, praise him with resounding cymbals.", reference: "Psalm 150:5", category: "worship", book: "psalms" },
  { text: "Let everything that has breath praise the Lord. Praise the Lord.", reference: "Psalm 150:6", category: "praise", book: "psalms" },
  { text: "The Lord is my shepherd, I lack nothing.", reference: "Psalm 23:1", category: "provision", book: "psalms" },
  { text: "He makes me lie down in green pastures, he leads me beside quiet waters.", reference: "Psalm 23:2", category: "rest", book: "psalms" },
  { text: "He refreshes my soul. He guides me along the right paths for his name's sake.", reference: "Psalm 23:3", category: "guidance", book: "psalms" },
  { text: "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.", reference: "Psalm 23:5", category: "blessing", book: "psalms" },
  { text: "Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord forever.", reference: "Psalm 23:6", category: "eternity", book: "psalms" },
  { text: "The Lord is my strength and my song; he has given me victory. This is my God, and I will praise him—my father's God, and I will exalt him!", reference: "Psalm 118:14", category: "victory", book: "psalms" },
  { text: "Open for me the gates of the righteous; I will enter and give thanks to the Lord.", reference: "Psalm 118:19", category: "thanksgiving", book: "psalms" },
  { text: "This is the gate of the Lord through which the righteous may enter.", reference: "Psalm 118:20", category: "righteousness", book: "psalms" },
  { text: "I will give you thanks, for you answered me; you have become my salvation.", reference: "Psalm 118:21", category: "gratitude", book: "psalms" },
  { text: "The stone the builders rejected has become the cornerstone.", reference: "Psalm 118:22", category: "redemption", book: "psalms" },
  { text: "The Lord has done this, and it is marvelous in our eyes.", reference: "Psalm 118:23", category: "wonder", book: "psalms" },
  { text: "The Lord bless you from Zion; may you see the prosperity of Jerusalem all the days of your life.", reference: "Psalm 128:5", category: "blessing", book: "psalms" },
  { text: "May you live to see your children's children—peace be on Israel.", reference: "Psalm 128:6", category: "generations", book: "psalms" },
  { text: "Out of the depths I cry to you, Lord; Lord, hear my voice.", reference: "Psalm 130:1-2", category: "desperation", book: "psalms" }
];

// Isaiah (prophetic and messianic verses)
const isaiahVerses = [
  { text: "Come now, let us settle the matter,' says the Lord. 'Though your sins are like scarlet, they shall be as white as snow; though they are red as crimson, they shall be like wool.'", reference: "Isaiah 1:18", category: "forgiveness", book: "isaiah" },
  { text: "Therefore the Lord himself will give you a sign: The virgin will conceive and give birth to a son, and will call him Immanuel.", reference: "Isaiah 7:14", category: "prophecy", book: "isaiah" },
  { text: "For to us a child is born, to us a son is given, and the government will be on his shoulders.", reference: "Isaiah 9:6", category: "messiah", book: "isaiah" },
  { text: "And he will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace.", reference: "Isaiah 9:6", category: "names", book: "isaiah" },
  { text: "Of the greatness of his government and peace there will be no end.", reference: "Isaiah 9:7", category: "kingdom", book: "isaiah" },
  { text: "A shoot will come up from the stump of Jesse; from his roots a Branch will bear fruit.", reference: "Isaiah 11:1", category: "hope", book: "isaiah" },
  { text: "The Spirit of the Lord will rest on him—the Spirit of wisdom and of understanding, the Spirit of counsel and of might, the Spirit of the knowledge and fear of the Lord.", reference: "Isaiah 11:2", category: "spirit", book: "isaiah" },
  { text: "The wolf will live with the lamb, the leopard will lie down with the goat, the calf and the lion and the yearling together; and a little child will lead them.", reference: "Isaiah 11:6", category: "peace", book: "isaiah" },
  { text: "They will neither harm nor destroy on all my holy mountain, for the earth will be filled with the knowledge of the Lord as the waters cover the sea.", reference: "Isaiah 11:9", category: "knowledge", book: "isaiah" },
  { text: "Surely God is my salvation; I will trust and not be afraid. The Lord, the Lord himself, is my strength and my defense; he has become my salvation.", reference: "Isaiah 12:2", category: "salvation", book: "isaiah" },
  { text: "With joy you will draw water from the wells of salvation.", reference: "Isaiah 12:3", category: "joy", book: "isaiah" },
  { text: "Give praise to the Lord, proclaim his name; make known among the nations what he has done, and proclaim that his name is exalted.", reference: "Isaiah 12:4", category: "proclamation", book: "isaiah" },
  { text: "Sing to the Lord, for he has done glorious things; let this be known to all the world.", reference: "Isaiah 12:5", category: "glory", book: "isaiah" },
  { text: "Shout aloud and sing for joy, people of Zion, for great is the Holy One of Israel among you.", reference: "Isaiah 12:6", category: "joy", book: "isaiah" },
  { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", reference: "Isaiah 26:3", category: "peace", book: "isaiah" },
  { text: "Trust in the Lord forever, for the Lord, the Lord himself, is the Rock eternal.", reference: "Isaiah 26:4", category: "trust", book: "isaiah" },
  { text: "Lord, you establish peace for us; all that we have accomplished you have done for us.", reference: "Isaiah 26:12", category: "peace", book: "isaiah" },
  { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", reference: "Isaiah 26:3", category: "peace", book: "isaiah" },
  { text: "He gives strength to the weary and increases the power of the weak.", reference: "Isaiah 40:29", category: "strength", book: "isaiah" },
  { text: "Even youths grow tired and weary, and young men stumble and fall; but those who hope in the Lord will renew their strength.", reference: "Isaiah 40:30-31", category: "renewal", book: "isaiah" }
];

// Romans (Paul's theology)
const romansVerses = [
  { text: "I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile.", reference: "Romans 1:16", category: "gospel", book: "romans" },
  { text: "For in the gospel the righteousness of God is revealed—a righteousness that is by faith from first to last, just as it is written: 'The righteous will live by faith.'", reference: "Romans 1:17", category: "righteousness", book: "romans" },
  { text: "All have sinned and fall short of the glory of God.", reference: "Romans 3:23", category: "sin", book: "romans" },
  { text: "And all are justified freely by his grace through the redemption that came by Christ Jesus.", reference: "Romans 3:24", category: "grace", book: "romans" },
  { text: "Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ.", reference: "Romans 5:1", category: "peace", book: "romans" },
  { text: "Through whom we have gained access by faith into this grace in which we now stand. And we boast in the hope of the glory of God.", reference: "Romans 5:2", category: "access", book: "romans" },
  { text: "Not only so, but we also glory in our sufferings, because we know that suffering produces perseverance.", reference: "Romans 5:3", category: "perseverance", book: "romans" },
  { text: "Perseverance produces character; and character, hope.", reference: "Romans 5:4", category: "character", book: "romans" },
  { text: "And hope does not put us to shame, because God's love has been poured out into our hearts through the Holy Spirit, who has been given to us.", reference: "Romans 5:5", category: "hope", book: "romans" },
  { text: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.", reference: "Romans 5:8", category: "love", book: "romans" },
  { text: "Since we have now been justified by his blood, how much more shall we be saved from God's wrath through him!", reference: "Romans 5:9", category: "salvation", book: "romans" },
  { text: "For if, while we were God's enemies, we were reconciled to him through the death of his Son, how much more, having been reconciled, shall we be saved through his life!", reference: "Romans 5:10", category: "reconciliation", book: "romans" },
  { text: "What shall we say, then? Shall we go on sinning so that grace may increase? By no means! We are those who have died to sin; how can we live in it any longer?", reference: "Romans 6:1-2", category: "holiness", book: "romans" },
  { text: "Or don't you know that all of us who were baptized into Christ Jesus were baptized into his death?", reference: "Romans 6:3", category: "baptism", book: "romans" },
  { text: "We were therefore buried with him through baptism into death in order that, just as Christ was raised from the dead through the glory of the Father, we too may live a new life.", reference: "Romans 6:4", category: "newness", book: "romans" },
  { text: "For we know that our old self was crucified with him so that the body ruled by sin might be done away with, that we should no longer be slaves to sin.", reference: "Romans 6:6", category: "freedom", book: "romans" },
  { text: "Because anyone who has died has been set free from sin.", reference: "Romans 6:7", category: "freedom", book: "romans" },
  { text: "Now if we died with Christ, we believe that we will also live with him.", reference: "Romans 6:8", category: "life", book: "romans" },
  { text: "For we know that since Christ was raised from the dead, he cannot die again; death no longer has mastery over him.", reference: "Romans 6:9", category: "victory", book: "romans" },
  { text: "The death he died, he died to sin once for all; but the life he lives, he lives to God.", reference: "Romans 6:10", category: "sacrifice", book: "romans" }
];

// 1 Corinthians (Paul's practical wisdom)
const corinthiansVerses = [
  { text: "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God.", reference: "1 Corinthians 1:18", category: "cross", book: "1corinthians" },
  { text: "For the foolishness of God is wiser than human wisdom, and the weakness of God is stronger than human strength.", reference: "1 Corinthians 1:25", category: "wisdom", book: "1corinthians" },
  { text: "Brothers and sisters, think of what you were when you were called. Not many of you were wise by human standards; not many were influential; not many were of noble birth.", reference: "1 Corinthians 1:26", category: "calling", book: "1corinthians" },
  { text: "But God chose the foolish things of the world to shame the wise; God chose the weak things of the world to shame the strong.", reference: "1 Corinthians 1:27", category: "choice", book: "1corinthians" },
  { text: "God chose the lowly things of this world and the despised things—and the things that are not—to nullify the things that are.", reference: "1 Corinthians 1:28", category: "reversal", book: "1corinthians" },
  { text: "So that no one may boast before him.", reference: "1 Corinthians 1:29", category: "humility", book: "1corinthians" },
  { text: "It is because of him that you are in Christ Jesus, who has become for us wisdom from God—that is, our righteousness, holiness and redemption.", reference: "1 Corinthians 1:30", category: "identity", book: "1corinthians" },
  { text: "Therefore, as it is written: 'Let the one who boasts boast in the Lord.'", reference: "1 Corinthians 1:31", category: "boasting", book: "1corinthians" },
  { text: "And so it was with me, brothers and sisters. When I came to you, I did not come with eloquence or human wisdom as I proclaimed to you the testimony about God.", reference: "1 Corinthians 2:1", category: "simplicity", book: "1corinthians" },
  { text: "For I resolved to know nothing while I was with you except Jesus Christ and him crucified.", reference: "1 Corinthians 2:2", category: "focus", book: "1corinthians" },
  { text: "I came to you in weakness with great fear and trembling.", reference: "1 Corinthians 2:3", category: "weakness", book: "1corinthians" },
  { text: "My message and my preaching were not with wise and persuasive words, but with a demonstration of the Spirit's power.", reference: "1 Corinthians 2:4", category: "power", book: "1corinthians" },
  { text: "So that your faith might not rest on human wisdom, but on God's power.", reference: "1 Corinthians 2:5", category: "faith", book: "1corinthians" },
  { text: "We do, however, speak a message of wisdom among the mature, but not the wisdom of this age or of the rulers of this age, who are coming to nothing.", reference: "1 Corinthians 2:6", category: "maturity", book: "1corinthians" },
  { text: "No, we declare God's wisdom, a mystery that has been hidden and that God destined for our glory before time began.", reference: "1 Corinthians 2:7", category: "mystery", book: "1corinthians" },
  { text: "None of the rulers of this age understood it, for if they had, they would not have crucified the Lord of glory.", reference: "1 Corinthians 2:8", category: "understanding", book: "1corinthians" },
  { text: "However, as it is written: 'What no eye has seen, what no ear has heard, and what no human mind has conceived'—the things God has prepared for those who love him.", reference: "1 Corinthians 2:9", category: "preparation", book: "1corinthians" },
  { text: "These are the things God has revealed to us by his Spirit. The Spirit searches all things, even the deep things of God.", reference: "1 Corinthians 2:10", category: "revelation", book: "1corinthians" },
  { text: "For who knows a person's thoughts except their own spirit within them? In the same way no one knows the thoughts of God except the Spirit of God.", reference: "1 Corinthians 2:11", category: "knowledge", book: "1corinthians" },
  { text: "What we have received is not the spirit of the world, but the Spirit who is from God, so that we may understand what God has freely given us.", reference: "1 Corinthians 2:12", category: "understanding", book: "1corinthians" }
];

// Ephesians (Paul's theology of the church)
const ephesiansVerses = [
  { text: "Praise be to the God and Father of our Lord Jesus Christ, who has blessed us in the heavenly realms with every spiritual blessing in Christ.", reference: "Ephesians 1:3", category: "blessing", book: "ephesians" },
  { text: "For he chose us in him before the creation of the world to be holy and blameless in his sight.", reference: "Ephesians 1:4", category: "election", book: "ephesians" },
  { text: "In love he predestined us for adoption to sonship through Jesus Christ, in accordance with his pleasure and will.", reference: "Ephesians 1:5", category: "adoption", book: "ephesians" },
  { text: "To the praise of his glorious grace, which he has freely given us in the One he loves.", reference: "Ephesians 1:6", category: "grace", book: "ephesians" },
  { text: "In him we have redemption through his blood, the forgiveness of sins, in accordance with the riches of God's grace.", reference: "Ephesians 1:7", category: "redemption", book: "ephesians" },
  { text: "That he lavished on us. With all wisdom and understanding.", reference: "Ephesians 1:8", category: "wisdom", book: "ephesians" },
  { text: "He made known to us the mystery of his will according to his good pleasure, which he purposed in Christ.", reference: "Ephesians 1:9", category: "mystery", book: "ephesians" },
  { text: "To be put into effect when the times reach their fulfillment—to bring unity to all things in heaven and on earth under Christ.", reference: "Ephesians 1:10", category: "unity", book: "ephesians" },
  { text: "In him we were also chosen, having been predestined according to the plan of him who works out everything in conformity with the purpose of his will.", reference: "Ephesians 1:11", category: "purpose", book: "ephesians" },
  { text: "In order that we, who were the first to put our hope in Christ, might be for the praise of his glory.", reference: "Ephesians 1:12", category: "hope", book: "ephesians" },
  { text: "And you also were included in Christ when you heard the message of truth, the gospel of your salvation.", reference: "Ephesians 1:13", category: "inclusion", book: "ephesians" },
  { text: "When you believed, you were marked in him with a seal, the promised Holy Spirit.", reference: "Ephesians 1:13", category: "sealing", book: "ephesians" },
  { text: "Who is a deposit guaranteeing our inheritance until the redemption of those who are God's possession—to the praise of his glory.", reference: "Ephesians 1:14", category: "inheritance", book: "ephesians" },
  { text: "I keep asking that the God of our Lord Jesus Christ, the glorious Father, may give you the Spirit of wisdom and revelation, so that you may know him better.", reference: "Ephesians 1:17", category: "prayer", book: "ephesians" },
  { text: "I pray that the eyes of your heart may be enlightened in order that you may know the hope to which he has called you, the riches of his glorious inheritance in his holy people.", reference: "Ephesians 1:18", category: "enlightenment", book: "ephesians" },
  { text: "And his incomparably great power for us who believe. That power is the same as the mighty strength.", reference: "Ephesians 1:19", category: "power", book: "ephesians" },
  { text: "He exerted when he raised Christ from the dead and seated him at his right hand in the heavenly realms.", reference: "Ephesians 1:20", category: "resurrection", book: "ephesians" },
  { text: "Far above all rule and authority, power and dominion, and every name that is invoked, not only in the present age but also in the one to come.", reference: "Ephesians 1:21", category: "supremacy", book: "ephesians" },
  { text: "And God placed all things under his feet and appointed him to be head over everything for the church.", reference: "Ephesians 1:22", category: "headship", book: "ephesians" },
  { text: "Which is his body, the fullness of him who fills everything in every way.", reference: "Ephesians 1:23", category: "church", book: "ephesians" }
];

// Combine all new verses
const allNewVerses = [
  ...morePsalms,
  ...isaiahVerses,
  ...romansVerses,
  ...corinthiansVerses,
  ...ephesiansVerses
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
