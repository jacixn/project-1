#!/usr/bin/env node

/**
 * Generate pre-recorded TTS audio for all Bible Timeline stories.
 * Uses Google Cloud TTS (Studio Female voice) to produce MP3 files
 * that are then hosted on GitHub for zero-cost playback in the app.
 *
 * Usage:
 *   node scripts/generate-story-audio.js
 *
 * Resumes automatically — skips stories whose MP3 already exists.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────
const API_KEY = 'AIzaSyA_nXeYyXNLvRjfmF5MuuWbX3p1l3nGwQo';
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
const TIMELINE_URL = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/bible-timeline.json';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'bible-timeline-audio');

const VOICE = {
  languageCode: 'en-US',
  name: 'en-US-Studio-O',
  ssmlGender: 'FEMALE',
};
const AUDIO_CONFIG = {
  audioEncoding: 'MP3',
  speakingRate: 0.95,
  pitch: 0,
};

// ── Helpers ─────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API ${res.statusCode}: ${data}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching timeline data...');
  const timeline = await fetchJSON(TIMELINE_URL);

  const eras = timeline.timelineData || timeline.eras || timeline;
  if (!Array.isArray(eras)) {
    console.error('Unexpected data shape — expected { timelineData: [...] }');
    process.exit(1);
  }
  console.log(`Found ${eras.length} eras\n`);

  let totalStories = 0;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const era of eras) {
    const eraId = era.id;
    const eraDir = path.join(OUTPUT_DIR, eraId);
    fs.mkdirSync(eraDir, { recursive: true });

    const stories = era.stories || [];
    for (let i = 0; i < stories.length; i++) {
      totalStories++;
      const story = stories[i];
      const outFile = path.join(eraDir, `${i}.mp3`);

      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
        skipped++;
        continue;
      }

      const text = `${story.title}. When: ${story.when}. Bible reference: ${story.bibleStory}. ${story.story}`;
      console.log(`[${totalStories}] Generating: ${eraId}/${i}.mp3  "${story.title}" (${text.length} chars)`);

      try {
        const result = await postJSON(API_URL, {
          input: { text },
          voice: VOICE,
          audioConfig: AUDIO_CONFIG,
        });

        if (!result.audioContent) {
          console.error(`  ✗ No audioContent returned`);
          failed++;
          continue;
        }

        fs.writeFileSync(outFile, Buffer.from(result.audioContent, 'base64'));
        const sizeKB = Math.round(fs.statSync(outFile).size / 1024);
        console.log(`  ✓ Saved ${sizeKB} KB`);
        generated++;

        // Small delay to avoid rate-limiting
        await sleep(250);
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n══════════════════════════════════════');
  console.log(`Total stories : ${totalStories}`);
  console.log(`Generated     : ${generated}`);
  console.log(`Skipped (exist): ${skipped}`);
  console.log(`Failed        : ${failed}`);
  console.log(`Output dir    : ${OUTPUT_DIR}`);
  console.log('══════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
