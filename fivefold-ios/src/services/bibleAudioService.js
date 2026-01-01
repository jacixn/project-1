/**
 * Bible Audio Service
 * High-quality text-to-speech for Bible verse reading
 * Uses iOS enhanced/premium voices for natural speech
 * 
 * For best quality, users should download enhanced voices:
 * Settings > Accessibility > Spoken Content > Voices > English > Download enhanced voice
 */

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';

const AUDIO_SETTINGS_KEY = 'bible_audio_settings';

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
    this.currentVerse = null;
    this.autoPlayEnabled = false;
    this.verses = [];
    this.currentVerseIndex = 0;
    this.settings = {
      voiceGender: 'female', // 'male' or 'female'
      rate: 0.46, // 0.0 to 1.0 (slower for natural Bible reading)
      pitch: 1.0, // 0.5 to 2.0 (natural pitch)
      volume: 1.0, // 0.0 to 1.0
    };
    this.availableVoices = [];
    this.selectedVoice = null;
    this.onPlaybackStateChange = null;
    this.onVerseChange = null;
    this.onComplete = null;
    this.hasEnhancedVoice = false;
    this.hasPromptedForVoices = false;
    this.currentBook = '';
    this.currentChapter = 0;
    
    this.loadSettings();
    this.initializeVoices();
  }

  /**
   * Initialize and discover available voices
   */
  async initializeVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      this.availableVoices = voices;
      
      // Find the best voice for current gender setting
      await this.selectBestVoice();
      
      // Check if we have good quality voices
      this.hasEnhancedVoice = this.checkForEnhancedVoices();
      
      console.log(`[BibleAudio] Found ${voices.length} voices, selected: ${this.selectedVoice?.identifier || 'default'}`);
      console.log(`[BibleAudio] Has enhanced voice: ${this.hasEnhancedVoice}`);
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
      const stored = await AsyncStorage.getItem(AUDIO_SETTINGS_KEY);
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
      await AsyncStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
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
    // Stop current speech but preserve autoPlayEnabled state
    const wasAutoPlay = this.autoPlayEnabled;
    await Speech.stop();
    this.autoPlayEnabled = wasAutoPlay; // Restore auto-play state
    
    // Prompt for enhanced voices on first use (if not available)
    if (!this.hasEnhancedVoice && !this.hasPromptedForVoices) {
      // Delay prompt slightly so audio starts first
      setTimeout(() => this.promptForEnhancedVoices(), 2000);
    }
    
    this.isPlaying = true;
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
    
    console.log(`[BibleAudio] Starting auto-play from verse ${startIndex + 1} of ${verses.length} verses`);
    
    // First verse gets full reference announcement
    await this.playNextVerse(book, chapter, true);
  }

  /**
   * Play the next verse in auto-play mode
   */
  async playNextVerse(book, chapter, isFirstVerse = false) {
    if (!this.autoPlayEnabled || this.currentVerseIndex >= this.verses.length) {
      this.stopAutoPlay();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }
    
    const verse = this.verses[this.currentVerseIndex];
    const verseNumber = verse.number || verse.verse;
    
    if (this.onVerseChange) {
      this.onVerseChange(verse, this.currentVerseIndex);
    }
    
    try {
      // For first verse: announce full reference (book, chapter, verse)
      // For subsequent verses in same chapter: just say "verse X" then content
      if (isFirstVerse) {
        await this.speakVerse({ 
          book, 
          chapter, 
          verse, 
          announceReference: true 
        });
      } else {
        // Just announce verse number for continuation
        await this.speakVerseNumberOnly({ 
          verseNumber, 
          verseText: verse.content || verse.text 
        });
      }
      
      if (this.autoPlayEnabled) {
        this.currentVerseIndex++;
        
        // Short pause between verses for natural flow
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Continue to next verse
        await this.playNextVerse(book, chapter, false);
      }
    } catch (error) {
      console.error('[BibleAudio] Error playing verse:', error);
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
    this.autoPlayEnabled = wasAutoPlay;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.notifyStateChange();
    
    // Build text: "Verse 5. [content]"
    let textToSpeak = `Verse ${verseNumber}. ${verseText}`;
    textToSpeak = this.cleanTextForSpeech(textToSpeak);
    
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
    this.stop();
  }

  /**
   * Clean text for better speech synthesis
   * Optimized for natural Bible reading with proper pacing
   */
  cleanTextForSpeech(text) {
    if (!text) return '';
    
    return text
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
      // Add natural pauses for Bible reading rhythm
      .replace(/\. /g, '... ')
      .replace(/; /g, '.. ')
      .replace(/: /g, '.. ')
      .replace(/\? /g, '... ')
      .replace(/! /g, '... ')
      .replace(/, /g, ', ')
      // Handle quotes with slight pause
      .replace(/"/g, '')
      .replace(/'/g, "'")
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Stop current speech
   */
  async stop() {
    await Speech.stop();
    this.isPlaying = false;
    this.isPaused = false;
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
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange({
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        autoPlayEnabled: this.autoPlayEnabled,
        currentVerse: this.currentVerse,
        currentVerseIndex: this.currentVerseIndex,
      });
    }
  }

  /**
   * Get available voices list
   */
  getAvailableVoices() {
    return this.availableVoices.filter(v => v.language?.startsWith('en'));
  }

  /**
   * Get current voice info
   */
  getCurrentVoice() {
    return this.selectedVoice;
  }
}

// Export singleton instance
export default new BibleAudioService();

