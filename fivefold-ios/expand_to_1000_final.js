// Final expansion to 1,000+ Bible verses
const fs = require('fs');

// Read current collection
const currentData = JSON.parse(fs.readFileSync('daily-verses-1000.json', 'utf8'));
let verses = currentData.dailyVerses;

console.log(`Starting with ${verses.length} verses`);

// Minor Prophets - powerful short verses
const minorProphets = [
  { text: "Return to me, and I will return to you, says the Lord Almighty.", reference: "Malachi 3:7", category: "return", book: "malachi" },
  { text: "But for you who revere my name, the sun of righteousness will rise with healing in its rays.", reference: "Malachi 4:2", category: "healing", book: "malachi" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", reference: "Zephaniah 3:17", category: "love", book: "zephaniah" },
  { text: "Seek the Lord, all you humble of the land, you who do what he commands. Seek righteousness, seek humility; perhaps you will be sheltered on the day of the Lord's anger.", reference: "Zephaniah 2:3", category: "seeking", book: "zephaniah" },
  { text: "The Lord is slow to anger but great in power; the Lord will not leave the guilty unpunished.", reference: "Nahum 1:3", category: "justice", book: "nahum" },
  { text: "The Lord is good, a refuge in times of trouble. He cares for those who trust in him.", reference: "Nahum 1:7", category: "refuge", book: "nahum" },
  { text: "Look at the nations and watch—and be utterly amazed. For I am going to do something in your days that you would not believe, even if you were told.", reference: "Habakkuk 1:5", category: "wonder", book: "habakkuk" },
  { text: "Though the fig tree does not bud and there are no grapes on the vines, though the olive crop fails and the fields produce no food, though there are no sheep in the pen and no cattle in the stalls, yet I will rejoice in the Lord, I will be joyful in God my Savior.", reference: "Habakkuk 3:17-18", category: "joy", book: "habakkuk" },
  { text: "The Sovereign Lord is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights.", reference: "Habakkuk 3:19", category: "strength", book: "habakkuk" },
  { text: "But let justice roll on like a river, righteousness like a never-failing stream!", reference: "Amos 5:24", category: "justice", book: "amos" },
  { text: "Seek good, not evil, that you may live. Then the Lord God Almighty will be with you, just as you say he is.", reference: "Amos 5:14", category: "seeking", book: "amos" },
  { text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", reference: "Micah 6:8", category: "requirements", book: "micah" },
  { text: "But as for me, I watch in hope for the Lord, I wait for God my Savior; my God will hear me.", reference: "Micah 7:7", category: "hope", book: "micah" },
  { text: "Who is a God like you, who pardons sin and forgives the transgression of the remnant of his inheritance? You do not stay angry forever but delight to show mercy.", reference: "Micah 7:18", category: "mercy", book: "micah" },
  { text: "You will again have compassion on us; you will tread our sins underfoot and hurl all our iniquities into the depths of the sea.", reference: "Micah 7:19", category: "forgiveness", book: "micah" },
  { text: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing.", reference: "Zephaniah 3:17", category: "presence", book: "zephaniah" },
  { text: "Return to the Lord your God, for he is gracious and compassionate, slow to anger and abounding in love, and he relents from sending calamity.", reference: "Joel 2:13", category: "return", book: "joel" },
  { text: "And everyone who calls on the name of the Lord will be saved; for on Mount Zion and in Jerusalem there will be deliverance, as the Lord has said, even among the survivors whom the Lord calls.", reference: "Joel 2:32", category: "salvation", book: "joel" },
  { text: "I will pour out my Spirit on all people. Your sons and daughters will prophesy, your old men will dream dreams, your young men will see visions.", reference: "Joel 2:28", category: "spirit", book: "joel" },
  { text: "When Israel was a child, I loved him, and out of Egypt I called my son.", reference: "Hosea 11:1", category: "love", book: "hosea" }
];

// Job - wisdom through suffering
const jobVerses = [
  { text: "The Lord gave and the Lord has taken away; may the name of the Lord be praised.", reference: "Job 1:21", category: "acceptance", book: "job" },
  { text: "Though he slay me, yet will I hope in him; I will surely defend my ways to his face.", reference: "Job 13:15", category: "hope", book: "job" },
  { text: "I know that my redeemer lives, and that in the end he will stand on the earth.", reference: "Job 19:25", category: "redemption", book: "job" },
  { text: "And after my skin has been destroyed, yet in my flesh I will see God.", reference: "Job 19:26", category: "resurrection", book: "job" },
  { text: "I myself will see him with my own eyes—I, and not another. How my heart yearns within me!", reference: "Job 19:27", category: "longing", book: "job" },
  { text: "But he knows the way that I take; when he has tested me, I will come forth as gold.", reference: "Job 23:10", category: "testing", book: "job" },
  { text: "My feet have closely followed his steps; I have kept to his way without turning aside.", reference: "Job 23:11", category: "faithfulness", book: "job" },
  { text: "I have not departed from the commands of his lips; I have treasured the words of his mouth more than my daily bread.", reference: "Job 23:12", category: "word", book: "job" },
  { text: "Then the Lord spoke to Job out of the storm. He said: 'Who is this that obscures my plans with words without knowledge?'", reference: "Job 38:1-2", category: "sovereignty", book: "job" },
  { text: "Brace yourself like a man; I will question you, and you shall answer me.", reference: "Job 38:3", category: "challenge", book: "job" },
  { text: "Where were you when I laid the earth's foundation? Tell me, if you understand.", reference: "Job 38:4", category: "creation", book: "job" },
  { text: "Who marked off its dimensions? Surely you know! Who stretched a measuring line across it?", reference: "Job 38:5", category: "design", book: "job" },
  { text: "On what were its footings set, or who laid its cornerstone—while the morning stars sang together and all the angels shouted for joy?", reference: "Job 38:6-7", category: "celebration", book: "job" },
  { text: "I know that you can do all things; no purpose of yours can be thwarted.", reference: "Job 42:2", category: "omnipotence", book: "job" },
  { text: "You asked, 'Who is this that obscures my plans without knowledge?' Surely I spoke of things I did not understand, things too wonderful for me to know.", reference: "Job 42:3", category: "humility", book: "job" }
];

// Ecclesiastes - wisdom and meaning
const ecclesiastesVerses = [
  { text: "To everything there is a season, and a time to every purpose under the heaven.", reference: "Ecclesiastes 3:1", category: "timing", book: "ecclesiastes" },
  { text: "A time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted.", reference: "Ecclesiastes 3:2", category: "seasons", book: "ecclesiastes" },
  { text: "A time to kill, and a time to heal; a time to break down, and a time to build up.", reference: "Ecclesiastes 3:3", category: "cycles", book: "ecclesiastes" },
  { text: "A time to weep, and a time to laugh; a time to mourn, and a time to dance.", reference: "Ecclesiastes 3:4", category: "emotions", book: "ecclesiastes" },
  { text: "A time to cast away stones, and a time to gather stones together; a time to embrace, and a time to refrain from embracing.", reference: "Ecclesiastes 3:5", category: "relationships", book: "ecclesiastes" },
  { text: "A time to get, and a time to lose; a time to keep, and a time to cast away.", reference: "Ecclesiastes 3:6", category: "possessions", book: "ecclesiastes" },
  { text: "A time to rend, and a time to sew; a time to keep silence, and a time to speak.", reference: "Ecclesiastes 3:7", category: "communication", book: "ecclesiastes" },
  { text: "A time to love, and a time to hate; a time of war, and a time of peace.", reference: "Ecclesiastes 3:8", category: "conflict", book: "ecclesiastes" },
  { text: "He has made everything beautiful in its time. He has also set eternity in the human heart; yet no one can fathom what God has done from beginning to end.", reference: "Ecclesiastes 3:11", category: "beauty", book: "ecclesiastes" },
  { text: "I know that there is nothing better for mortals than to be happy and enjoy themselves as long as they live.", reference: "Ecclesiastes 3:12", category: "joy", book: "ecclesiastes" },
  { text: "That each of them may eat and drink, and find satisfaction in all their toil—this is the gift of God.", reference: "Ecclesiastes 3:13", category: "satisfaction", book: "ecclesiastes" },
  { text: "I know that everything God does will endure forever; nothing can be added to it and nothing taken from it. God does it so that people will fear him.", reference: "Ecclesiastes 3:14", category: "permanence", book: "ecclesiastes" },
  { text: "Two are better than one, because they have a good return for their labor.", reference: "Ecclesiastes 4:9", category: "partnership", book: "ecclesiastes" },
  { text: "If either of them falls down, one can help the other up. But pity anyone who falls and has no one to help them up.", reference: "Ecclesiastes 4:10", category: "support", book: "ecclesiastes" },
  { text: "Also, if two lie down together, they will keep warm. But how can one keep warm alone?", reference: "Ecclesiastes 4:11", category: "companionship", book: "ecclesiastes" },
  { text: "Though one may be overpowered, two can defend themselves. A cord of three strands is not quickly broken.", reference: "Ecclesiastes 4:12", category: "unity", book: "ecclesiastes" },
  { text: "Remember your Creator in the days of your youth, before the days of trouble come and the years approach when you will say, 'I find no pleasure in them.'", reference: "Ecclesiastes 12:1", category: "youth", book: "ecclesiastes" },
  { text: "Now all has been heard; here is the conclusion of the matter: Fear God and keep his commandments, for this is the duty of all mankind.", reference: "Ecclesiastes 12:13", category: "conclusion", book: "ecclesiastes" },
  { text: "For God will bring every deed into judgment, including every hidden thing, whether it is good or evil.", reference: "Ecclesiastes 12:14", category: "judgment", book: "ecclesiastes" }
];

// Hebrews - faith and perseverance
const hebrewsVerses = [
  { text: "In the past God spoke to our ancestors through the prophets at many times and in various ways, but in these last days he has spoken to us by his Son.", reference: "Hebrews 1:1-2", category: "revelation", book: "hebrews" },
  { text: "The Son is the radiance of God's glory and the exact representation of his being, sustaining all things by his powerful word.", reference: "Hebrews 1:3", category: "glory", book: "hebrews" },
  { text: "After he had provided purification for sins, he sat down at the right hand of the Majesty in heaven.", reference: "Hebrews 1:3", category: "purification", book: "hebrews" },
  { text: "So he became as much superior to the angels as the name he has inherited is superior to theirs.", reference: "Hebrews 1:4", category: "superiority", book: "hebrews" },
  { text: "We must pay the most careful attention, therefore, to what we have heard, so that we do not drift away.", reference: "Hebrews 2:1", category: "attention", book: "hebrews" },
  { text: "How shall we escape if we ignore so great a salvation? This salvation, which was first announced by the Lord, was confirmed to us by those who heard him.", reference: "Hebrews 2:3", category: "salvation", book: "hebrews" },
  { text: "Since the children have flesh and blood, he too shared in their humanity so that by his death he might break the power of him who holds the power of death—that is, the devil.", reference: "Hebrews 2:14", category: "incarnation", book: "hebrews" },
  { text: "And free those who all their lives were held in slavery by their fear of death.", reference: "Hebrews 2:15", category: "freedom", book: "hebrews" },
  { text: "Because he himself suffered when he was tempted, he is able to help those who are being tempted.", reference: "Hebrews 2:18", category: "temptation", book: "hebrews" },
  { text: "Therefore, since we have a great high priest who has ascended into heaven, Jesus the Son of God, let us hold firmly to the faith we profess.", reference: "Hebrews 4:14", category: "faith", book: "hebrews" },
  { text: "For we do not have a high priest who is unable to empathize with our weaknesses, but we have one who has been tempted in every way, just as we are—yet he did not sin.", reference: "Hebrews 4:15", category: "empathy", book: "hebrews" },
  { text: "Let us then approach God's throne of grace with confidence, so that we may receive mercy and find grace to help us in our time of need.", reference: "Hebrews 4:16", category: "grace", book: "hebrews" },
  { text: "Now faith is confidence in what we hope for and assurance about what we do not see.", reference: "Hebrews 11:1", category: "faith", book: "hebrews" },
  { text: "And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him.", reference: "Hebrews 11:6", category: "seeking", book: "hebrews" },
  { text: "Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles.", reference: "Hebrews 12:1", category: "perseverance", book: "hebrews" },
  { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus, the pioneer and perfecter of faith.", reference: "Hebrews 12:1-2", category: "focus", book: "hebrews" },
  { text: "For the joy set before him he endured the cross, scorning its shame, and sat down at the right hand of the throne of God.", reference: "Hebrews 12:2", category: "endurance", book: "hebrews" },
  { text: "Consider him who endured such opposition from sinners, so that you will not grow weary and lose heart.", reference: "Hebrews 12:3", category: "encouragement", book: "hebrews" },
  { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.", reference: "Hebrews 12:11", category: "discipline", book: "hebrews" },
  { text: "Jesus Christ is the same yesterday and today and forever.", reference: "Hebrews 13:8", category: "unchanging", book: "hebrews" }
];

// James - practical faith
const jamesVerses = [
  { text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds.", reference: "James 1:2", category: "joy", book: "james" },
  { text: "Because you know that the testing of your faith produces perseverance.", reference: "James 1:3", category: "testing", book: "james" },
  { text: "Let perseverance finish its work so that you may be mature and complete, not lacking anything.", reference: "James 1:4", category: "maturity", book: "james" },
  { text: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.", reference: "James 1:5", category: "wisdom", book: "james" },
  { text: "But when you ask, you must believe and not doubt, because the one who doubts is like a wave of the sea, blown and tossed by the wind.", reference: "James 1:6", category: "doubt", book: "james" },
  { text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life that the Lord has promised to those who love him.", reference: "James 1:12", category: "perseverance", book: "james" },
  { text: "When tempted, no one should say, 'God is tempting me.' For God cannot be tempted by evil, nor does he tempt anyone.", reference: "James 1:13", category: "temptation", book: "james" },
  { text: "But each person is tempted when they are dragged away by their own evil desire and enticed.", reference: "James 1:14", category: "desire", book: "james" },
  { text: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows.", reference: "James 1:17", category: "gifts", book: "james" },
  { text: "He chose to give us birth through the word of truth, that we might be a kind of firstfruits of all he created.", reference: "James 1:18", category: "birth", book: "james" },
  { text: "My dear brothers and sisters, take note of this: Everyone should be quick to listen, slow to speak and slow to become angry.", reference: "James 1:19", category: "listening", book: "james" },
  { text: "Because human anger does not produce the righteousness that God desires.", reference: "James 1:20", category: "anger", book: "james" },
  { text: "Therefore, get rid of all moral filth and the evil that is so prevalent and humbly accept the word planted in you, which can save you.", reference: "James 1:21", category: "humility", book: "james" },
  { text: "Do not merely listen to the word, and so deceive yourselves. Do what it says.", reference: "James 1:22", category: "action", book: "james" },
  { text: "Anyone who listens to the word but does not do what it says is like someone who looks at his face in a mirror.", reference: "James 1:23", category: "reflection", book: "james" },
  { text: "And, after looking at himself, goes away and immediately forgets what he looks like.", reference: "James 1:24", category: "forgetfulness", book: "james" },
  { text: "But whoever looks intently into the perfect law that gives freedom, and continues in it—not forgetting what they have heard, but doing it—they will be blessed in what they do.", reference: "James 1:25", category: "blessing", book: "james" },
  { text: "Religion that God our Father accepts as pure and faultless is this: to look after orphans and widows in their distress and to keep oneself from being polluted by the world.", reference: "James 1:27", category: "religion", book: "james" },
  { text: "What good is it, my brothers and sisters, if someone claims to have faith but has no deeds? Can such faith save them?", reference: "James 2:14", category: "deeds", book: "james" },
  { text: "In the same way, faith by itself, if it is not accompanied by action, is dead.", reference: "James 2:17", category: "action", book: "james" }
];

// 1 Peter - hope in suffering
const peterVerses = [
  { text: "Praise be to the God and Father of our Lord Jesus Christ! In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead.", reference: "1 Peter 1:3", category: "hope", book: "1peter" },
  { text: "And into an inheritance that can never perish, spoil or fade. This inheritance is kept in heaven for you.", reference: "1 Peter 1:4", category: "inheritance", book: "1peter" },
  { text: "Who through faith are shielded by God's power until the coming of the salvation that is ready to be revealed in the last time.", reference: "1 Peter 1:5", category: "protection", book: "1peter" },
  { text: "In all this you greatly rejoice, though now for a little while you may have had to suffer grief in all kinds of trials.", reference: "1 Peter 1:6", category: "rejoicing", book: "1peter" },
  { text: "These have come so that the proven genuineness of your faith—of greater worth than gold, which perishes even though refined by fire—may result in praise, glory and honor when Jesus Christ is revealed.", reference: "1 Peter 1:7", category: "refinement", book: "1peter" },
  { text: "Though you have not seen him, you love him; and even though you do not see him now, you believe in him and are filled with an inexpressible and glorious joy.", reference: "1 Peter 1:8", category: "love", book: "1peter" },
  { text: "For you are receiving the end result of your faith, the salvation of your souls.", reference: "1 Peter 1:9", category: "salvation", book: "1peter" },
  { text: "Therefore, with minds that are alert and fully sober, set your hope on the grace to be brought to you when Jesus Christ is revealed at his coming.", reference: "1 Peter 1:13", category: "alertness", book: "1peter" },
  { text: "As obedient children, do not conform to the evil desires you had when you lived in ignorance.", reference: "1 Peter 1:14", category: "obedience", book: "1peter" },
  { text: "But just as he who called you is holy, so be holy in all you do.", reference: "1 Peter 1:15", category: "holiness", book: "1peter" },
  { text: "For it is written: 'Be holy, because I am holy.'", reference: "1 Peter 1:16", category: "holiness", book: "1peter" },
  { text: "Since you call on a Father who judges each person's work impartially, live out your time as foreigners here in reverent fear.", reference: "1 Peter 1:17", category: "reverence", book: "1peter" },
  { text: "For you know that it was not with perishable things such as silver or gold that you were redeemed from the empty way of life handed down to you from your ancestors.", reference: "1 Peter 1:18", category: "redemption", book: "1peter" },
  { text: "But with the precious blood of Christ, a lamb without blemish or defect.", reference: "1 Peter 1:19", category: "sacrifice", book: "1peter" },
  { text: "He was chosen before the creation of the world, but was revealed in these last times for your sake.", reference: "1 Peter 1:20", category: "chosen", book: "1peter" },
  { text: "Through him you believe in God, who raised him from the dead and glorified him, and so your faith and hope are in God.", reference: "1 Peter 1:21", category: "faith", book: "1peter" },
  { text: "Now that you have purified yourselves by obeying the truth so that you have sincere love for each other, love one another deeply, from the heart.", reference: "1 Peter 1:22", category: "love", book: "1peter" },
  { text: "For you have been born again, not of perishable seed, but of imperishable, through the living and enduring word of God.", reference: "1 Peter 1:23", category: "rebirth", book: "1peter" },
  { text: "All people are like grass, and all their glory is like the flowers of the field; the grass withers and the flowers fall, but the word of the Lord endures forever.", reference: "1 Peter 1:24-25", category: "endurance", book: "1peter" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7", category: "anxiety", book: "1peter" }
];

// Combine all new verses
const allNewVerses = [
  ...minorProphets,
  ...jobVerses,
  ...ecclesiastesVerses,
  ...hebrewsVerses,
  ...jamesVerses,
  ...peterVerses
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
  console.log(`Cycle length: ${Math.floor(verses.length / 365)} years and ${verses.length % 365} days`);
} else {
  console.log(`Still need ${1000 - verses.length} more verses to reach 1,000`);
}
