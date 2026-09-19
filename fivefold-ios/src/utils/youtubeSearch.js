// Turning an exercise name into watchable videos. Pure: no React, no network.
//
// The exercise catalog has 994 entries and not one of them carries a video, so
// "show me how this is done" has to start from the name. YouTube's own search
// page carries its results as a JSON blob (ytInitialData) inside the HTML, and
// reading that needs no API key and no account. The alternative, the YouTube
// Data API, costs 100 quota units per search against a 10,000 a day allowance
// and would need a key per install.
//
// Several candidates are returned rather than one, because a video's owner can
// turn embedding off and the player only finds that out by trying. The sheet
// walks the list until one plays.

// A desktop browser's user agent and a consent cookie are both required. A
// phone user agent is redirected to the mobile site, which ships no
// ytInitialData at all, and without the consent cookie the request is bounced
// to the consent wall. Both verified by request.
export const SEARCH_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const SEARCH_COOKIE = 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMzE5LjA2X3AwGgJlbiADGgYIgOapsAY';

// What to ask for. "form" and "how to" bias the results towards instruction
// rather than workout montages and gym vlogs.
export const exerciseQuery = (name) => `${String(name || '').trim()} exercise how to proper form`;

export const searchUrl = (query) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

// The results blob sits in a script tag as `var ytInitialData = {...};`.
// Scanning braces is more robust than a regex here because the JSON contains
// plenty of braces of its own, and string literals contain plenty of both.
const extractInitialData = (html) => {
  if (typeof html !== 'string') return null;
  const marker = html.indexOf('ytInitialData');
  if (marker < 0) return null;
  const start = html.indexOf('{', marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
};

const firstRun = (obj) => {
  if (!obj) return '';
  if (typeof obj.simpleText === 'string') return obj.simpleText;
  if (Array.isArray(obj.runs)) return obj.runs.map((r) => (r && r.text) || '').join('');
  return '';
};

// "12:34" or "1:02:03" -> seconds. Anything unparseable is null rather than 0,
// so a missing length never reads as a zero length video.
export const durationToSeconds = (text) => {
  if (typeof text !== 'string') return null;
  const parts = text.trim().split(':');
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
};

const collectRenderers = (node, out, depth = 0) => {
  if (!node || depth > 24 || out.length > 200) return;
  if (Array.isArray(node)) {
    for (const item of node) collectRenderers(item, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  if (node.videoRenderer && node.videoRenderer.videoId) out.push(node.videoRenderer);
  for (const key of Object.keys(node)) {
    if (key === 'videoRenderer') continue;
    collectRenderers(node[key], out, depth + 1);
  }
};

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// A live stream has no useful "how to" value and never ends, and a Short is
// vertical, so it would letterbox into two thin bars in a 16:9 player.
const isLive = (r) => {
  const badges = (r.badges || []).map((b) => firstRun(b?.metadataBadgeRenderer?.label ? { simpleText: b.metadataBadgeRenderer.label } : null));
  if (badges.some((b) => /live/i.test(b))) return true;
  return !!r.lengthText === false && !!r.publishedTimeText === false;
};

export const parseSearchResults = (html, limit = 8) => {
  const data = extractInitialData(html);
  const out = [];
  const seen = new Set();

  if (data) {
    const renderers = [];
    collectRenderers(data, renderers);
    for (const r of renderers) {
      const id = r.videoId;
      if (!VIDEO_ID.test(id || '') || seen.has(id)) continue;
      if (isLive(r)) continue;
      seen.add(id);
      out.push({
        id,
        title: firstRun(r.title) || 'Tutorial',
        channel: firstRun(r.ownerText) || firstRun(r.longBylineText) || '',
        seconds: durationToSeconds(firstRun(r.lengthText)),
      });
      if (out.length >= limit) return out;
    }
  }

  // The blob is YouTube's private shape and can change without notice. Ids in
  // page order are a poorer answer than titled results, but they still play,
  // so falling back to them beats showing nothing.
  if (!out.length) {
    const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
    let m;
    while ((m = re.exec(html || '')) !== null) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      out.push({ id: m[1], title: 'Tutorial', channel: '', seconds: null });
      if (out.length >= limit) break;
    }
  }

  return out;
};

// YouTube's own ordering mixes five second clips and vertical Shorts in with
// real instruction. Someone who taps "How to do this" wants to be shown the
// movement, so length and wording decide the order, not the search rank.
const HELPFUL = /(how to|proper form|correct form|technique|tutorial|step by step|guide|demonstration|form tips?|beginners?)/i;
const SHORT_FORM = /(#shorts?\b|\bshorts\b)/i;

export const scoreExerciseVideo = (v, rank = 0) => {
  let s = 0;
  const secs = v && typeof v.seconds === 'number' ? v.seconds : null;
  if (secs != null) {
    if (secs >= 45 && secs <= 900) s += 3;        // a real demonstration
    else if (secs >= 20 && secs < 45) s += 1;     // short but usually watchable
    else if (secs < 20) s -= 2;                   // a clip, not a lesson
    if (secs > 1800) s -= 2;                      // a full workout video
  }
  const text = `${(v && v.title) || ''} ${(v && v.channel) || ''}`;
  if (HELPFUL.test(text)) s += 2;
  if (SHORT_FORM.test(text)) s -= 3;
  // Search rank still breaks ties: YouTube knows what people watch.
  return s - rank * 0.01;
};

export const rankExerciseVideos = (results = []) =>
  (results || [])
    .filter(Boolean)
    .map((v, i) => ({ v, s: scoreExerciseVideo(v, i), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);

// Video titles are other people's text and routinely carry emoji and shouting
// punctuation. Biblely does not show emoji, so they are stripped for display
// while the video itself is untouched.
export const cleanTitle = (title) =>
  String(title || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Tutorial';
