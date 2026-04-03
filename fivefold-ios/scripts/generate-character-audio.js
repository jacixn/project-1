#!/usr/bin/env node
/**
 * Batch-generate TTS audio for all Bible characters missing MP3 files.
 * Uses Google Cloud TTS Studio Female voice, saves to audio-files/bible-characters/.
 *
 * Usage:
 *   node scripts/generate-character-audio.js            # generate all missing
 *   node scripts/generate-character-audio.js --dry-run   # preview only
 *   node scripts/generate-character-audio.js --limit 10  # first 10 only
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_PATH = path.join(__dirname, '../bible-characters.json');
const AUDIO_DIR = path.join(__dirname, '../../audio-files/bible-characters');
const TTS_API_KEY = 'AIzaSyA_nXeYyXNLvRjfmF5MuuWbX3p1l3nGwQo';
const TTS_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${TTS_API_KEY}`;

function toSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function synthesize(text) {
  const body = JSON.stringify({
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Studio-O',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.95,
      pitch: 0,
    },
  });

  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`TTS API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.audioContent) throw new Error('No audioContent in response');
  return Buffer.from(data.audioContent, 'base64');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const existing = new Set(
    fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', ''))
  );

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const characters = data.characters;

  const missing = [];
  Object.entries(characters).forEach(([name, c]) => {
    const slug = toSlug(name);
    if (!existing.has(slug) && c.story && c.story.trim().length > 0) {
      missing.push({ name, slug, story: c.story });
    }
  });

  console.log(`Existing audio: ${existing.size} | Missing: ${missing.length}`);

  if (dryRun) {
    console.log('\n-- DRY RUN -- Would generate audio for:');
    missing.slice(0, limit).forEach((m, i) => console.log(`  ${i + 1}. ${m.name} (${m.story.length} chars)`));
    return;
  }

  const toProcess = missing.slice(0, limit);
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const { name, slug, story } = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;
    const outPath = path.join(AUDIO_DIR, `${slug}.mp3`);

    try {
      process.stdout.write(`${progress} ${name} (${story.length} chars)...`);
      const audioBuffer = await synthesize(story);
      fs.writeFileSync(outPath, audioBuffer);
      generated++;
      const sizeKB = Math.round(audioBuffer.length / 1024);
      console.log(` ✓ ${sizeKB}KB`);
    } catch (err) {
      failed++;
      console.log(` ✗ ${err.message}`);
    }

    if (i < toProcess.length - 1) {
      await sleep(500);
    }
  }

  console.log(`\nDone! Generated: ${generated}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
