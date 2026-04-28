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
    script: `Stop me if you've heard this one.

A blind guy. Chained between two stone pillars. Three thousand people drinking and laughing around him.

He whispers a prayer. Leans into the columns.

And brings the whole building down on his own head.

That's how the strongest man who ever lived dies.

But how does Samson end up there?

Rewind.

Before he's born, an angel shows up to his mom. Tells her... "You're having a son. He's gonna be set apart from day one. Don't cut his hair. Ever. Not one strand."

That's the deal. The hair is the sign. As long as it stays uncut... Samson is dialed into something supernatural.

And we're talking SUPERNATURAL.

He's walking through a vineyard one day... a LION jumps him.

Samson grabs it. With his BARE HANDS. Tears it apart like it's a piece of paper.

He doesn't even tell anybody. Just keeps walking.

Another time? An entire battalion of Philistine soldiers comes for him.

Samson finds a JAWBONE. Of a donkey. From the dirt.

And kills a THOUSAND men with it.

A literal jawbone. A thousand men.

Nobody can touch him. He's a one-man army with no off switch.

But here's where it gets messy.

Samson's strength is otherworldly. His judgment? Kind of mid.

Specifically when it comes to women.

He falls for a Philistine girl named Delilah. Now... the Philistines? They've been trying to take him out for YEARS. Failing every time.

So they go to Delilah. They say... "Find out his secret. We'll pay you eleven hundred pieces of silver. Each."

That's a fortune. Like... life-changing money.

Delilah agrees.

She starts asking. "Baby... what makes you so strong? Just curious."

And Samson... thinks he's smart. Lies to her.

"Tie me with seven fresh bowstrings... I'll be helpless."

She tries it. He snaps the bowstrings like dental floss.

"Okay weave my hair into your loom..."

Tries it. He walks away with the loom on his head.

Round after round. Every day. She's pushing. He's lying. The Philistines hiding in the next room... waiting.

Until one day she says... "If you really loved me you'd tell me."

And Samson? He breaks.

"A razor has never touched my head. If my hair gets cut... my strength leaves."

That night... he falls asleep on her lap.

And while he's sleeping... she calls a man in to shave his head. Seven locks of hair. Gone.

The Philistines burst in.

And for the first time in his life... Samson is just a guy.

They take him. They gouge out his eyes. Both of them.

And they put him in prison. Make him grind grain. Like an animal.

The mighty Samson. Blind. Broken. Pushing a millstone in the dark.

But here's what nobody notices.

His hair? Starts growing back.

Slowly. Quietly. While he prays.

Months pass. Then the Philistines throw a massive party for their god Dagon. Three thousand of them. In a stone temple.

And they say... "Bring out Samson. Let's make him dance."

So they drag him out. Blind. Stumbling. They prop him up between two pillars... the load-bearing ones... so the crowd can mock him.

A young servant boy is leading him by the hand.

And Samson whispers to the kid... "Put my hands on the pillars. So I can lean."

Then he prays. Out loud. The last words he ever says.

"Lord God. Remember me. Please. Strengthen me ONE more time. Just once. Let me die with the Philistines."

And God answers.

Samson grips the columns. Pushes with everything he has left.

The pillars CRACK.

The roof comes down.

Samson dies. With three thousand of his enemies.

He kills more in his last breath... than in his entire life.

Here's the thing about Samson.

He didn't get a comeback story. He got a comeback MOMENT.

One prayer. One choice. One push.

And God heard it.

So if you feel like you wasted your shot. Like your hair has been cut. Like your eyes are gone and you're grinding grain in the dark...

Listen.

The hair grows back.

You don't need a perfect record. You need ONE more move toward Him.

And He'll meet you. Even at the very end.

Even in the dark.

Even between the pillars.`
  },

  'jonah-whale': {
    filename: 'jonah-whale.mp3',
    title: 'Jonah and the Whale',
    script: `Imagine God gives you ONE assignment.

And you immediately book a one-way ticket... the OPPOSITE direction.

That's Jonah.

The job? Walk into Nineveh. Preach. Tell them to turn around before God ends them.

But Nineveh isn't just any city. Nineveh is the BAD place.

Cruel. Violent. Israel's worst enemy. The kind of people you'd cross the street to avoid.

So when God says "go save them"... Jonah hears... "yeah no thanks."

He goes to the docks. Buys a ticket to Tarshish. Literally the FARTHEST point on the map from where God told him to go.

Like he could just... sneak past the Almighty. Slip out the back door of the universe.

God watches him board the ship.

And God says... "okay."

Then sends a storm.

Not a regular storm. A this-ship-is-about-to-SNAP-in-half storm. Waves like buildings. Wind ripping the sails. The sailors? Throwing cargo overboard. Praying to every god they've ever heard of.

And Jonah?

Jonah is ASLEEP. Below deck. Snoring through the apocalypse.

The captain finds him. Shakes him awake. "BRO. We are about to DIE. Get up. Pray to your God. Maybe He cares."

They cast lots to find out who brought this storm. The lot lands on Jonah.

And he comes clean.

"Yeah... it's on me. I'm running from the LORD. The one who made this sea. And the land. And... pretty much everything."

The sailors LOSE it. "What do we DO?"

And Jonah says the thing nobody saw coming.

"Throw me overboard. The sea will calm. It's the only way."

They don't want to. They try rowing back to land. The storm gets WORSE.

Finally... they pick him up. And toss him.

The sea goes... silent. Glass. Like it never happened.

But Jonah is sinking.

Seaweed wrapping around his head. Lungs filling. Going down. Down. Down.

And right when it should be over...

Something MASSIVE moves in the deep.

A fish. The biggest fish anyone has ever seen. Sent by God Himself.

It opens its mouth.

And swallows Jonah. WHOLE.

Three days. Three nights. Inside the belly of the thing. In the dark. In the cold. With... whatever else is in there.

And down there? Jonah finally talks to God.

Not running. Not arguing. Praying.

"I cried out from the belly of hell... and You heard me. Salvation belongs to the LORD."

God speaks to the fish.

The fish vomits Jonah onto dry land. Alive. Breathing. Disgusting. But alive.

God speaks to Jonah... again.

"Now. Go to Nineveh."

This time?

Jonah goes.

He walks into the city. Wet. Smelly. Probably traumatized. And he yells.

"Forty days. Then Nineveh is OVER."

That's it. Eight words.

And here's where it gets crazy.

The whole city believes him.

From the king down to the kids in the street. They fast. They wear sackcloth. They cry out to God to spare them.

And God?

God hears them.

And He spares the whole city.

So here's the thing about Jonah's story.

It's not really about a fish.

It's about a guy who tried to run from God... and discovered there's no airport far enough. No ship fast enough. No storm strong enough to keep God from finding him.

Not to crush him. To bring him back.

Because God isn't only the God of the obedient. He's the God of the runaway. The reluctant. The ones who said no and meant it.

And His mercy?

His mercy is BIG enough for the worst city you can imagine. Big enough for sailors who didn't know His name. Big enough for a prophet who tried to disappear.

Big enough for you.

You can't outrun grace.

You can only stop running.`
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
  } else if (arg === 'jonah') {
    await generateAudio('jonah-whale');
  } else if (STORIES[arg]) {
    await generateAudio(arg);
  } else {
    console.error('Usage: node generate-story-audio.js [david|samson|jonah|all]');
    console.error('\nOptions:');
    console.error('  david   - Generate David and Goliath audio');
    console.error('  samson  - Generate Samson audio');
    console.error('  jonah   - Generate Jonah and the Whale audio');
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
