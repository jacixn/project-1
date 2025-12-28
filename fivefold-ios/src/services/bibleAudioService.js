/**
 * Bible Audio Service
 * High-quality text-to-speech for Bible verse reading
 * Uses iOS native Siri voices for natural, human-like speech
 */

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIO_SETTINGS_KEY = 'bible_audio_settings';

// Voice presets for different genders
// These use iOS's enhanced neural voices which sound very natural
const VOICE_PRESETS = {
  male: {
    // Premium male voices available on iOS
    voices: [
      'com.apple.voice.premium.en-US.Aaron', // Deep, warm male voice
      'com.apple.voice.enhanced.en-US.Aaron',
      'com.apple.ttsbundle.siri_Aaron_en-US_compact', // Siri Aaron
      'com.apple.voice.premium.en-GB.Daniel', // British Daniel
      'com.apple.voice.enhanced.en-GB.Daniel',
      'com.apple.ttsbundle.Daniel-compact', // Fallback Daniel
      'com.apple.ttsbundle.siri_male_en-US_compact',
    ],
    pitch: 0.95,
    rate: 0.52, // Slightly slower for clarity
  },
  female: {
    // Premium female voices available on iOS
    voices: [
      'com.apple.voice.premium.en-US.Samantha', // Warm female voice
      'com.apple.voice.enhanced.en-US.Samantha',
      'com.apple.ttsbundle.siri_Samantha_en-US_compact', // Siri Samantha
      'com.apple.voice.premium.en-GB.Kate', // British Kate
      'com.apple.voice.enhanced.en-GB.Kate',
      'com.apple.ttsbundle.Samantha-compact', // Fallback Samantha
      'com.apple.ttsbundle.siri_female_en-US_compact',
    ],
    pitch: 1.0,
    rate: 0.52,
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
      rate: 0.52, // 0.0 to 1.0 (0.52 is a good reading pace)
      pitch: 1.0, // 0.5 to 2.0
      volume: 1.0, // 0.0 to 1.0
    };
    this.availableVoices = [];
    this.selectedVoice = null;
    this.onPlaybackStateChange = null;
    this.onVerseChange = null;
    this.onComplete = null;
    
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
      
      console.log(`[BibleAudio] Found ${voices.length} voices, selected: ${this.selectedVoice?.identifier || 'default'}`);
    } catch (error) {
      console.error('[BibleAudio] Failed to get voices:', error);
    }
  }

  /**
   * Select the best available voice based on gender preference
   */
  async selectBestVoice() {
    const preset = VOICE_PRESETS[this.settings.voiceGender];
    
    // Try to find a matching premium/enhanced voice
    for (const preferredVoice of preset.voices) {
      const found = this.availableVoices.find(v => 
        v.identifier === preferredVoice || 
        v.identifier.includes(preferredVoice.split('.').pop())
      );
      if (found) {
        this.selectedVoice = found;
        return;
      }
    }

    // Fallback: find any English voice matching the gender
    const genderKeywords = this.settings.voiceGender === 'male' 
      ? ['aaron', 'daniel', 'james', 'tom', 'alex', 'male']
      : ['samantha', 'kate', 'victoria', 'susan', 'allison', 'female'];
    
    const englishVoices = this.availableVoices.filter(v => 
      v.language?.startsWith('en') || v.identifier?.includes('en')
    );
    
    for (const voice of englishVoices) {
      const id = voice.identifier?.toLowerCase() || '';
      const name = voice.name?.toLowerCase() || '';
      if (genderKeywords.some(kw => id.includes(kw) || name.includes(kw))) {
        this.selectedVoice = voice;
        return;
      }
    }

    // Ultimate fallback: first English voice
    this.selectedVoice = englishVoices[0] || this.availableVoices[0] || null;
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
    await this.stop();
    
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
    
    console.log(`[BibleAudio] Starting auto-play from verse ${startIndex + 1}`);
    
    await this.playNextVerse(book, chapter, true);
  }

  /**
   * Play the next verse in auto-play mode
   */
  async playNextVerse(book, chapter, announceReference = true) {
    if (!this.autoPlayEnabled || this.currentVerseIndex >= this.verses.length) {
      this.stopAutoPlay();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }
    
    const verse = this.verses[this.currentVerseIndex];
    
    if (this.onVerseChange) {
      this.onVerseChange(verse, this.currentVerseIndex);
    }
    
    try {
      // Announce reference for first verse, then just continue reading
      await this.speakVerse({ 
        book, 
        chapter, 
        verse, 
        announceReference: announceReference || this.currentVerseIndex === 0
      });
      
      if (this.autoPlayEnabled) {
        this.currentVerseIndex++;
        
        // Short pause between verses for natural flow
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Continue to next verse (announce reference every 5 verses for context)
        const shouldAnnounce = this.currentVerseIndex % 5 === 0;
        await this.playNextVerse(book, chapter, shouldAnnounce);
      }
    } catch (error) {
      console.error('[BibleAudio] Error playing verse:', error);
      this.stopAutoPlay();
    }
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
   */
  cleanTextForSpeech(text) {
    if (!text) return '';
    
    return text
      // Remove verse numbers in brackets or parentheses
      .replace(/\[\d+\]/g, '')
      .replace(/\(\d+\)/g, '')
      // Replace common abbreviations
      .replace(/\bLORD\b/g, 'Lord')
      .replace(/\bGOD\b/g, 'God')
      // Add pauses for better pacing
      .replace(/\. /g, '. ... ')
      .replace(/; /g, '; ... ')
      .replace(/: /g, ': ... ')
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

