/**
 * Generate Audio Story MP3 using Google TTS
 * 
 * This script generates Bible story audio using Google TTS
 * and saves them as MP3 files that you can upload to GitHub.
 * 
 * Usage:
 *   node generate-story-audio.js david      # Generate David and Goliath
 *   node generate-story-audio.js samson     # Generate Samson
 *   node generate-story-audio.js all        # Generate all stories
 * 
 * Prerequisites:
 *   1. Run: npm install node-fetch
 *   2. Have your Google TTS API key ready
 */

const fs = require('fs');
const path = require('path');

// Import your Google TTS config
let GOOGLE_TTS_CONFIG;
try {
  GOOGLE_TTS_CONFIG = require('./fivefold-ios/googleTts.config.js').GOOGLE_TTS_CONFIG;
} catch (e) {
  console.error('Could not load googleTts.config.js');
  console.error('Make sure you have set up the config file with your API key.');
  process.exit(1);
}

// Story scripts
const STORIES = {
  'david-goliath': {
    filename: 'david-goliath.mp3',
    title: 'David and Goliath',
    script: `David and Goliath.
Here's what you need to know.

So... picture this.

Two armies are staring each other down in a valley... Israel on one side... the Philistines on the other.

And the Philistines have a SECRET WEAPON.

A NINE-FOOT TALL giant named Goliath.

This man is BUILT. DIFFERENT.

We're talking bronze helmet... full body armor... a spear the size of a tree trunk.

And for FORTY DAYS STRAIGHT... this giant walks out every morning and ROASTS the entire Israelite army.

"Send me your best fighter!" he yells. "If he wins? We'll be your slaves. But if I win? You're DONE."

And the Israelites? They're SHOOK. Like... nobody moves. Nobody breathes. Pure fear.

Now enter David.

He's not even supposed to BE here.

He's just a teenager... a shepherd boy... sent by his dad to bring snacks to his older brothers.

But when David hears Goliath talking all that trash?

He's like... "Wait. Hold up. Who is THIS guy... defying the armies of the LIVING GOD?"

And everyone's like... "Bro. Sit down. You're like twelve."

But David doesn't back down.

King Saul hears about him and goes... "Fine. Fight him. Here... take my armor."

David tries it on... and he's like... "I can't move in this. It's not me."

So he takes it OFF.

Grabs his shepherd staff... picks up FIVE SMOOTH STONES from a stream... and walks toward the giant with nothing but a sling.

Goliath sees him and LAUGHS.

"Am I a DOG that you come at me with sticks? I'm gonna feed you to the BIRDS!"

But David says something LEGENDARY.

"You come at me with a sword... a spear... and a javelin. But I come at you in the name of the LORD of hosts... the God of Israel... whom you have DEFIED."

"Today? The Lord will deliver you into my hands. And the WHOLE WORLD will know... that the battle belongs to GOD."

And then?

David RUNS. Toward the giant.

He reaches into his bag... loads ONE STONE... swings the sling...

And BOOM.

The stone sinks into Goliath's forehead.

And the giant?

Falls. Face. First.

DONE.

The entire Philistine army? PANICS and runs.

Israel wins.

A teenager with a sling just took down a NINE FOOT GIANT.

So... what do we learn from this?

God doesn't need your strength. He uses your FAITH.

David didn't have experience... or armor... or a sword.

But he had something BETTER.

He BELIEVED that God was bigger than the giant in front of him.

And when you stand with God?

No giant... no situation... no obstacle... can take you down.

The battle? Belongs to the LORD.`
  },
  
  'samson': {
    filename: 'samson.mp3',
    title: 'Samson',
    script: `Samson. The strongest man who ever lived. Here's what you need to know.

So... let's set the scene. Israel is in a rough spot. They've been oppressed by the Philistines for forty years. And God's like... "I'm gonna send someone to start delivering my people."

Enter Samson.

Before he's even born... an angel appears to his mom and says... "You're gonna have a son. Don't cut his hair. Ever. He's gonna be set apart for God from day one."

This is called a Nazirite vow. No haircuts. No wine. Completely dedicated to God.

And Samson? He's BUILT DIFFERENT. Like... supernaturally strong. We're talking... ripping a lion apart with his bare hands... like it's nothing. Killing a thousand Philistine soldiers... with a donkey's jawbone. Yeah. A jawbone.

But here's the thing about Samson. He had incredible strength... but terrible judgment when it came to women.

He falls for a Philistine woman named Delilah. And the Philistine leaders are like... "Yo Delilah? Find out what makes him so strong. We'll pay you eleven hundred pieces of silver."

So Delilah starts asking... "Baby... what's the secret to your strength?"

And Samson... being cocky... lies to her. Multiple times. "Tie me with fresh bowstrings." Nope. "Weave my hair into a loom." Nope.

But Delilah keeps pressing. Every. Single. Day. Until finally... Samson breaks.

He tells her everything. "A razor has never touched my head. If my hair is cut... my strength will leave me."

That night... while Samson is sleeping on her lap... she calls a man to shave his head. And when he wakes up... he doesn't realize... the Lord has left him.

The Philistines capture him. Gouge out his eyes. Put him in prison. Make him grind grain like an animal.

But here's the plot twist. His hair... starts growing back.

One day... the Philistines throw a huge party to their god Dagon. Three thousand people. And they bring out Samson... to entertain them.

Samson asks the servant leading him... "Put me where I can feel the pillars... so I can lean on them."

Then he prays one last prayer. "Lord God... remember me. Please strengthen me... just one more time."

And God answers.

Samson pushes against the two central pillars... and brings down the entire temple. Killing more enemies in his death... than he ever did in his life.

So what do we learn from this?

God can use flawed people. Samson wasn't perfect. Far from it. But God still worked through him.

Our greatest strength... can become our greatest weakness... if we don't guard our hearts.

And sometimes... God gives us a second chance... even when we've messed up badly.

Samson's story is proof that... it's not about how you start. It's about how you finish.`
  }
};

async function generateAudio(storyId) {
  const story = STORIES[storyId];
  if (!story) {
    console.error(`Unknown story: ${storyId}`);
    console.error('Available stories:', Object.keys(STORIES).join(', '));
    return;
  }
  
  console.log(`\n🎙️ Generating "${story.title}" audio story...\n`);
  
  // Use Leda voice (energetic & upbeat)
  const voiceConfig = GOOGLE_TTS_CONFIG.voices['chirp-leda'] || {
    languageCode: 'en-US',
    name: 'en-US-Chirp3-HD-Leda',
    ssmlGender: 'FEMALE',
  };
  
  console.log('📢 Using voice:', voiceConfig.name);
  console.log('📝 Script length:', story.script.length, 'characters\n');
  
  const requestBody = {
    input: { text: story.script },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0,
    },
  };
  
  const url = `${GOOGLE_TTS_CONFIG.apiUrl}?key=${GOOGLE_TTS_CONFIG.apiKey}`;
  
  console.log('🔄 Calling Google TTS API...');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', response.status, errorText);
    return;
  }
  
  const data = await response.json();
  
  if (!data.audioContent) {
    console.error('❌ No audio content in response');
    return;
  }
  
  console.log('✅ Audio generated successfully!\n');
  
  // Create audio-files directory if it doesn't exist
  const audioDir = path.join(__dirname, 'audio-files');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  // Save the MP3 file
  const outputPath = path.join(audioDir, story.filename);
  const audioBuffer = Buffer.from(data.audioContent, 'base64');
  fs.writeFileSync(outputPath, audioBuffer);
  
  console.log('💾 Saved to:', outputPath);
  console.log('📦 File size:', (audioBuffer.length / 1024 / 1024).toFixed(2), 'MB');
  
  return outputPath;
}

async function main() {
  const arg = process.argv[2] || 'all';
  
  if (arg === 'all') {
    console.log('🎬 Generating ALL audio stories...');
    for (const storyId of Object.keys(STORIES)) {
      await generateAudio(storyId);
    }
  } else if (arg === 'david') {
    await generateAudio('david-goliath');
  } else if (arg === 'samson') {
    await generateAudio('samson');
  } else if (STORIES[arg]) {
    await generateAudio(arg);
  } else {
    console.error('Usage: node generate-story-audio.js [david|samson|all]');
    console.error('\nOptions:');
    console.error('  david   - Generate David and Goliath audio');
    console.error('  samson  - Generate Samson audio');
    console.error('  all     - Generate all stories');
    process.exit(1);
  }
  
  console.log('\n🚀 Next steps:');
  console.log('   1. git add audio-files/');
  console.log('   2. git commit -m "Fix audio story files"');
  console.log('   3. git push');
  console.log('\n✨ Done! The audio will be available from GitHub.');
}

main().catch(console.error);
