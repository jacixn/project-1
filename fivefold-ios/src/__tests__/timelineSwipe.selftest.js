// The Bible timeline's story cards live inside a native modal sheet, where a
// JS PanResponder loses the touch to the sheet's own dismiss gesture.
// Run: node src/__tests__/timelineSwipe.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const t = read('components/BibleTimeline.js');
const nav = read('navigation/RootNavigator.js');

// Why a PanResponder could never be reliable here.
ok(/name="BibleTimeline"[\s\S]{0,120}presentation: 'modal'/.test(nav),
  'the timeline is a native modal sheet, which has a dismiss gesture of its own');
ok(!/cardPanResponder/.test(t), 'the card no longer uses a JS PanResponder, which that gesture was cancelling');
ok(/import \{ Gesture, GestureDetector[^}]*\} from 'react-native-gesture-handler'/.test(t),
  'it uses a real gesture handler, which negotiates with the native one');
ok(/<GestureDetector key=\{actualIndex\} gesture=\{cardGesture\}>/.test(t), 'attached to the card on top');
ok(/pointerEvents=\{isTop \? 'auto' : 'none'\}/.test(t), 'and the card behind cannot steal a touch');
// Biblely has no app-level gesture root; each screen supplies its own.
ok(/<GestureHandlerRootView style=\{styles\.stackContainer\}>/.test(t),
  'the stack provides a gesture root, without which the pan would silently never fire');
ok(/GestureHandlerRootView/.test(read('screens/MyWeekScreen.js')),
  'which is the same pattern My Week uses, since the app root has none');

// Swiping and reading must not fight.
ok(/\.activeOffsetX\(\[-12, 12\]\)/.test(t), 'the swipe is claimed only once the drag is clearly sideways');
ok(/\.failOffsetY\(\[-20, 20\]\)/.test(t), "and given up the moment it is clearly vertical, so the story still scrolls");
ok(/\.runOnJS\(true\)/.test(t), 'the handlers run where the state they touch lives');

// A quick flick should count.
ok(/const FLICK_VX = 0\.35/.test(t) && /flickedLeft/.test(t) && /flickedRight/.test(t),
  'a short fast flick advances, rather than being ignored for not travelling far enough');
ok(/vx: e\.velocityX \/ 1000/.test(t), 'velocity is passed through in the units the threshold expects');

// The look of the next card.
ok(/cardsToShow = stories\.slice\(currentCardIndex, currentCardIndex \+ 2\)/.test(t),
  'two cards, since the third was never visible');
ok(!/\{ translateY: i \* 10 \}/.test(t),
  'the card behind is no longer pushed down, which is what made the edges look misaligned');
ok(/outputRange: \[1, 0\.94, 1\]/.test(t) && /outputRange: \[1, 0\.55, 1\]/.test(t),
  'it sits squarely behind and grows into place as the top card leaves');
ok(/outputRange: \['-4deg', '0deg', '4deg'\]/.test(t), 'and the top card tilts less on its way out');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll timeline swipe checks passed');
