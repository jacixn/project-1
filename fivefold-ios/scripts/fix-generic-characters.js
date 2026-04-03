#!/usr/bin/env node
/**
 * Batch-fix generic Bible character profiles in bible-characters.json.
 *
 * Detects placeholder entries and calls Deepseek to generate accurate,
 * scripture-based profiles, then writes results back to the JSON file.
 *
 * Usage:
 *   node scripts/fix-generic-characters.js            # fix all generic
 *   node scripts/fix-generic-characters.js --dry-run   # preview without writing
 *   node scripts/fix-generic-characters.js --limit 10  # process only first 10
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../bible-characters.json');
const API_URL = 'https://api.deepseek.com/chat/completions';
const PRIMARY_KEY = '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';
const FALLBACK_KEY = 'sk-84fd368e12bd447e953450c45a2f09f6';

const GENERIC_MARKERS = [
  'appears in the biblical narrative',
  'part of the rich tapestry of Scripture',
  'They lived in the world of the Bible',
  'Biblical Figure',
  'This figure is part of the',
  'Their role and significance are recorded',
];

function isGeneric(character) {
  const blob = [character.story || '', character.name || '', ...(character.themes || [])].join(' ');
  return GENERIC_MARKERS.some(m => blob.includes(m));
}

function buildPrompt(characterName) {
  return `You are a biblical scholar writing for a Bible study app. Generate an accurate, detailed profile for the Bible character "${characterName}".

CRITICAL RULES:
- Every fact must come from actual Scripture. Cite real books, chapters, and events.
- The story must describe SPECIFIC events this character was involved in, with real details from the text.
- Themes must reference actual biblical events and teachings related to this character.
- Verses must be real references where this character appears or is mentioned.
- If the character is a group (e.g. "Pharisees"), describe their role, beliefs, and key interactions with Jesus or other figures.
- Do NOT use vague phrases like "appears in the biblical narrative" or "part of the story of redemption."
- Write in warm, accessible language suitable for everyday readers.
- No dashes of any kind. Use commas instead.
- No emojis.

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "name": "${characterName} - [a short descriptive subtitle, e.g. 'Mother of Israel' or 'The Brave Judge']",
  "story": "[2-3 paragraphs describing who they were, what they did, key events from Scripture. Be SPECIFIC. Include names, places, and what happened.]",
  "themes": [
    "[Theme title]: [1-2 sentence explanation tied to specific biblical events]",
    "[Theme title]: [1-2 sentence explanation tied to specific biblical events]",
    "[Theme title]: [1-2 sentence explanation tied to specific biblical events]"
  ],
  "culturalImpact": "[1-2 sentences about how this figure has influenced art, literature, theology, or everyday expressions. Be specific.]",
  "verses": ["[Book Chapter:Verse]", "[Book Chapter:Verse]", "[Book Chapter:Verse]", "[Book Chapter:Verse]"]
}`;
}

async function callDeepseek(prompt, apiKey) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });
  return res;
}

async function generateProfile(characterName) {
  const prompt = buildPrompt(characterName);

  let res = await callDeepseek(prompt, PRIMARY_KEY);
  if (res.status === 401) {
    console.log(`  ↻ Primary key 401, trying fallback...`);
    res = await callDeepseek(prompt, FALLBACK_KEY);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const result = await res.json();
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from API');

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.name || !parsed.story || !parsed.themes || !parsed.verses) {
    throw new Error('Incomplete profile returned');
  }
  return parsed;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  console.log(`Reading ${DATA_PATH}...`);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const characters = data.characters;

  const genericNames = Object.keys(characters).filter(name => isGeneric(characters[name]));
  console.log(`Found ${genericNames.length} generic profiles out of ${Object.keys(characters).length} total.`);

  if (dryRun) {
    console.log('\n-- DRY RUN -- Would fix these characters:');
    genericNames.slice(0, limit).forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
    return;
  }

  const toProcess = genericNames.slice(0, limit);
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const name = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      process.stdout.write(`${progress} ${name}...`);
      const profile = await generateProfile(name);

      characters[name] = {
        ...characters[name],
        name: profile.name,
        story: profile.story,
        themes: profile.themes,
        culturalImpact: profile.culturalImpact,
        verses: profile.verses,
      };

      fixed++;
      console.log(` ✓`);
    } catch (err) {
      failed++;
      console.log(` ✗ ${err.message}`);
    }

    if (i < toProcess.length - 1) {
      await sleep(1500);
    }

    if ((i + 1) % 25 === 0) {
      console.log(`\n  Checkpoint: saving ${fixed} fixes so far...\n`);
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
  }

  console.log(`\nWriting final results...`);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Done! Fixed: ${fixed}, Failed: ${failed}, Total generic: ${genericNames.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
