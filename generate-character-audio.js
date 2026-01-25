const fs = require('fs');
const https = require('https');

// Google TTS API config
const API_KEY = 'AIzaSyA_nXeYyXNLvRjfmF5MuuWbX3p1l3nGwQo';
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

// Leda voice - energetic and upbeat
const VOICE = {
  languageCode: 'en-US',
  name: 'en-US-Chirp3-HD-Leda',
};

const OUTPUT_DIR = './audio-files/bible-characters';

// Fetch the characters from GitHub
async function fetchCharacters() {
  return new Promise((resolve, reject) => {
    const url = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/bible-characters.json';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.characters);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Generate audio for a single character
async function generateAudio(characterKey, character) {
  const text = character.story;
  
  // Clean the text for TTS
  const cleanText = text
    .replace(/\n\n/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const requestBody = JSON.stringify({
    input: { text: cleanText },
    voice: VOICE,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.95,
      pitch: 0,
    },
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(API_URL);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.audioContent) {
            // Create filename from character key
            const filename = characterKey.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const filepath = `${OUTPUT_DIR}/${filename}.mp3`;
            
            // Save the audio file
            const audioBuffer = Buffer.from(response.audioContent, 'base64');
            fs.writeFileSync(filepath, audioBuffer);
            
            console.log(`✅ Generated: ${filepath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
            resolve({ key: characterKey, filename: `${filename}.mp3`, size: audioBuffer.length });
          } else {
            console.error(`❌ Error for ${characterKey}:`, response.error?.message || 'Unknown error');
            reject(new Error(response.error?.message || 'No audio content'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// Main function
async function main() {
  console.log('🎙️ Bible Characters Audio Generator');
  console.log('====================================\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Fetch characters
  console.log('📥 Fetching characters from GitHub...\n');
  const characters = await fetchCharacters();
  const characterKeys = Object.keys(characters);
  
  console.log(`Found ${characterKeys.length} characters to process:\n`);
  characterKeys.forEach((key, i) => console.log(`  ${i + 1}. ${key}`));
  console.log('\n');
  
  // Generate audio for each character
  const results = [];
  for (let i = 0; i < characterKeys.length; i++) {
    const key = characterKeys[i];
    console.log(`[${i + 1}/${characterKeys.length}] Generating audio for ${key}...`);
    
    try {
      const result = await generateAudio(key, characters[key]);
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   Failed: ${error.message}`);
    }
  }
  
  console.log('\n====================================');
  console.log(`✅ Generated ${results.length}/${characterKeys.length} audio files`);
  console.log(`📁 Output: ${OUTPUT_DIR}/`);
  
  // Generate summary
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
