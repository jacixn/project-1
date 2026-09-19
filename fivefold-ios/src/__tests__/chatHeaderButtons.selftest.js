// Guide and Coach share one header. Its buttons should be the same tile the
// rest of the app uses, not circles.
// Run: node src/__tests__/chatHeaderButtons.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const chat = read('components/AiBibleChat.js');
const myWeek = read('screens/MyWeekScreen.js');
const fuel = read('screens/NutritionScreen.js');

// What the rest of the app uses.
ok(/headerBtn: \{ width: 44, height: 44, borderRadius: 14/.test(myWeek), 'My Week uses a 44 point tile with radius 14');
ok(/width: 44,\s*\n\s*height: 44,\s*\n\s*borderRadius: 14,/.test(fuel), 'Fuel uses the same tile');
ok(/<MaterialIcons name="arrow-back" size=\{22\} color=\{theme\.text\} \/>/.test(myWeek), 'and a plain back arrow in the text colour');

// The chat header now matches.
ok(!/borderRadius: 20,\s*\n\s*backgroundColor: isDark \? 'rgba\(255,255,255,0\.1\)'/.test(chat),
  'the chat back button is no longer a circle');
ok(!/name="arrow-back-ios-new"/.test(chat),
  'and no longer a chevron: the others use a plain back arrow');
ok(!/color=\{theme\.primary\} \/>\s*\n\s*<\/TouchableOpacity>/.test(chat),
  'nor the accent colour, which made it read as a link rather than a control');

const tiles = (chat.match(/borderRadius: 14,/g) || []).length;
ok(tiles >= 3, `every header button in the chat is a tile now (${tiles} of them: back, options, and the history sheet's back)`);
ok((chat.match(/name="arrow-back" size=\{22\} color=\{theme\.text\}/g) || []).length === 2,
  'both back buttons in the file use the same arrow as the others');

// Guide and Coach are the same component, so one change covers both.
ok(/chatName/.test(chat), 'Guide and Coach are one header, so both were fixed at once');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll chat header button checks passed');
