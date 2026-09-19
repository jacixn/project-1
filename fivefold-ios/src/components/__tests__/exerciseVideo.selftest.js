// Watching an exercise inside Biblely: wiring invariants across the player,
// the sheet, the lookup and the two places that used to open YouTube.
// Run: node src/components/__tests__/exerciseVideo.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const player = read('components/ExerciseVideoPlayer.js');
const sheet = read('screens/ExerciseVideoScreen.js');
const nav = read('navigation/RootNavigator.js');
const service = read('services/exerciseVideoService.js');
const exercises = read('components/ExercisesModal.js');
const workout = read('components/WorkoutModal.js');
const pkg = JSON.parse(read('../package.json'));

// ── The two places that used to leave the app ────────────────────────
for (const [name, src] of [['ExercisesModal', exercises], ['WorkoutModal', workout]]) {
  ok(!/Linking\.openURL\(`https:\/\/www\.youtube\.com\/results/.test(src), `${name} no longer throws the user out to the YouTube app`);
  ok(/navigate\('ExerciseVideo', \{ exerciseName/.test(src), `${name} opens the in-app tutorial screen instead`);
}
ok(/const navigation = useNavigation\(\);[\s\S]{0,200}if \(!exercise\) return null;/.test(exercises),
  'ExerciseDetailScreen calls its hooks above the early return, so hook order cannot change between renders');

// The sheet drags like every other sheet in the app because it is the same
// kind of thing: a native-stack modal screen, not a React Native <Modal>.
ok(/name="ExerciseVideo"[\s\S]{0,200}presentation: 'modal'/.test(nav), 'the tutorial screen is registered as a native pull-to-dismiss modal');
ok(!/presentationStyle=|from 'react-native'[\s\S]{0,400}\bModal\b/.test(sheet), 'it is not a hand-rolled React Native Modal');
ok(/SheetHeader/.test(sheet), 'and it uses the shared sheet header, like the others');
ok(/useIsFocused\(\)/.test(sheet) && /playing=\{isFocused\}/.test(sheet), 'leaving the screen pauses the video');

// ── The origin, which is the whole ball game ─────────────────────────
const origin = (player.match(/export const EMBED_ORIGIN = '([^']+)';/) || [])[1];
ok(!!origin && !/youtube\.com/i.test(origin), `the embedding origin is a domain Biblely owns, never YouTube itself (${origin})`);
ok(/biblely/i.test(origin || ''), 'and it is Biblely\'s own domain, not another app\'s');
ok(/source=\{\{ html, baseUrl: EMBED_ORIGIN \}\}/.test(player), 'the web view loads the page under that origin');

// ── Autoplay, which is the point ─────────────────────────────────────
ok(/autoplay: 1/.test(player) && /playsinline: 1/.test(player) && /e\.target\.playVideo\(\)/.test(player),
  'the tutorial starts itself: autoplay player vars plus playVideo on ready, no tap on the YouTube button');
ok(/mediaPlaybackRequiresUserAction=\{false\}/.test(player) && /allowsInlineMediaPlayback/.test(player),
  'iOS lets the page start playback without a gesture, inline rather than full screen');
ok(/playsInSilentModeIOS: true/.test(player), 'the audio session plays with the ring switch off');
ok(/injectJavaScript/.test(player) && !/webRef\.current\?\.postMessage/.test(player),
  'play and pause go through injectJavaScript, not postMessage (which dispatches on document, where a window listener never sees it)');

// ── The size of YouTube's own controls ───────────────────────────────
ok(/width:200%;height:200%/.test(player) && /transform:scale\(0\.5\)/.test(player),
  'the embed chrome is halved by laying the iframe out at double size and scaling it back');
ok(!/width:200%;height:200%[\s\S]{0,200}transform:scale\((?!0\.5\))/.test(player),
  'the layout size and the scale stay reciprocal, so the video is neither cropped nor letterboxed');

// ── Staying in the app ───────────────────────────────────────────────
ok(/onShouldStartLoadWithRequest/.test(player) && /navigationType === 'click'\) return false/.test(player) && /onOpenWindow=\{\(\) => \{\}\}/.test(player),
  'a tap on the title, the channel or Watch on YouTube cannot hand the app off');

// ── Failure handling ─────────────────────────────────────────────────
ok(/const CONFIG_ERRORS = \[152, 153\]/.test(player), 'a page fault is told apart from a video that will not embed');
ok(/READY_DEADLINE_MS/.test(player) && /PLAY_DEADLINE_MS/.test(player) && /onContentProcessDidTerminate=/.test(player),
  'a page that never loads, never starts, or dies is reported rather than left spinning');
ok(/onUnplayable = useCallback\(\(reason, fault\)/.test(sheet) && /setRefused/.test(sheet),
  'the sheet drops a refused video and moves to the next candidate');
ok(/playerFault/.test(sheet) && /setPlayingId\(null\)/.test(sheet),
  'a page fault stops the list instead of walking every candidate to the same dead end');
ok(/Open on YouTube/.test(sheet), 'YouTube is still one tap away when nothing can play here');

// ── The lookup ───────────────────────────────────────────────────────
ok(/CACHE_TTL_MS/.test(service) && /inflight/.test(service), 'one lookup per exercise, cached, and never two at once');
ok(/rankExerciseVideos\(parseSearchResults\(/.test(service), 'results are ranked before they are used');
ok(/cached\?\.videos \|\| \[\]/.test(service), 'a failed lookup falls back to the stored answer rather than to nothing');
ok(/'User-Agent': SEARCH_UA/.test(service) && /Cookie: SEARCH_COOKIE/.test(service),
  'the request carries the desktop agent and consent cookie the results page requires');

// ── House style ──────────────────────────────────────────────────────
const all = player + sheet + service;
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(all), 'no emojis');
ok(!/—/.test(all), 'no em dashes');
ok(/cleanTitle/.test(sheet), 'video titles are stripped of emoji before they reach the UI');
ok(/borderRadius: 999/.test(player) === true && !/borderRadius: 40|width: 44,\s*height: 44,\s*borderRadius: 22/.test(sheet),
  'no circular icon backings in the sheet');

// ── Deps ─────────────────────────────────────────────────────────────
ok(!!pkg.dependencies['react-native-webview'], 'the WebView dependency is declared');
ok(/react-native-webview \(13\./.test(read('../ios/Podfile.lock')), 'and its pod is in the lockfile');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll exercise video wiring checks passed');
