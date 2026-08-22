// Collapsing search bars run on the UI thread everywhere, with fixed spacers.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const hook = read('hooks/useCollapsingSearch.js');
const files = {
  'screens/SavedVersesScreen.js': 'Reanimated.ScrollView',
  'screens/ProfileTab.js': 'Reanimated.ScrollView',
  'components/AudioLearning.js': 'Reanimated.ScrollView',
  'components/AchievementsModal.js': 'Reanimated.FlatList',
  'components/ThematicGuides.js': 'Reanimated.FlatList',
  'components/BibleFastFacts.js': 'Reanimated.FlatList',
};
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
check(/useAnimatedScrollHandler/.test(hook) && /withTiming\(next/.test(hook) && /height: progress\.value \* height/.test(hook), 'hook: scroll handler + tween are worklets; only height/opacity of the bar animate');
for (const [f, list] of Object.entries(files)) {
  const s = read(f);
  check(s.includes("from '../hooks/useCollapsingSearch'") && s.includes(`<${list}`), `${f}: uses the hook with ${list}`);
  check(!/searchBarAnim|savedVersesSearchAnim|searchBarVisible|setHeaderExpanded/.test(s), `${f}: old JS-driven collapse removed`);
  check(!/height: \w+\.interpolate\(\{\s*inputRange: \[0, 1\],\s*outputRange: \[Platform/.test(s), `${f}: no animated spacer inside the scroll content`);
  check(/searchStyle\]\}>/.test(s), `${f}: search wrapper driven by searchStyle`);
}
check(/chipsStyle/.test(read('components/AchievementsModal.js')) && /collapseProgress\.value \* 44/.test(read('components/AchievementsModal.js')), 'Achievements chips ride the same progress');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
