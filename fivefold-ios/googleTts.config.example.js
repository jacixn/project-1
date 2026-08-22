// Copy to googleTts.config.js (gitignored) and fill in your own values.
// Keys are Biblely's own; never reuse another app's.
// Google Cloud Text-to-Speech API config
// Using ONLY 100% confirmed working voices

export const GOOGLE_TTS_CONFIG = {
  apiUrl: 'YOUR_VALUE_HERE',
  apiKey: 'YOUR_VALUE_HERE',
  
  // Default voice - WaveNet Female US 5
  defaultVoice: {
    languageCode: 'en-US',
    name: 'YOUR_VALUE_HERE',
    ssmlGender: 'FEMALE',
  },
  
  // ONLY confirmed working Google Cloud TTS voices
  voices: {
    // ========== STUDIO VOICES (Premium - Best quality) ==========
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Studio',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'Studio',
      description: 'YOUR_VALUE_HERE',
    },
    
    // ========== NEURAL2 VOICES (Most natural - Recommended) ==========
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'Neural2',
      description: 'YOUR_VALUE_HERE',
    },
    
    // ========== WAVENET VOICES (Great quality) ==========
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-GB', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-GB', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-GB', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-AU', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-AU', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-GB', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-GB', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-AU', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-AU', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'WaveNet',
      description: 'YOUR_VALUE_HERE',
    },
    
    // ========== STANDARD VOICES (Basic but reliable) ==========
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'FEMALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
    'YOUR_VALUE_HERE': { 
      languageCode: 'en-US', 
      name: 'YOUR_VALUE_HERE', 
      ssmlGender: 'MALE',
      tier: 'YOUR_VALUE_HERE',
      description: 'YOUR_VALUE_HERE',
    },
  },
  
  // Audio settings
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 0.95,
    pitch: 0,
    volumeGainDb: 0,
  },
};
