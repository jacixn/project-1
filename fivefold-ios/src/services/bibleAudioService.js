/**
 * Bible Audio Service
 * High-quality text-to-speech for Bible verse reading
 * Supports both device TTS and Chatterbox AI voices
 * 
 * For device TTS quality, download enhanced voices:
 * Settings > Accessibility > Spoken Content > Voices > English > Download enhanced voice
 */

import * as Speech from 'expo-speech';
import userStorage from '../utils/userStorage';
import { Alert, Linking } from 'react-native';
import chatterboxService from './chatterboxService';
import googleTtsService from './googleTtsService';

const AUDIO_SETTINGS_KEY = 'bible_audio_settings';
let ExpoAudio = null;

try {
  // expo-av requires a rebuilt dev client; guard for runtime availability
  // eslint-disable-next-line global-require
  ExpoAudio = require('expo-av')?.Audio || null;
} catch (error) {
  ExpoAudio = null;
}

// TTS Source options
const TTS_SOURCE = {
  DEVICE: 'device',       // Uses iOS/Android built-in TTS
  AI_VOICE: 'ai_voice',   // Uses Chatterbox AI (legacy)
  GOOGLE_TTS: 'google',   // Uses Google Cloud TTS - WaveNet neural voices (BEST QUALITY)
};

// Voice presets for different genders
// Prioritizing iOS 17+ Neural/Premium voices for most natural sound
const VOICE_PRESETS = {
  male: {
    // Best male voices - Neural > Premium > Enhanced > Compact
    voices: [
      // iOS 17+ Neural voices (most natural)
      'com.apple.voice.premium.en-US.Evan',
      'com.apple.voice.premium.en-US.Aaron',
      'com.apple.voice.premium.en-GB.Daniel',
      'com.apple.voice.premium.en-AU.Lee',
      // Enhanced voices (good quality)
      'com.apple.voice.enhanced.en-US.Evan',
      'com.apple.voice.enhanced.en-US.Aaron',
      'com.apple.voice.enhanced.en-GB.Daniel',
      'com.apple.voice.enhanced.en-AU.Lee',
      // Siri voices
      'com.apple.ttsbundle.siri_Aaron_en-US_compact',
      'com.apple.ttsbundle.siri_male_en-US_compact',
      'com.apple.ttsbundle.Daniel-compact',
    ],
    pitch: 1.0, // Natural pitch
    rate: 0.48, // Slower for more natural Bible reading pace
  },
  female: {
    // Best female voices - Neural > Premium > Enhanced > Compact
    voices: [
      // iOS 17+ Neural voices (most natural)
      'com.apple.voice.premium.en-US.Zoe',
      'com.apple.voice.premium.en-US.Samantha',
      'com.apple.voice.premium.en-GB.Serena',
      'com.apple.voice.premium.en-AU.Karen',
      // Enhanced voices (good quality)
      'com.apple.voice.enhanced.en-US.Zoe',
      'com.apple.voice.enhanced.en-US.Samantha',
      'com.apple.voice.enhanced.en-GB.Serena',
      'com.apple.voice.enhanced.en-AU.Karen',
      // Siri voices
      'com.apple.ttsbundle.siri_Samantha_en-US_compact',
      'com.apple.ttsbundle.siri_female_en-US_compact',
      'com.apple.ttsbundle.Samantha-compact',
    ],
    pitch: 1.0, // Natural pitch
    rate: 0.48, // Slower for more natural Bible reading pace
  }
};

class BibleAudioService {
  constructor() {
    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false; // NEW: Track loading state separately
    this.currentVerse = null;
    this.autoPlayEnabled = false;
    this.verses = [];
    this.currentVerseIndex = 0;
    this.settings = {
      voiceGender: 'female', // 'male' or 'female'
      rate: 0.46, // 0.0 to 1.0 (slower for natural Bible reading)
      pitch: 1.0, // 0.5 to 2.0 (natural pitch)
      volume: 1.0, // 0.0 to 1.0
      ttsSource: TTS_SOURCE.GOOGLE_TTS, // Default to Google for best quality
      selectedVoiceId: null, // User-selected voice identifier
    };
    this.availableVoices = [];
    this.selectedVoice = null;
    this.onPlaybackStateChange = null;
    this.onVerseChange = null;
    this.onComplete = null;
    this.playbackListeners = new Set();
    this.verseChangeListeners = new Set();
    this.completeListeners = new Set();
    this.hasEnhancedVoice = false;
    this.hasPromptedForVoices = false;
    this.currentBook = '';
    this.currentChapter = 0;
    this.chatterboxAvailable = false;
    this.voicesReady = false;
    this.onVoicesLoaded = null;
    
    this.loadSettings();
    this.initializeVoices();
    this.checkChatterboxAvailability();
  }

  /**
   * Subscribe to playback state changes
   */
  addPlaybackListener(listener) {
    if (!listener) return () => {};
    this.playbackListeners.add(listener);
    return () => this.playbackListeners.delete(listener);
  }

  /**
   * Subscribe to verse change events (auto-play)
   */
  addVerseChangeListener(listener) {
    if (!listener) return () => {};
    this.verseChangeListeners.add(listener);
    return () => this.verseChangeListeners.delete(listener);
  }

  /**
   * Subscribe to completion events (auto-play finished)
   */
  addCompleteListener(listener) {
    if (!listener) return () => {};
    this.completeListeners.add(listener);
    return () => this.completeListeners.delete(listener);
  }

  /**
   * Get current playback state snapshot
   */
  getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isLoading: this.isLoading,
      autoPlayEnabled: this.autoPlayEnabled,
      currentVerse: this.currentVerse,
      currentVerseIndex: this.currentVerseIndex,
      currentBook: this.currentBook,
      currentChapter: this.currentChapter,
    };
  }

  /**
   * Get current reading context (book/chapter/verses)
   */
  getCurrentReadingContext() {
    return {
      book: this.currentBook,
      chapter: this.currentChapter,
      verses: this.verses,
      currentVerseIndex: this.currentVerseIndex,
    };
  }

  /**
   * Check if Chatterbox AI voice is available
   */
  async checkChatterboxAvailability() {
    try {
      this.chatterboxAvailable = await chatterboxService.checkAvailability();
      console.log('[BibleAudio] Chatterbox available:', this.chatterboxAvailable);
    } catch (error) {
      this.chatterboxAvailable = false;
      console.log('[BibleAudio] Chatterbox not available');
    }
  }

  /**
   * Ensure audio plays through speaker and in silent mode
   */
  async configureAudioMode() {
    if (!ExpoAudio?.setAudioModeAsync) return;
    try {
      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: ExpoAudio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('[BibleAudio] Failed to set audio mode:', error);
    }
  }

  /**
   * Get TTS source options
   */
  getTTSSources() {
    return [
      { id: TTS_SOURCE.GOOGLE_TTS, name: 'Google Neural Voice', description: 'Most realistic human-like voice (recommended)', badge: 'BEST' },
      { id: TTS_SOURCE.DEVICE, name: 'Device Voice', description: 'Built-in voices, works offline (lower quality)' },
    ];
  }

  /**
   * Set TTS source
   */
  async setTTSSource(source) {
    if (source !== TTS_SOURCE.DEVICE && source !== TTS_SOURCE.AI_VOICE && source !== TTS_SOURCE.GOOGLE_TTS) return;
    
    this.settings.ttsSource = source;
    await this.saveSettings();
    console.log('[BibleAudio] TTS source set to:', source);
  }

  /**
   * Get current TTS source
   */
  getTTSSource() {
    return this.settings.ttsSource;
  }

  /**
   * Check if using AI voice (legacy Chatterbox)
   */
  isUsingAIVoice() {
    return this.settings.ttsSource === TTS_SOURCE.AI_VOICE;
  }

  /**
   * Check if using Google Cloud TTS
   */
  isUsingGoogleTTS() {
    return this.settings.ttsSource === TTS_SOURCE.GOOGLE_TTS;
  }

  /**
   * Initialize and discover available voices
   */
  async initializeVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      this.availableVoices = voices;
      
      // If user has a saved voice selection, use that
      if (this.settings.selectedVoiceId) {
        const savedVoice = voices.find(v => v.identifier === this.settings.selectedVoiceId);
        if (savedVoice) {
          this.selectedVoice = savedVoice;
          console.log('[BibleAudio] Using saved voice:', savedVoice.identifier);
        } else {
          // Saved voice not found, fall back to auto-select
          await this.selectBestVoice();
        }
      } else {
        // No saved voice, auto-select best one
        await this.selectBestVoice();
      }
      
      // Check if we have good quality voices
      this.hasEnhancedVoice = this.checkForEnhancedVoices();
      this.voicesReady = true;
      
      // Notify listeners that voices are loaded
      if (this.onVoicesLoaded) {
        this.onVoicesLoaded(this.getAvailableVoices());
      }
      
      // Log all available voices for debugging
      const englishVoices = voices.filter(v => v.language?.startsWith('en') || v.identifier?.includes('en-'));
      const siriVoices = voices.filter(v => v.identifier?.includes('siri'));
      
      console.log(`[BibleAudio] ========== VOICE DISCOVERY ==========`);
      console.log(`[BibleAudio] Total voices on device: ${voices.length}`);
      console.log(`[BibleAudio] English voices: ${englishVoices.length}`);
      console.log(`[BibleAudio] Siri voices: ${siriVoices.length}`);
      console.log(`[BibleAudio] Selected voice: ${this.selectedVoice?.identifier || 'default'}`);
      console.log(`[BibleAudio] Has enhanced voice: ${this.hasEnhancedVoice}`);
      console.log(`[BibleAudio] =====================================`);
    } catch (error) {
      console.error('[BibleAudio] Failed to get voices:', error);
    }
  }

  /**
   * Check if enhanced/premium voices are available
   */
  checkForEnhancedVoices() {
    const qualityKeywords = ['premium', 'enhanced', 'neural'];
    const englishVoices = this.availableVoices.filter(v => 
      v.language?.startsWith('en') || v.identifier?.includes('en-')
    );
    
    return englishVoices.some(v => 
      qualityKeywords.some(kw => v.identifier?.toLowerCase().includes(kw))
    );
  }

  /**
   * Prompt user to download enhanced voices for better quality
   */
  promptForEnhancedVoices() {
    // Only show once per session
    if (this.hasPromptedForVoices) return;
    this.hasPromptedForVoices = true;
    
    if (!this.hasEnhancedVoice) {
      Alert.alert(
        'Better Voice Available',
        'For much more natural Bible reading, download an enhanced voice:\n\n' +
        '1. Open Settings\n' +
        '2. Go to Accessibility\n' +
        '3. Tap Spoken Content\n' +
        '4. Tap Voices > English\n' +
        '5. Download "Samantha (Enhanced)" or "Zoe (Enhanced)"\n\n' +
        'This is free and makes a big difference!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings()
          },
        ]
      );
    }
  }

  /**
   * Select the best available voice based on gender preference
   * Prioritizes: Neural > Premium > Enhanced > Compact
   */
  async selectBestVoice() {
    const preset = VOICE_PRESETS[this.settings.voiceGender];
    
    // Get all English voices
    const englishVoices = this.availableVoices.filter(v => 
      v.language?.startsWith('en') || v.identifier?.includes('en-')
    );
    
    // Log available voices for debugging
    console.log('[BibleAudio] Available English voices:', englishVoices.map(v => v.identifier));
    
    // Try exact matches first (best quality)
    for (const preferredVoice of preset.voices) {
      const found = englishVoices.find(v => v.identifier === preferredVoice);
      if (found) {
        this.selectedVoice = found;
        console.log('[BibleAudio] Found exact match:', found.identifier);
        return;
      }
    }
    
    // Try partial matches (voice name at end of identifier)
    for (const preferredVoice of preset.voices) {
      const voiceName = preferredVoice.split('.').pop()?.toLowerCase();
      if (voiceName) {
        const found = englishVoices.find(v => 
          v.identifier?.toLowerCase().includes(voiceName) ||
          v.name?.toLowerCase().includes(voiceName)
        );
        if (found) {
          this.selectedVoice = found;
          console.log('[BibleAudio] Found partial match:', found.identifier);
          return;
        }
      }
    }

    // Look for premium/enhanced voices by quality keywords
    const qualityKeywords = ['premium', 'enhanced', 'neural'];
    for (const keyword of qualityKeywords) {
      const found = englishVoices.find(v => 
        v.identifier?.toLowerCase().includes(keyword) ||
        v.quality?.toLowerCase().includes(keyword)
      );
      if (found) {
        this.selectedVoice = found;
        console.log('[BibleAudio] Found quality voice:', found.identifier);
        return;
      }
    }

    // Fallback: find any English voice matching the gender
    const genderKeywords = this.settings.voiceGender === 'male' 
      ? ['evan', 'aaron', 'daniel', 'james', 'tom', 'alex', 'lee', 'male']
      : ['zoe', 'samantha', 'serena', 'karen', 'kate', 'victoria', 'allison', 'female'];
    
    for (const voice of englishVoices) {
      const id = voice.identifier?.toLowerCase() || '';
      const name = voice.name?.toLowerCase() || '';
      if (genderKeywords.some(kw => id.includes(kw) || name.includes(kw))) {
        this.selectedVoice = voice;
        console.log('[BibleAudio] Found gender match:', voice.identifier);
        return;
      }
    }

    // Ultimate fallback: first English voice
    this.selectedVoice = englishVoices[0] || this.availableVoices[0] || null;
    console.log('[BibleAudio] Using fallback voice:', this.selectedVoice?.identifier);
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const stored = await userStorage.getRaw(AUDIO_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...this.settings, ...parsed };
        await this.selectBestVoice();
      }
    } catch (error) {
      console.log('[BibleAudio] Failed to load settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      await userStorage.setRaw(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.log('[BibleAudio] Failed to save settings:', error);
    }
  }

  /**
   * Update voice gender setting
   * @param {string} gender - 'male' or 'female'
   */
  async setVoiceGender(gender) {
    if (gender !== 'male' && gender !== 'female') return;
    
    this.settings.voiceGender = gender;
    await this.saveSettings();
    await this.selectBestVoice();
    
    // Apply preset pitch for the gender
    const preset = VOICE_PRESETS[gender];
    this.settings.pitch = preset.pitch;
    this.settings.rate = preset.rate;
    
    console.log(`[BibleAudio] Voice gender set to ${gender}, voice: ${this.selectedVoice?.name || 'default'}`);
  }

  /**
   * Format verse reference for speech
   * @param {string} book - Book name
   * @param {number} chapter - Chapter number
   * @param {number} verse - Verse number
   * @returns {string} Formatted reference for speech
   */
  formatReferenceForSpeech(book, chapter, verse) {
    // Convert chapter number to words for natural speech
    const chapterWords = this.numberToWords(chapter);
    
    return `${book}, chapter ${chapterWords}, verse ${verse}`;
  }

  /**
   * Convert number to words for natural speech
   */
  numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const hundreds = ['', 'one hundred', 'two hundred', 'three hundred', 'four hundred', 
      'five hundred', 'six hundred', 'seven hundred', 'eight hundred', 'nine hundred'];
    
    if (num < 20) return ones[num];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
      return hundreds[Math.floor(num / 100)] + (num % 100 ? ' and ' + this.numberToWords(num % 100) : '');
    }
    return num.toString();
  }

  /**
   * Speak a single verse
   * @param {Object} params - Speaking parameters
   * @param {string} params.book - Book name
   * @param {number} params.chapter - Chapter number
   * @param {Object} params.verse - Verse object with number and content
   * @param {boolean} params.announceReference - Whether to announce the reference first
   */
  async speakVerse({ book, chapter, verse, announceReference = true }) {
    // Stop current speech
    await Speech.stop();
    await chatterboxService.stop();
    await googleTtsService.stop();
    
    // IMPORTANT: Single verse playback is NOT auto-play
    // This ensures completion logic runs correctly
    this.autoPlayEnabled = false;
    
    // Set loading state first - audio is being prepared
    this.isLoading = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVerse = { book, chapter, verse };
    
    this.notifyStateChange();
    
    // Build the text to speak
    let textToSpeak = '';
    
    if (announceReference) {
      const reference = this.formatReferenceForSpeech(book, chapter, verse.number || verse.verse);
      textToSpeak = `${reference}. ${verse.content || verse.text}`;
    } else {
      textToSpeak = verse.content || verse.text;
    }
    
    // Clean the text for better speech
    textToSpeak = this.cleanTextForSpeech(textToSpeak);
    
    // Ensure audio routes to speaker and plays in silent mode
    await this.configureAudioMode();

    // Use Google Cloud TTS if enabled (BEST QUALITY)
    if (this.isUsingGoogleTTS()) {
      return this.speakWithGoogleTTS(textToSpeak);
    }

    // Use Chatterbox AI voice if enabled (legacy)
    if (this.isUsingAIVoice() && this.chatterboxAvailable) {
      return this.speakWithChatterbox(textToSpeak);
    }
    
    // Fallback: Use device TTS
    // Prompt for enhanced voices on first use (if not available)
    if (!this.hasEnhancedVoice && !this.hasPromptedForVoices) {
      setTimeout(() => this.promptForEnhancedVoices(), 2000);
    }
    
    return new Promise((resolve, reject) => {
      const options = {
        language: 'en-US',
        pitch: this.settings.pitch,
        rate: this.settings.rate,
        voice: this.selectedVoice?.identifier,
        volume: this.settings.volume,
        onDone: () => {
          if (!this.autoPlayEnabled) {
            this.isPlaying = false;
            this.currentVerse = null;
            this.notifyStateChange();
          }
          resolve();
        },
        onStopped: () => {
          this.isPlaying = false;
          this.isPaused = false;
          resolve();
        },
        onError: (error) => {
          console.error('[BibleAudio] Speech error:', error);
          this.isPlaying = false;
          this.notifyStateChange();
          reject(error);
        },
      };
      
      Speech.speak(textToSpeak, options);
    });
  }

  /**
   * Speak text using Google Cloud TTS (BEST QUALITY)
   * Returns a Promise that resolves when audio finishes playing
   */
  async speakWithGoogleTTS(text) {
    try {
      console.log('[BibleAudio] Using Google Cloud TTS (WaveNet neural voice)');
      console.log('[BibleAudio] Text to speak:', text.substring(0, 80) + '...');
      
      // Update state - now playing
      this.isLoading = false;
      this.isPlaying = true;
      this.notifyStateChange();
      
      // Speak and WAIT for completion (this Promise resolves when audio finishes)
      const success = await googleTtsService.speak(text);
      
      console.log('[BibleAudio] Google TTS finished, success:', success);
      
      if (!success) {
        // Fallback to device TTS if Google TTS fails
        console.log('[BibleAudio] Google TTS failed, falling back to device TTS');
        return this.speakWithDeviceTTS(text);
      }
      
      // Update state after completion
      if (!this.autoPlayEnabled) {
        this.isPlaying = false;
        this.currentVerse = null;
        this.notifyStateChange();
      }
      
      return true;
      
    } catch (error) {
      console.error('[BibleAudio] Google TTS error:', error);
      // Fallback to device TTS
      return this.speakWithDeviceTTS(text);
    }
  }

  /**
   * Speak text using Chatterbox AI voice
   */
  async speakWithChatterbox(text) {
    try {
      console.log('[BibleAudio] Using Chatterbox AI voice');
      await this.configureAudioMode();
      
      // Set up state change listener
      chatterboxService.onStateChange = (state) => {
        if (state === 'finished') {
          if (!this.autoPlayEnabled) {
            this.isPlaying = false;
            this.currentVerse = null;
            this.notifyStateChange();
          }
        } else if (state === 'error') {
          this.isPlaying = false;
          this.notifyStateChange();
        }
      };
      
      const success = await chatterboxService.speak(text);
      
      if (!success) {
        // Fallback to device TTS if Chatterbox fails
        console.log('[BibleAudio] Chatterbox failed, falling back to device TTS');
        return this.speakWithDeviceTTS(text);
      }
      
    } catch (error) {
      console.error('[BibleAudio] Chatterbox error:', error);
      // Fallback to device TTS
      return this.speakWithDeviceTTS(text);
    }
  }

  /**
   * Speak text using device TTS (fallback)
   */
  speakWithDeviceTTS(text) {
    return new Promise((resolve, reject) => {
      this.configureAudioMode();
      const options = {
        language: 'en-US',
        pitch: this.settings.pitch,
        rate: this.settings.rate,
        voice: this.selectedVoice?.identifier,
        volume: this.settings.volume,
        onDone: () => {
          if (!this.autoPlayEnabled) {
            this.isPlaying = false;
            this.currentVerse = null;
            this.notifyStateChange();
          }
          resolve();
        },
        onStopped: () => {
          this.isPlaying = false;
          this.isPaused = false;
          resolve();
        },
        onError: (error) => {
          console.error('[BibleAudio] Device TTS error:', error);
          this.isPlaying = false;
          this.notifyStateChange();
          reject(error);
        },
      };
      
      Speech.speak(text, options);
    });
  }

  /**
   * Start auto-play from a specific verse
   * @param {Object} params - Auto-play parameters
   * @param {string} params.book - Book name
   * @param {number} params.chapter - Chapter number
   * @param {Array} params.verses - All verses in the chapter
   * @param {number} params.startIndex - Index to start from
   */
  async startAutoPlay({ book, chapter, verses, startIndex = 0 }) {
    this.autoPlayEnabled = true;
    this.verses = verses;
    this.currentVerseIndex = startIndex;
    this.currentBook = book;
    this.currentChapter = chapter;
    
    // Set initial verse for UI immediately
    const firstVerse = verses[startIndex];
    this.currentVerse = { book, chapter, verse: firstVerse };
    this.isPlaying = true;
    this.notifyStateChange();
    
    console.log(`[BibleAudio] Starting auto-play from verse ${startIndex + 1} of ${verses.length} verses`);
    
    // First verse gets full reference announcement
    await this.playNextVerse(book, chapter, true);
  }

  /**
   * Play verses in auto-play mode with preloading for seamless playback
   * While current verse plays, next verse is preloaded in background
   */
  async playNextVerse(book, chapter, isFirstVerse = false) {
    console.log(`[BibleAudio] playNextVerse called - index: ${this.currentVerseIndex}, autoPlay: ${this.autoPlayEnabled}`);
    
    if (!this.autoPlayEnabled || this.currentVerseIndex >= this.verses.length) {
      console.log('[BibleAudio] Auto-play stopping - end of verses or disabled');
      googleTtsService.clearPreloaded();
      this.stopAutoPlay();
      if (this.onComplete) {
        this.onComplete();
      }
      this.completeListeners.forEach(listener => listener());
      return;
    }
    
    const verse = this.verses[this.currentVerseIndex];
    const verseNumber = verse.number || verse.verse;
    
    console.log(`[BibleAudio] Playing verse ${verseNumber} (index ${this.currentVerseIndex})`);
    
    // Notify UI about verse change
    if (this.onVerseChange) {
      this.onVerseChange(verse, this.currentVerseIndex);
    }
    this.verseChangeListeners.forEach(listener => listener(verse, this.currentVerseIndex));
    
    // Update current verse info for UI
    this.currentVerse = { book, chapter, verse };
    this.isPlaying = true;
    this.isPaused = false;
    this.notifyStateChange();
    
    try {
      // Build text for current verse
      let textToSpeak = '';
      if (isFirstVerse) {
        const reference = this.formatReferenceForSpeech(book, chapter, verseNumber);
        textToSpeak = `${reference}. ${verse.content || verse.text}`;
      } else {
        textToSpeak = `Verse ${verseNumber}. ${verse.content || verse.text}`;
      }
      textToSpeak = this.cleanTextForSpeech(textToSpeak);
      
      // Check if we have preloaded audio ready (from previous iteration)
      const hasPreloaded = this.isUsingGoogleTTS() && googleTtsService.hasPreloadedAudio();
      
      // Start preloading NEXT verse while current one plays
      const nextIndex = this.currentVerseIndex + 1;
      let preloadPromise = null;
      
      if (this.isUsingGoogleTTS() && nextIndex < this.verses.length && this.autoPlayEnabled) {
        const nextVerse = this.verses[nextIndex];
        const nextVerseNumber = nextVerse.number || nextVerse.verse;
        const nextVerseContent = nextVerse.content || nextVerse.text || '';
        
        if (nextVerseContent) {
          let nextText = `Verse ${nextVerseNumber}. ${nextVerseContent}`;
          nextText = this.cleanTextForSpeech(nextText);
          
          console.log(`[BibleAudio] Preloading verse ${nextVerseNumber}: "${nextText.substring(0, 40)}..."`);
          
          // Start preloading in background (don't await)
          preloadPromise = googleTtsService.preload(nextText);
        } else {
          console.log(`[BibleAudio] Skipping preload - verse ${nextVerseNumber} has no content`);
        }
      }
      
      // Play current verse
      if (this.isUsingGoogleTTS()) {
        if (hasPreloaded && !isFirstVerse) {
          // Use preloaded audio (instant playback!)
          console.log('[BibleAudio] Using preloaded audio for instant playback');
          // Ensure state is communicated before playing
          this.isPlaying = true;
          this.notifyStateChange();
          await googleTtsService.playPreloaded();
        } else {
          // First verse or no preload - fetch and play normally
          await this.speakWithGoogleTTS(textToSpeak);
        }
      } else if (this.isUsingAIVoice() && this.chatterboxAvailable) {
        await this.speakWithChatterbox(textToSpeak);
      } else {
        await this.speakWithDeviceTTS(textToSpeak);
      }
      
      console.log(`[BibleAudio] Verse ${verseNumber} finished`);
      
      // Wait for preload to complete if still in progress
      if (preloadPromise) {
        await preloadPromise;
      }
      
      if (this.autoPlayEnabled) {
        this.currentVerseIndex++;
        console.log(`[BibleAudio] Moving to verse ${this.currentVerseIndex + 1}`);
        
        // Continue immediately - next verse is already preloaded!
        await this.playNextVerse(book, chapter, false);
      }
    } catch (error) {
      console.error('[BibleAudio] Error playing verse:', error);
      googleTtsService.clearPreloaded();
      this.stopAutoPlay();
    }
  }

  /**
   * Speak verse with only verse number (for continuous reading)
   */
  async speakVerseNumberOnly({ verseNumber, verseText }) {
    // Stop current speech but preserve autoPlayEnabled state
    const wasAutoPlay = this.autoPlayEnabled;
    await Speech.stop();
    await chatterboxService.stop();
    await googleTtsService.stop();
    this.autoPlayEnabled = wasAutoPlay;
    
    this.isPlaying = true;
    this.isPaused = false;
    
    // Get the actual verse object from the verses array for UI sync
    const actualVerse = this.verses[this.currentVerseIndex] || { number: verseNumber, content: verseText };
    
    // Update current verse info for UI sync (same structure as speakVerse)
    this.currentVerse = { 
      book: this.currentBook, 
      chapter: this.currentChapter, 
      verse: actualVerse
    };
    
    this.notifyStateChange();
    
    await this.configureAudioMode();

    // Build text: "Verse 5. [content]"
    let textToSpeak = `Verse ${verseNumber}. ${verseText}`;
    textToSpeak = this.cleanTextForSpeech(textToSpeak);
    
    // Use Google Cloud TTS if enabled (BEST QUALITY)
    if (this.isUsingGoogleTTS()) {
      return this.speakWithGoogleTTS(textToSpeak);
    }

    // Use Chatterbox AI voice if enabled (legacy)
    if (this.isUsingAIVoice() && this.chatterboxAvailable) {
      return this.speakWithChatterbox(textToSpeak);
    }
    
    return new Promise((resolve, reject) => {
      const options = {
        language: 'en-US',
        pitch: this.settings.pitch,
        rate: this.settings.rate,
        voice: this.selectedVoice?.identifier,
        volume: this.settings.volume,
        onDone: () => {
          if (!this.autoPlayEnabled) {
            this.isPlaying = false;
            this.notifyStateChange();
          }
          resolve();
        },
        onStopped: () => {
          this.isPlaying = false;
          this.isPaused = false;
          resolve();
        },
        onError: (error) => {
          console.error('[BibleAudio] Speech error:', error);
          this.isPlaying = false;
          this.notifyStateChange();
          reject(error);
        },
      };
      
      Speech.speak(textToSpeak, options);
    });
  }

  /**
   * Stop auto-play mode
   */
  stopAutoPlay() {
    this.autoPlayEnabled = false;
    this.currentVerseIndex = 0;
    this.verses = [];
    googleTtsService.clearPreloaded();
    this.stop();
  }

  /**
   * Clean text for better speech synthesis
   * Optimized for natural Bible reading with proper pacing
   */
  cleanTextForSpeech(text) {
    if (!text) return '';
    
    // For Google TTS, keep text simple - it handles pacing naturally
    // Don't add manual pauses as SSML will handle that
    const isGoogleTTS = this.isUsingGoogleTTS();
    
    let cleaned = text
      // Remove verse numbers in brackets or parentheses
      .replace(/\[\d+\]/g, '')
      .replace(/\(\d+\)/g, '')
      // Replace common Bible abbreviations for natural pronunciation
      .replace(/\bLORD\b/g, 'Lord')
      .replace(/\bGOD\b/g, 'God')
      .replace(/\bJESUS\b/g, 'Jesus')
      .replace(/\bCHRIST\b/g, 'Christ')
      // Fix common contractions/words that sound odd
      .replace(/\bshalt\b/gi, 'shall')
      .replace(/\bhath\b/gi, 'has')
      .replace(/\bdoth\b/gi, 'does')
      .replace(/\bthee\b/gi, 'you')
      .replace(/\bthy\b/gi, 'your')
      .replace(/\bthine\b/gi, 'your')
      .replace(/\bthou\b/gi, 'you')
      .replace(/\bunto\b/gi, 'to')
      .replace(/\bwherefore\b/gi, 'why')
      // Remove curly quotes, replace with straight
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Only add manual pauses for device TTS (not Google TTS)
    if (!isGoogleTTS) {
      cleaned = cleaned
        .replace(/\. /g, '... ')
        .replace(/; /g, '.. ')
        .replace(/: /g, '.. ')
        .replace(/\? /g, '... ')
        .replace(/! /g, '... ')
        .replace(/"/g, '');
    }
    
    return cleaned;
  }

  /**
   * Stop current speech
   */
  async stop() {
    await Speech.stop();
    await chatterboxService.stop();
    await googleTtsService.stop();
    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false;
    this.autoPlayEnabled = false;
    this.currentVerse = null;
    this.notifyStateChange();
  }

  /**
   * Pause current speech (iOS only - may not be fully supported)
   */
  async pause() {
    await Speech.pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.notifyStateChange();
  }

  /**
   * Resume paused speech (iOS only - may not be fully supported)
   */
  async resume() {
    await Speech.resume();
    this.isPaused = false;
    this.isPlaying = true;
    this.notifyStateChange();
  }

  /**
   * Check if speech is currently playing
   */
  async isSpeaking() {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update speech rate
   * @param {number} rate - Rate between 0.0 and 1.0
   */
  async setRate(rate) {
    this.settings.rate = Math.max(0.1, Math.min(1.0, rate));
    await this.saveSettings();
  }

  /**
   * Update pitch
   * @param {number} pitch - Pitch between 0.5 and 2.0
   */
  async setPitch(pitch) {
    this.settings.pitch = Math.max(0.5, Math.min(2.0, pitch));
    await this.saveSettings();
  }

  /**
   * Notify listeners of playback state changes
   */
  notifyStateChange() {
    const state = {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isLoading: this.isLoading,
      autoPlayEnabled: this.autoPlayEnabled,
      currentVerse: this.currentVerse,
      currentVerseIndex: this.currentVerseIndex,
    };
    
    console.log('[BibleAudio] State change:', {
      isLoading: state.isLoading,
      isPlaying: state.isPlaying,
      autoPlayEnabled: state.autoPlayEnabled,
      hasVerse: !!state.currentVerse,
      verseNum: state.currentVerse?.verse?.number || state.currentVerse?.verse?.verse || 'none',
      listenersCount: this.playbackListeners.size,
    });
    
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(state);
    }
    const snapshot = this.getPlaybackState();
    this.playbackListeners.forEach(listener => listener(snapshot));
  }

  /**
   * Get available voices list
   * Returns Google TTS voices if using Google, otherwise device voices
   */
  getAvailableVoices() {
    if (this.isUsingGoogleTTS()) {
      return googleTtsService.getAvailableVoices();
    }
    return this.availableVoices.filter(v => v.language?.startsWith('en'));
  }

  /**
   * Get Google TTS voices specifically
   */
  getGoogleVoices() {
    return googleTtsService.getAvailableVoices();
  }

  /**
   * Set Google TTS voice
   */
  async setGoogleVoice(voiceKey) {
    return await googleTtsService.setVoice(voiceKey);
  }

  /**
   * Get current Google TTS voice
   */
  getGoogleVoice() {
    return googleTtsService.getCurrentVoice();
  }

  /**
   * Get current voice info
   */
  getCurrentVoice() {
    return this.selectedVoice;
  }

  /**
   * Set a specific voice by identifier
   * @param {string} voiceId - Voice identifier to use
   */
  async setVoice(voiceId) {
    const voice = this.availableVoices.find(v => v.identifier === voiceId);
    if (voice) {
      this.selectedVoice = voice;
      this.settings.selectedVoiceId = voiceId;
      await this.saveSettings();
      console.log('[BibleAudio] Voice set to:', voice.identifier, voice.name);
      return true;
    }
    return false;
  }

  /**
   * Clear user voice selection (revert to auto-select)
   */
  async clearVoiceSelection() {
    this.settings.selectedVoiceId = null;
    await this.saveSettings();
    await this.selectBestVoice();
    console.log('[BibleAudio] Voice selection cleared, auto-selected:', this.selectedVoice?.identifier);
  }

  /**
   * Preview a voice with sample text
   * @param {string} voiceId - Voice identifier to preview
   * @param {string} sampleText - Text to speak (optional)
   */
  async previewVoice(voiceId, sampleText = null) {
    await Speech.stop();
    await this.configureAudioMode();
    
    const voice = this.availableVoices.find(v => v.identifier === voiceId);
    if (!voice) return false;
    
    const text = sampleText || 'The Lord is my shepherd, I shall not want.';
    
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        voice: voiceId,
        pitch: this.settings.pitch,
        rate: this.settings.rate,
        volume: this.settings.volume,
        onDone: () => resolve(true),
        onStopped: () => resolve(true),
        onError: () => resolve(false),
      });
    });
  }

  /**
   * Stop any preview playback
   */
  async stopPreview() {
    await Speech.stop();
  }

  /**
   * Get formatted voice list with quality info and categorization
   * @param {boolean} allLanguages - If true, returns all voices not just English
   * @returns {Array} Formatted voice list
   */
  getFormattedVoiceList(allLanguages = false) {
    console.log(`[BibleAudio] Total voices on device: ${this.availableVoices.length}`);
    
    // Filter to English voices by default, or show all if requested
    const voices = allLanguages 
      ? this.availableVoices 
      : this.availableVoices.filter(v => 
          v.language?.startsWith('en') || 
          v.identifier?.includes('en-') ||
          v.identifier?.includes('en_') ||
          // Also include Siri voices that might not have language tag
          (v.identifier?.includes('siri') && !v.language?.startsWith('es') && !v.language?.startsWith('fr') && !v.language?.startsWith('de'))
        );
    
    console.log(`[BibleAudio] English voices found: ${voices.length}`);
    
    // Log all voice identifiers for debugging
    if (voices.length > 0) {
      console.log('[BibleAudio] Available voices:', voices.map(v => v.identifier).join(', '));
    }
    
    return voices.map(voice => {
      const id = voice.identifier || '';
      const name = voice.name || 'Unknown';
      
      // Determine quality tier
      let quality = 'Standard';
      if (id.includes('premium') || id.includes('neural')) {
        quality = 'Premium';
      } else if (id.includes('enhanced')) {
        quality = 'Enhanced';
      } else if (id.includes('siri')) {
        quality = 'Siri';
      } else if (id.includes('compact')) {
        quality = 'Compact';
      }
      
      // Determine accent/region
      let accent = 'US';
      if (id.includes('en-GB') || id.includes('British')) accent = 'UK';
      else if (id.includes('en-AU') || id.includes('Australian')) accent = 'AU';
      else if (id.includes('en-IN') || id.includes('Indian')) accent = 'IN';
      else if (id.includes('en-IE') || id.includes('Irish')) accent = 'IE';
      else if (id.includes('en-ZA') || id.includes('South Africa')) accent = 'ZA';
      
      // Extract display name (clean up identifier)
      let displayName = name;
      if (displayName === 'Unknown' || !displayName) {
        // Try to extract name from identifier
        const parts = id.split('.');
        displayName = parts[parts.length - 1]?.replace(/-/g, ' ').replace('compact', '').trim() || 'Voice';
      }
      
      // Capitalize first letter
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      
      return {
        id: voice.identifier,
        name: displayName,
        fullName: name,
        quality,
        accent,
        language: voice.language || 'en-US',
        isSelected: this.selectedVoice?.identifier === voice.identifier,
      };
    }).sort((a, b) => {
      // Sort by quality (Premium > Enhanced > Siri > Standard > Compact)
      const qualityOrder = { 'Premium': 0, 'Enhanced': 1, 'Siri': 2, 'Standard': 3, 'Compact': 4 };
      const qualityDiff = (qualityOrder[a.quality] || 5) - (qualityOrder[b.quality] || 5);
      if (qualityDiff !== 0) return qualityDiff;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Check if voices are ready
   */
  areVoicesReady() {
    return this.voicesReady;
  }

  /**
   * Get voice statistics for debugging
   */
  getVoiceStats() {
    const all = this.availableVoices;
    const english = all.filter(v => v.language?.startsWith('en') || v.identifier?.includes('en-'));
    const siri = all.filter(v => v.identifier?.includes('siri'));
    const premium = all.filter(v => v.identifier?.includes('premium'));
    const enhanced = all.filter(v => v.identifier?.includes('enhanced'));
    
    return {
      total: all.length,
      english: english.length,
      siri: siri.length,
      premium: premium.length,
      enhanced: enhanced.length,
      selected: this.selectedVoice?.identifier || null,
    };
  }

  /**
   * Get all raw voices (for debugging)
   */
  getAllRawVoices() {
    return this.availableVoices;
  }
}

// Export singleton instance and TTS source options
const bibleAudioService = new BibleAudioService();
export { TTS_SOURCE };
export default bibleAudioService;

