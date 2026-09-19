// Run: node src/utils/__tests__/youtubeSearch.selftest.js
//      node src/utils/__tests__/youtubeSearch.selftest.js --live   (hits YouTube)
//
// The parser reads YouTube's own private page data, which can change without
// notice. The offline checks pin the shape we expect and, just as importantly,
// pin the fallback for when that shape is gone. The live check is the one that
// notices the day it actually changes.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'youtubeSearch.js'), 'utf8').replace(/^export /gm, '');
const m = new Function(`${src}\nreturn { SEARCH_UA, SEARCH_COOKIE, exerciseQuery, searchUrl, durationToSeconds, parseSearchResults, scoreExerciseVideo, rankExerciseVideos, cleanTitle };`)();

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

// ── A page shaped like the real one ──────────────────────────────────
const vid = (id, title, channel, length) => ({
  videoRenderer: {
    videoId: id,
    title: { runs: [{ text: title }] },
    ownerText: { runs: [{ text: channel }] },
    lengthText: { simpleText: length },
    publishedTimeText: { simpleText: '1 year ago' },
  },
});
const page = (items) => `<!DOCTYPE html><html><body><script>var ytInitialData = ${JSON.stringify({
  contents: { twoColumnSearchResultsRenderer: { primaryContents: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: items } }] } } } },
})};</script></body></html>`;

const html = page([
  vid('aaaaaaaaaaa', 'Quick clip #shorts', 'Clip Farm', '0:08'),
  vid('bbbbbbbbbbb', 'How to Bench Press With Perfect Technique', 'Jeff Nippard', '4:11'),
  { reelItemRenderer: { videoId: 'ccccccccccc' } },
  vid('ddddddddddd', 'Full 90 minute chest workout', 'Gym Vlog', '1:30:00'),
  vid('bbbbbbbbbbb', 'duplicate that must not appear twice', 'Someone', '2:00'),
]);

const parsed = m.parseSearchResults(html, 8);
ok(parsed.length === 3, `only real videos are taken, deduped (${parsed.length})`);
ok(!parsed.some((v) => v.id === 'ccccccccccc'), 'a Short is skipped: it is vertical and would letterbox to two thin bars');
ok(parsed[1].title === 'How to Bench Press With Perfect Technique' && parsed[1].channel === 'Jeff Nippard' && parsed[1].seconds === 251,
  'title, channel and length all come through');
ok(m.parseSearchResults('<html>nothing here</html>').length === 0, 'a page with no data yields nothing rather than throwing');

// The blob is YouTube's shape and will change one day. Ids alone still play.
const rawOnly = '<html>"videoId":"eeeeeeeeeee" junk "videoId":"fffffffffff" "videoId":"eeeeeeeeeee"</html>';
const fallback = m.parseSearchResults(rawOnly, 8);
ok(fallback.length === 2 && fallback[0].id === 'eeeeeeeeeee' && fallback[0].title === 'Tutorial',
  'when the shape is gone, ids in page order still give playable videos');

// ── Ranking: a five second clip must not beat a real tutorial ─────────
const ranked = m.rankExerciseVideos(parsed);
ok(ranked[0].id === 'bbbbbbbbbbb', 'the instructional video of a sensible length ranks first');
ok(ranked[ranked.length - 1].id === 'aaaaaaaaaaa', 'the eight second clip ranks last');
ok(m.scoreExerciseVideo({ title: 'How to squat', seconds: 120 }) > m.scoreExerciseVideo({ title: 'squat', seconds: 120 }),
  'wording that promises instruction is worth something');
ok(m.scoreExerciseVideo({ title: 'squat', seconds: 300 }) > m.scoreExerciseVideo({ title: 'squat', seconds: 3600 }),
  'a demonstration beats a full length workout video');
ok(m.rankExerciseVideos([]).length === 0 && m.rankExerciseVideos(null).length === 0, 'ranking nothing is not a crash');
ok(m.rankExerciseVideos([{ id: 'a', seconds: 60 }, { id: 'b', seconds: 60 }]).map((v) => v.id).join(',') === 'a,b',
  'equal scores keep YouTube\'s own order');

// ── Durations and titles ─────────────────────────────────────────────
ok(m.durationToSeconds('12:34') === 754 && m.durationToSeconds('1:02:03') === 3723, 'lengths parse');
ok(m.durationToSeconds('LIVE') === null && m.durationToSeconds(null) === null, 'an unreadable length is null, never zero');
ok(m.cleanTitle('How to Use the Ab Roller') === 'How to Use the Ab Roller', 'a plain title is left alone');
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(m.cleanTitle('How to Use the Ab Roller')), 'no emoji survive into the UI');
ok(m.cleanTitle('') === 'Tutorial', 'an empty title still reads as something');

// ── The request itself ───────────────────────────────────────────────
ok(/Macintosh/.test(m.SEARCH_UA), 'a desktop user agent: a phone one is redirected to a mobile page that carries no results');
ok(/^SOCS=/.test(m.SEARCH_COOKIE), 'a consent cookie: without it the request lands on the consent wall');
ok(m.exerciseQuery('Ab Wheel').startsWith('Ab Wheel') && /how to/i.test(m.exerciseQuery('Ab Wheel')), 'the query asks for instruction');
ok(m.searchUrl('a b&c').includes('a%20b%26c') || m.searchUrl('a b&c').includes('a+b%26c'), 'the query is encoded');

// ── Live ─────────────────────────────────────────────────────────────
const live = async () => {
  console.log('\n  live: asking YouTube for a real exercise');
  const res = await fetch(m.searchUrl(m.exerciseQuery('Barbell Bench Press')), {
    headers: { 'User-Agent': m.SEARCH_UA, 'Accept-Language': 'en-GB,en;q=0.9', Cookie: m.SEARCH_COOKIE },
  });
  ok(res.ok, `the search page answers (${res.status})`);
  const body = await res.text();
  const results = m.rankExerciseVideos(m.parseSearchResults(body, 8));
  ok(results.length >= 4, `enough candidates came back to survive a refusal or two (${results.length})`);
  ok(results.every((v) => /^[A-Za-z0-9_-]{11}$/.test(v.id)), 'every id is a real video id');
  ok(results.some((v) => v.seconds > 0), 'lengths are being read, so the shape has not changed');
  ok(results.filter((v) => v.title !== 'Tutorial').length >= 4, 'titles are being read, so this is not the fallback path');
  results.slice(0, 3).forEach((v) => console.log(`       ${v.id}  ${String(v.seconds ?? '?')}s  ${v.channel}  ${m.cleanTitle(v.title).slice(0, 48)}`));
};

(async () => {
  if (process.argv.includes('--live')) await live();
  if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
  console.log('\nAll youtubeSearch selftests passed');
})();
