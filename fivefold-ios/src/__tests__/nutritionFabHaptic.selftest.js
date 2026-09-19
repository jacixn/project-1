// The Fuel screen's add buttons should feel like the rest of the app.
// Run: node src/__tests__/nutritionFabHaptic.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const screen = read('screens/NutritionScreen.js');

ok(/const openAddFood = \(\) => \{[\s\S]{0,240}hapticFeedback\.light\(\);/.test(screen),
  'opening the add sheet taps back');
ok(/import \{ hapticFeedback \} from '\.\.\/utils\/haptics'/.test(screen), 'from the shared haptics helper');

// The floating button is the one that was reported; the other two adds route
// through the same handler, so all three feel the same.
const callers = (screen.match(/onPress=\{openAddFood\}/g) || []).length;
ok(callers === 3, `every add button goes through that handler (${callers})`);
ok(/style=\{\[styles\.fab, \{ backgroundColor: theme\.primary/.test(screen),
  'including the floating button at the bottom right');

// Same weight as the equivalent button elsewhere in the app.
const myWeek = read('screens/MyWeekScreen.js');
ok(/const openAdd = async \(\) => \{\s*\n\s*hapticFeedback\.light\(\);/.test(myWeek),
  "and it matches My Week's add button, which is light");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll Fuel add-button haptic checks passed');
