#!/usr/bin/env node
// Live test: does Biblely's exercise video page actually play a YouTube
// tutorial inside a real WKWebView, on its own, without a second tap?
//
//   node scripts/test-exercise-video.js            # the shipping page
//   node scripts/test-exercise-video.js --control  # also prove the bad origins fail
//
// Needs macOS with Xcode's Swift toolchain, and the network. It lifts the HTML
// straight out of src/components/ExerciseVideoPlayer.js, so it tests the page
// that ships rather than a copy that can drift.
//
// Why this exists: the page is handed to the web view as an HTML string with a
// base URL, and that base URL becomes the document's origin. YouTube answers
// IFrame API error 152 when that origin is www.youtube.com (it refuses to be
// embedded inside itself) and 153 when there is no origin at all. Nothing in
// the JavaScript looks wrong in either case, so only a real web view catches
// it. EyeCandy shipped that exact bug before this test existed.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const SOURCE = path.join(root, 'src', 'components', 'ExerciseVideoPlayer.js');
// A Jeff Nippard bench press tutorial: the kind of video the search returns.
const VIDEO_ID = process.env.EXERCISE_TEST_VIDEO || 'hWbUlkb5Ms4';
const TIMEOUT_S = 25;

let fails = 0;
const ok = (cond, msg) => { if (cond) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const src = fs.readFileSync(SOURCE, 'utf8');

const originMatch = src.match(/export const EMBED_ORIGIN = '([^']+)';/);
if (!originMatch) { console.error('EMBED_ORIGIN not found'); process.exit(1); }
const EMBED_ORIGIN = originMatch[1];

const graceMatch = src.match(/const UNMUTED_GRACE_MS = (\d+);/);
const UNMUTED_GRACE_MS = graceMatch ? Number(graceMatch[1]) : 2500;

const start = src.indexOf('const playerHtml = (videoId) => `');
const end = src.indexOf('</html>`;', start);
if (start < 0 || end < 0) { console.error('playerHtml template not found'); process.exit(1); }
// eslint-disable-next-line no-new-func
const playerHtml = new Function('UNMUTED_GRACE_MS', `${src.slice(start, end + '</html>`;'.length)}\nreturn playerHtml;`)(UNMUTED_GRACE_MS);

ok(/autoplay: 1/.test(playerHtml(VIDEO_ID)) && /playsinline: 1/.test(playerHtml(VIDEO_ID)), 'the page asks the player to start itself');
ok(!/youtube\.com/i.test(EMBED_ORIGIN), `the embedding origin is a domain Biblely owns, never YouTube (${EMBED_ORIGIN})`);
ok(/const CONFIG_ERRORS = \[152, 153\]/.test(src), 'a page fault is told apart from a video that will not embed');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exercise-probe-'));
const bin = path.join(tmp, 'youtubePageProbe');
try {
  execFileSync('swiftc', ['-O', '-o', bin, path.join(__dirname, 'youtubePageProbe.swift')], { stdio: 'pipe' });
} catch (e) {
  console.log('  SKIP could not build the WKWebView probe (needs macOS and Xcode):');
  console.log('       ' + String(e.stderr || e.message).trim().split('\n').slice(-3).join('\n       '));
  process.exit(fails ? 1 : 0);
}

const run = (baseUrl, videoId) => {
  const file = path.join(tmp, `p-${Buffer.from(String(videoId || VIDEO_ID)).toString('hex')}.html`);
  fs.writeFileSync(file, playerHtml(videoId || VIDEO_ID));
  const r = spawnSync(bin, [file, baseUrl, String(TIMEOUT_S)], { encoding: 'utf8', timeout: (TIMEOUT_S + 20) * 1000 });
  const events = [];
  for (const line of (r.stdout || '').split('\n')) {
    const mm = line.match(/^MSG (.*)$/);
    if (!mm) continue;
    try { events.push(JSON.parse(mm[1])); } catch { /* not ours */ }
  }
  return { events, kinds: events.map((e) => e.t) };
};

console.log(`\n  playing ${VIDEO_ID} from origin ${EMBED_ORIGIN} in a real WKWebView, up to ${TIMEOUT_S}s`);
const live = run(EMBED_ORIGIN);
const errors = live.events.filter((e) => e.t === 'error').map((e) => e.d);
ok(live.kinds.includes('ready'), 'the player reports itself ready');
ok(errors.length === 0, `YouTube raises no error${errors.length ? ` (got ${errors.join(', ')})` : ''}`);
ok(live.kinds.includes('playing') || live.kinds.includes('playingMuted'),
  'the tutorial starts playing on its own, with no tap on the YouTube play button');
ok(!live.kinds.includes('playingMuted'), 'and it starts with sound');

console.log('\n  a malformed video id must be reported, not swallowed');
const bad = run(EMBED_ORIGIN, 'not!!valid!!');
ok(bad.kinds.includes('error'), `the page reports an error for a malformed id (got ${bad.kinds.join(', ') || 'total silence'})`);

if (process.argv.includes('--control')) {
  console.log('\n  control: the two origins that fail, and how they differ');
  const denied = run('https://www.youtube.com');
  ok(denied.events.filter((e) => e.t === 'error').map((e) => e.d).includes(152),
    'www.youtube.com as the origin fails with IFrame error 152, identity refused');
  const nobase = run('about:blank');
  ok(nobase.events.filter((e) => e.t === 'error').map((e) => e.d).includes(153),
    'no base URL at all fails with IFrame error 153, identity missing');
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nExercise video page plays in a real WKWebView');
