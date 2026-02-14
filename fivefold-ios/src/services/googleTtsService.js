/**
 * Google Cloud Text-to-Speech Service
 * Uses Google's WaveNet voices for realistic, human-like speech
 * 
 * Free tier: 1 million characters/month for WaveNet voices
 * https://cloud.google.com/text-to-speech
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import userStorage from '../utils/userStorage';
import { GOOGLE_TTS_CONFIG } from '../../googleTts.config';

const VOICE_SETTINGS_KEY = 'google_tts_voice_settings';
const CACHE_INDEX_KEY = 'google_tts_cache_index';
const CACHE_DIR = FileSystem.cacheDirectory + 'tts_cache/';
const CACHE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

class GoogleTtsService {
  constructor() {
    this.sound = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.onStateChange = null;
    this.currentVoiceKey = 'studio-female'; // Default voice - premium Studio quality
    this.settings = {
      speakingRate: 0.95,
      pitch: 0,
      dynamicMode: false, // SSML for pauses - disabled by default for stability
    };
    
    // Preloading support - load next verse while current plays
    this.preloadedAudioUri = null;
    this.preloadedSound = null;
    this.isPreloading = false;
    
    // For stopping ongoing speak operations
    this._currentResolve = null;
    
    // Cache index: { [cacheKey]: { path, timestamp, voiceKey } }
    this.cacheIndex = {};
    
    this.loadSettings();
    this.initializeCache();
  }

  /**
   * Initialize cache directory and load cache index
   */
  async initializeCache() {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('[GoogleTTS] Created cache directory');
      }
      
      // Load cache index from AsyncStorage
      const stored = await userStorage.getRaw(CACHE_INDEX_KEY);
      if (stored) {
        this.cacheIndex = JSON.parse(stored);
        console.log(`[GoogleTTS] Loaded cache index with ${Object.keys(this.cacheIndex).length} entries`);
        
        // Clean up expired entries
        await this.cleanupExpiredCache();
      }
    } catch (error) {
      console.log('[GoogleTTS] Cache initialization error:', error);
      this.cacheIndex = {};
    }
  }

  /**
   * Generate a cache key from text and voice settings
   * Uses a simple but effective hash function
   */
  generateCacheKey(text) {
    // Create a unique key based on text + voice + settings
    const keyData = `${text}|${this.currentVoiceKey}|${this.settings.speakingRate}|${this.settings.pitch}`;
    
    // Simple hash function (djb2 algorithm)
    let hash1 = 5381;
    let hash2 = 52711;
    
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1) ^ char;
      hash2 = ((hash2 << 5) + hash2) ^ char;
    }
    
    // Combine both hashes for better uniqueness
    const combined = (Math.abs(hash1) * 4096 + Math.abs(hash2)).toString(36);
    return combined.substring(0, 24); // Use first 24 chars
  }

  /**
   * Check if we have valid cached audio for the text
   */
  async getCachedAudio(text) {
    try {
      const cacheKey = this.generateCacheKey(text);
      const cacheEntry = this.cacheIndex[cacheKey];
      
      if (!cacheEntry) {
        return null;
      }
      
      // Check if expired (1 year)
      const age = Date.now() - cacheEntry.timestamp;
      if (age > CACHE_EXPIRY_MS) {
        console.log('[GoogleTTS] Cache expired for key:', cacheKey);
        await this.removeCacheEntry(cacheKey);
        return null;
      }
      
      // Check if voice settings changed
      if (cacheEntry.voiceKey !== this.currentVoiceKey) {
        console.log('[GoogleTTS] Voice changed, cache invalid');
        return null;
      }
      
      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(cacheEntry.path);
      if (!fileInfo.exists) {
        console.log('[GoogleTTS] Cache file missing:', cacheEntry.path);
        await this.removeCacheEntry(cacheKey);
        return null;
      }
      
      console.log(`[GoogleTTS] Cache HIT! Using cached audio (age: ${Math.round(age / 86400000)} days)`);
      return cacheEntry.path;
      
    } catch (error) {
      console.log('[GoogleTTS] Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Save audio to cache
   */
  async saveToCache(text, audioBase64) {
    try {
      const cacheKey = this.generateCacheKey(text);
      const filePath = CACHE_DIR + `${cacheKey}.mp3`;
      
      // Save audio file
      await FileSystem.writeAsStringAsync(filePath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Update cache index
      this.cacheIndex[cacheKey] = {
        path: filePath,
        timestamp: Date.now(),
        voiceKey: this.currentVoiceKey,
        textPreview: text.substring(0, 50),
      };
      
      // Save index to AsyncStorage
      await userStorage.setRaw(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
      
      console.log(`[GoogleTTS] Cached audio: ${cacheKey} (total cached: ${Object.keys(this.cacheIndex).length})`);
      return filePath;
      
    } catch (error) {
      console.log('[GoogleTTS] Cache save error:', error);
      return null;
    }
  }

  /**
   * Remove a cache entry
   */
  async removeCacheEntry(cacheKey) {
    try {
      const entry = this.cacheIndex[cacheKey];
      if (entry?.path) {
        await FileSystem.deleteAsync(entry.path, { idempotent: true });
      }
      delete this.cacheIndex[cacheKey];
      await userStorage.setRaw(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
    } catch (error) {
      console.log('[GoogleTTS] Cache removal error:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache() {
    try {
      const now = Date.now();
      let removed = 0;
      
      for (const [key, entry] of Object.entries(this.cacheIndex)) {
        if (now - entry.timestamp > CACHE_EXPIRY_MS) {
          await this.removeCacheEntry(key);
          removed++;
        }
      }
      
      if (removed > 0) {
        console.log(`[GoogleTTS] Cleaned up ${removed} expired cache entries`);
      }
    } catch (error) {
      console.log('[GoogleTTS] Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Object.values(this.cacheIndex);
    return {
      totalEntries: entries.length,
      oldestEntry: entries.length > 0 
        ? new Date(Math.min(...entries.map(e => e.timestamp))).toLocaleDateString() 
        : null,
      newestEntry: entries.length > 0 
        ? new Date(Math.max(...entries.map(e => e.timestamp))).toLocaleDateString() 
        : null,
    };
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      this.cacheIndex = {};
      await userStorage.setRaw(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
      console.log('[GoogleTTS] Cache cleared');
      return true;
    } catch (error) {
      console.log('[GoogleTTS] Cache clear error:', error);
      return false;
    }
  }

  /**
   * Reset all settings to defaults (use when voice errors occur)
   */
  async resetToDefaults() {
    try {
      console.log('[GoogleTTS] Resetting to defaults...');
      this.currentVoiceKey = 'studio-female';
      this.settings = {
        speakingRate: 0.95,
        pitch: 0,
        dynamicMode: false,
      };
      await userStorage.remove(VOICE_SETTINGS_KEY);
      await this.clearCache();
      console.log('[GoogleTTS] Reset complete');
      return true;
    } catch (error) {
      console.log('[GoogleTTS] Reset error:', error);
      return false;
    }
  }

  /**
   * Load saved settings
   */
  async loadSettings() {
    try {
      const stored = await userStorage.getRaw(VOICE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedVoiceKey = parsed.voiceKey;
        
        // Validate that the saved voice key exists in the config
        if (savedVoiceKey && GOOGLE_TTS_CONFIG.voices[savedVoiceKey]) {
          this.currentVoiceKey = savedVoiceKey;
          console.log('[GoogleTTS] Loaded valid voice:', savedVoiceKey);
        } else {
          // Reset to default if saved voice is invalid
          console.log('[GoogleTTS] Saved voice key invalid, resetting to default:', savedVoiceKey);
          this.currentVoiceKey = 'studio-female'; // Premium default
          // Save the corrected settings immediately
          await userStorage.setRaw(VOICE_SETTINGS_KEY, JSON.stringify({
            voiceKey: this.currentVoiceKey,
            settings: parsed.settings || this.settings,
          }));
          console.log('[GoogleTTS] Saved corrected voice settings');
        }
        
        this.settings = { ...this.settings, ...parsed.settings };
      }
    } catch (error) {
      console.log('[GoogleTTS] Failed to load settings:', error);
      // On error, ensure we have a valid voice
      this.currentVoiceKey = 'studio-female';
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    try {
      await userStorage.setRaw(VOICE_SETTINGS_KEY, JSON.stringify({
        voiceKey: this.currentVoiceKey,
        settings: this.settings,
      }));
    } catch (error) {
      console.log('[GoogleTTS] Failed to save settings:', error);
    }
  }

  /**
   * Get available voice options grouped by tier
   */
  getAvailableVoices() {
    return Object.entries(GOOGLE_TTS_CONFIG.voices).map(([key, voice]) => ({
      id: key,
      name: this.formatVoiceName(key),
      languageCode: voice.languageCode,
      gender: voice.ssmlGender,
      tier: voice.tier || 'Standard',
      description: voice.description || '',
      isSelected: key === this.currentVoiceKey,
    }));
  }

  /**
   * Get voices grouped by tier
   */
  getVoicesGroupedByTier() {
    const voices = this.getAvailableVoices();
    const grouped = {};
    
    // Define tier order - GenZ first since user wants young voices!
    const tierOrder = ['GenZ', 'ChirpHD', 'Studio', 'Neural2', 'WaveNet'];
    
    tierOrder.forEach(tier => {
      const tierVoices = voices.filter(v => v.tier === tier);
      if (tierVoices.length > 0) {
        grouped[tier] = tierVoices;
      }
    });
    
    return grouped;
  }

  /**
   * Format voice key into readable name
   */
  formatVoiceName(key) {
    // Handle different naming patterns
    if (key.startsWith('studio-')) {
      return key.includes('female') ? 'Studio Female' : 'Studio Male';
    }
    if (key.startsWith('neural-')) {
      const parts = key.split('-');
      const gender = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      const num = parts[2] || '';
      return `Neural ${gender} ${num}`;
    }
    if (key.startsWith('wavenet-')) {
      const parts = key.split('-');
      const gender = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      const accent = parts[2]?.toUpperCase() || 'US';
      return `${gender} (${accent})`;
    }
    if (key.startsWith('casual-')) {
      return key.includes('female') ? 'Casual Girl' : 'Casual Guy';
    }
    if (key.startsWith('chirp-hd-')) {
      const parts = key.split('-');
      const gender = parts[2]?.includes('female') ? 'Female' : 'Male';
      const num = parts[3] || '';
      return `Chirp HD ${gender} ${num}`.trim();
    }
    if (key.startsWith('chirp-')) {
      // Named Chirp3 voices like chirp-zephyr, chirp-aoede
      const name = key.replace('chirp-', '');
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    // Fallback
    return key.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  /**
   * Set the current voice
   */
  async setVoice(voiceKey) {
    if (GOOGLE_TTS_CONFIG.voices[voiceKey]) {
      this.currentVoiceKey = voiceKey;
      await this.saveSettings();
      console.log('[GoogleTTS] Voice set to:', voiceKey);
      return true;
    }
    return false;
  }

  /**
   * Get current voice info
   */
  getCurrentVoice() {
    const voiceConfig = GOOGLE_TTS_CONFIG.voices[this.currentVoiceKey] || GOOGLE_TTS_CONFIG.defaultVoice;
    // Only return properties Google API expects (not tier, description, etc.)
    return {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    };
  }

  /**
   * Get full voice info including display properties
   */
  getCurrentVoiceInfo() {
    return {
      id: this.currentVoiceKey,
      displayName: this.formatVoiceName(this.currentVoiceKey),
      ...GOOGLE_TTS_CONFIG.voices[this.currentVoiceKey],
    };
  }

  /**
   * Set speaking rate
   * @param {number} rate - Rate between 0.25 and 4.0 (1.0 is normal)
   */
  async setSpeakingRate(rate) {
    this.settings.speakingRate = Math.max(0.25, Math.min(4.0, rate));
    await this.saveSettings();
  }

  /**
   * Set pitch
   * @param {number} pitch - Pitch between -20.0 and 20.0 (0 is normal)
   */
  async setPitch(pitch) {
    this.settings.pitch = Math.max(-20.0, Math.min(20.0, pitch));
    await this.saveSettings();
  }

  /**
   * Toggle dynamic mode (SSML with pauses and emphasis)
   */
  async setDynamicMode(enabled) {
    this.settings.dynamicMode = enabled;
    await this.saveSettings();
    console.log('[GoogleTTS] Dynamic mode:', enabled ? 'ON' : 'OFF');
  }

  /**
   * Get dynamic mode status
   */
  isDynamicMode() {
    return this.settings.dynamicMode;
  }

  /**
   * Apply voice style preset
   * @param {string} style - 'normal', 'young', 'deep', 'fast', 'slow'
   */
  async applyStylePreset(style) {
    switch (style) {
      case 'young':
        // Higher pitch, slightly faster for younger sound
        this.settings.pitch = 2.5;
        this.settings.speakingRate = 1.05;
        break;
      case 'deep':
        // Lower pitch, slightly slower for authoritative sound
        this.settings.pitch = -3.0;
        this.settings.speakingRate = 0.9;
        break;
      case 'fast':
        this.settings.speakingRate = 1.15;
        break;
      case 'slow':
        this.settings.speakingRate = 0.8;
        break;
      case 'normal':
      default:
        this.settings.pitch = 0;
        this.settings.speakingRate = 0.95;
        break;
    }
    await this.saveSettings();
    console.log('[GoogleTTS] Applied style preset:', style);
  }

  /**
   * Get available style presets
   */
  getStylePresets() {
    return [
      { id: 'normal', name: 'Normal', description: 'Balanced, natural tone' },
      { id: 'young', name: 'Younger', description: 'Slightly higher pitch, more upbeat' },
      { id: 'deep', name: 'Deeper', description: 'Lower pitch, more authoritative' },
      { id: 'fast', name: 'Faster', description: 'Quicker pace' },
      { id: 'slow', name: 'Slower', description: 'Relaxed, contemplative pace' },
    ];
  }

  /**
   * Notify state change listeners
   */
  _notifyStateChange(state) {
    if (this.onStateChange) {
      this.onStateChange(state, {
        isLoading: this.isLoading,
        isPlaying: this.isPlaying,
      });
    }
  }

  /**
   * Configure audio session for playback
   */
  async configureAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.log('[GoogleTTS] Failed to configure audio:', error);
    }
  }

  /**
   * Escape special XML characters
   */
  escapeXML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert plain text to SSML with dynamic pauses and emphasis
   * Makes the speech more natural and engaging
   */
  convertToSSML(text) {
    if (!text) return '<speak></speak>';
    
    // First escape XML special characters
    let ssml = this.escapeXML(text);
    
    ssml = ssml
      // Handle ellipsis - dramatic pause
      .replace(/\.\.\./g, '<break time="400ms"/>')
      .replace(/\u2026/g, '<break time="400ms"/>')
      
      // Handle periods followed by space - pause
      .replace(/\. /g, '. <break time="300ms"/>')
      
      // Handle question marks - slight pause
      .replace(/\? /g, '? <break time="250ms"/>')
      
      // Handle exclamation - pause
      .replace(/! /g, '! <break time="250ms"/>')
      
      // Handle colons - medium pause (good for "Jesus said:")
      .replace(/: /g, ': <break time="200ms"/>')
      
      // Handle semicolons - medium pause
      .replace(/; /g, '; <break time="150ms"/>');
    
    return `<speak>${ssml}</speak>`;
  }

  /**
   * Speak text using Google Cloud TTS
   * @param {string} text - Text to speak
   * @param {boolean} useSSML - Whether to convert text to SSML for dynamic speech
   * @returns {Promise<boolean>} - Success status
   */
  async speak(text, useSSML = true) {
    try {
      if (!text || text.trim().length === 0) {
        console.log('[GoogleTTS] Empty text, skipping');
        return false;
      }

      // Stop any current playback
      await this.stop();

      this.isLoading = true;
      this._notifyStateChange('loading');

      console.log('[GoogleTTS] Preparing speech for:', text.substring(0, 50) + '...');

      // Check cache first!
      const cachedAudioUri = await this.getCachedAudio(text);
      let audioUri;
      
      if (cachedAudioUri) {
        // Use cached audio - instant playback!
        audioUri = cachedAudioUri;
        console.log('[GoogleTTS] Using CACHED audio - instant playback!');
      } else {
        // No cache - need to call API
        console.log('[GoogleTTS] Cache MISS - calling Google TTS API...');
        
        // Get current voice config
        const voiceConfig = GOOGLE_TTS_CONFIG.voices[this.currentVoiceKey] || GOOGLE_TTS_CONFIG.defaultVoice;

        // Convert to SSML for more dynamic speech (if enabled)
        const useDynamic = useSSML && this.settings.dynamicMode;
        const inputContent = useDynamic ? this.convertToSSML(text) : text;
        const inputType = useDynamic ? 'ssml' : 'text';
        
        if (useDynamic) {
          console.log('[GoogleTTS] Using dynamic SSML mode for natural pauses');
        }

        // Build request body
        const requestBody = {
          input: { [inputType]: inputContent },
          voice: {
            languageCode: voiceConfig.languageCode,
            name: voiceConfig.name,
            ssmlGender: voiceConfig.ssmlGender,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: this.settings.speakingRate,
            pitch: this.settings.pitch,
          },
        };

        // Call Google Cloud TTS API
        const url = `${GOOGLE_TTS_CONFIG.apiUrl}?key=${GOOGLE_TTS_CONFIG.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[GoogleTTS] API error:', response.status);
          console.error('[GoogleTTS] Error details:', errorText);
          console.error('[GoogleTTS] Request body was:', JSON.stringify(requestBody, null, 2));
          
          // If voice is invalid (400 error), try fallback
          if (response.status === 400) {
            console.log('[GoogleTTS] 400 error - trying fallback voice en-US-Wavenet-F...');
            
            // Reset to a guaranteed working voice
            this.currentVoiceKey = 'wavenet-female-us';
            await this.saveSettings();
            
            // Build fallback request with hardcoded known-working values
            const fallbackBody = {
              input: { text: text },
              voice: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-F',
                ssmlGender: 'FEMALE',
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 0.95,
                pitch: 0,
              },
            };
            
            console.log('[GoogleTTS] Fallback request:', JSON.stringify(fallbackBody, null, 2));
            
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackBody),
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (retryData.audioContent) {
                console.log('[GoogleTTS] Fallback voice succeeded!');
                const cachedPath = await this.saveToCache(text, retryData.audioContent);
                audioUri = cachedPath || FileSystem.cacheDirectory + `tts_audio_${Date.now()}.mp3`;
                if (!cachedPath) {
                  await FileSystem.writeAsStringAsync(audioUri, retryData.audioContent, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                }
                // Continue to playback below
              } else {
                console.error('[GoogleTTS] Fallback returned no audio content');
                this.isLoading = false;
                this._notifyStateChange('error');
                return false;
              }
            } else {
              const retryError = await retryResponse.text();
              console.error('[GoogleTTS] Fallback also failed:', retryResponse.status, retryError);
              this.isLoading = false;
              this._notifyStateChange('error');
              return false;
            }
          } else {
            console.error('[GoogleTTS] Non-400 error, cannot retry');
            this.isLoading = false;
            this._notifyStateChange('error');
            return false;
          }
        } else {
          // Response was OK - process the audio
          const data = await response.json();
          
          if (!data.audioContent) {
            console.error('[GoogleTTS] No audio content in response');
            this.isLoading = false;
            this._notifyStateChange('error');
            return false;
          }

          console.log('[GoogleTTS] Received audio from API');

          // Save to cache for future use (1 year!)
          const cachedPath = await this.saveToCache(text, data.audioContent);
          
          if (cachedPath) {
            audioUri = cachedPath;
          } else {
            // Fallback: save to temp file if cache fails
            audioUri = FileSystem.cacheDirectory + `tts_audio_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(audioUri, data.audioContent, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        }
      }

      console.log('[GoogleTTS] Playing audio...');

      // Configure audio session
      await this.configureAudio();

      // Load and play audio - return a Promise that resolves when finished or stopped
      return new Promise(async (resolve) => {
        let resolved = false;
        
        // Store resolve function so stop() can call it
        this._currentResolve = () => {
          if (!resolved) {
            console.log('[GoogleTTS] Playback stopped externally');
            resolved = true;
            clearTimeout(timeout);
            resolve(true);
          }
        };
        
        // Safety timeout - if audio doesn't finish in 5 minutes, something is wrong
        const timeout = setTimeout(() => {
          if (!resolved) {
            console.warn('[GoogleTTS] Audio playback timeout');
            resolved = true;
            this.isPlaying = false;
            this._notifyStateChange('finished');
            this._cleanup();
            resolve(true);
          }
        }, 300000); // 5 minutes for long stories
        
        try {
          // IMPORTANT: Set isPlaying BEFORE creating sound to avoid race condition
          // The status callback can fire immediately after createAsync
          this.isPlaying = true;
          let hasActuallyStartedPlaying = false;
          
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true },
            (status) => {
              // Track when audio actually starts playing
              if (status.isLoaded && status.isPlaying && !hasActuallyStartedPlaying) {
                hasActuallyStartedPlaying = true;
                console.log('[GoogleTTS] Audio actually started playing');
              }
              
              // Handle playback completion
              if (status.didJustFinish && !resolved) {
                console.log('[GoogleTTS] Playback finished normally');
                resolved = true;
                clearTimeout(timeout);
                this.isPlaying = false;
                this._notifyStateChange('finished');
                this._cleanup();
                resolve(true);
              }
              // Handle stop - ONLY if we actually started playing first
              if (hasActuallyStartedPlaying && status.isLoaded && !status.isPlaying && !status.didJustFinish && !resolved) {
                console.log('[GoogleTTS] Playback was stopped');
                resolved = true;
                clearTimeout(timeout);
                this.isPlaying = false;
                this._cleanup();
                resolve(true);
              }
              // Handle errors during playback
              if (status.error && !resolved) {
                console.error('[GoogleTTS] Playback error:', status.error);
                resolved = true;
                clearTimeout(timeout);
                this.isPlaying = false;
                this._notifyStateChange('error');
                this._cleanup();
                resolve(false);
              }
            }
          );

          this.sound = sound;
          this.isLoading = false;
          this._notifyStateChange('playing');
          
        } catch (playError) {
          if (!resolved) {
            console.error('[GoogleTTS] Audio load error:', playError);
            resolved = true;
            clearTimeout(timeout);
            this.isLoading = false;
            this.isPlaying = false;
            this._notifyStateChange('error');
            resolve(false);
          }
        }
      });

    } catch (error) {
      console.error('[GoogleTTS] Speak error:', error);
      this.isLoading = false;
      this.isPlaying = false;
      this._notifyStateChange('error');
      return false;
    }
  }

  /**
   * Preload audio for the next verse (call while current verse is playing)
   * This fetches and saves the audio file but doesn't play it
   * Uses cache if available!
   */
  async preload(text) {
    if (this.isPreloading) {
      console.log('[GoogleTTS] Already preloading, skipping');
      return false;
    }
    
    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('[GoogleTTS] Preload skipped - empty text');
      return false;
    }
    
    console.log('[GoogleTTS] Preloading next verse...');
    this.isPreloading = true;
    
    try {
      // Check cache first!
      const cachedAudioUri = await this.getCachedAudio(text);
      
      if (cachedAudioUri) {
        // Use cached audio - instant!
        console.log('[GoogleTTS] Preload: Using CACHED audio!');
        this.preloadedAudioUri = cachedAudioUri;
        this.isPreloading = false;
        return true;
      }
      
      // No cache - need to call API
      console.log('[GoogleTTS] Preload: Cache MISS - calling API...');
      
      const voice = this.getCurrentVoice();
      const useSSML = this.settings.dynamicMode;
      
      let requestBody;
      if (useSSML) {
        const ssmlText = this.convertToSSML(text);
        requestBody = {
          input: { ssml: ssmlText },
          voice: voice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: this.settings.speakingRate,
            pitch: this.settings.pitch,
          },
        };
      } else {
        requestBody = {
          input: { text },
          voice: voice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: this.settings.speakingRate,
            pitch: this.settings.pitch,
          },
        };
      }

      console.log('[GoogleTTS] Preload request for text:', text.substring(0, 50) + '...');
      
      const response = await fetch(`${GOOGLE_TTS_CONFIG.apiUrl}?key=${GOOGLE_TTS_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[GoogleTTS] Preload API error:', response.status, errorData?.error?.message || '');
        this.isPreloading = false;
        return false;
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        console.error('[GoogleTTS] No audio content in preload response');
        this.isPreloading = false;
        return false;
      }

      // Save to cache for future use (1 year!)
      const cachedPath = await this.saveToCache(text, data.audioContent);
      
      // Store for later playback
      this.preloadedAudioUri = cachedPath || FileSystem.cacheDirectory + `tts_preload_${Date.now()}.mp3`;
      
      if (!cachedPath) {
        // Fallback if cache save failed
        await FileSystem.writeAsStringAsync(this.preloadedAudioUri, data.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      
      this.isPreloading = false;
      
      console.log('[GoogleTTS] Preload complete, ready to play');
      return true;
      
    } catch (error) {
      console.error('[GoogleTTS] Preload error:', error);
      this.isPreloading = false;
      return false;
    }
  }

  /**
   * Check if we have preloaded audio ready
   */
  hasPreloadedAudio() {
    return !!this.preloadedAudioUri;
  }

  /**
   * Play preloaded audio (returns Promise that resolves when finished)
   */
  async playPreloaded() {
    if (!this.preloadedAudioUri) {
      console.log('[GoogleTTS] No preloaded audio available');
      return false;
    }
    
    const audioUri = this.preloadedAudioUri;
    this.preloadedAudioUri = null; // Clear after use
    
    console.log('[GoogleTTS] Playing preloaded audio...');
    
    await this.configureAudio();
    
    return new Promise(async (resolve) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.warn('[GoogleTTS] Preloaded playback timeout');
          resolved = true;
          this.isPlaying = false;
          this._notifyStateChange('finished');
          this._cleanup();
          resolve(true);
        }
      }, 60000);
      
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (status) => {
            if (status.didJustFinish && !resolved) {
              console.log('[GoogleTTS] Preloaded playback finished');
              resolved = true;
              clearTimeout(timeout);
              this.isPlaying = false;
              this._notifyStateChange('finished');
              this._cleanup();
              resolve(true);
            }
            if (status.error && !resolved) {
              console.error('[GoogleTTS] Preloaded playback error:', status.error);
              resolved = true;
              clearTimeout(timeout);
              this.isPlaying = false;
              this._notifyStateChange('error');
              this._cleanup();
              resolve(false);
            }
          }
        );

        this.sound = sound;
        this.isPlaying = true;
        this._notifyStateChange('playing');
        
      } catch (playError) {
        if (!resolved) {
          console.error('[GoogleTTS] Preloaded audio load error:', playError);
          resolved = true;
          clearTimeout(timeout);
          this.isPlaying = false;
          this._notifyStateChange('error');
          resolve(false);
        }
      }
    });
  }

  /**
   * Clear any preloaded audio
   */
  clearPreloaded() {
    this.preloadedAudioUri = null;
    this.isPreloading = false;
  }

  /**
   * Clean up sound object
   */
  async _cleanup() {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.sound = null;
    }
  }

  /**
   * Stop playback
   */
  async stop() {
    console.log('[GoogleTTS] Stop called');
    this.isPlaying = false;
    this.isLoading = false;
    
    // Resolve any pending speak promise immediately
    if (this._currentResolve) {
      this._currentResolve();
      this._currentResolve = null;
    }
    
    // Stop main sound - mute first for immediate silence, then stop
    try {
      if (this.sound) {
        // Mute immediately for instant silence
        await this.sound.setVolumeAsync(0);
        await this.sound.stopAsync();
        await this._cleanup();
      }
    } catch (error) {
      console.log('[GoogleTTS] Stop error (ignored):', error.message);
    }
    
    // Also clean up any preloaded sound
    try {
      if (this.preloadedSound) {
        await this.preloadedSound.unloadAsync();
        this.preloadedSound = null;
      }
      this.preloadedAudioUri = null;
      this.isPreloading = false;
    } catch (error) {
      console.log('[GoogleTTS] Preload cleanup error (ignored):', error.message);
    }
    
    this._notifyStateChange('stopped');
  }

  /**
   * Pause playback
   */
  async pause() {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
        this._notifyStateChange('paused');
      }
    } catch (error) {
      console.log('[GoogleTTS] Pause error:', error);
    }
  }

  /**
   * Resume playback
   */
  async resume() {
    try {
      if (this.sound && !this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
        this._notifyStateChange('playing');
      }
    } catch (error) {
      console.log('[GoogleTTS] Resume error:', error);
    }
  }

  /**
   * Check if service is available (has API key)
   */
  async checkAvailability() {
    return !!GOOGLE_TTS_CONFIG.apiKey;
  }

  /**
   * Preview a voice with sample text
   */
  async previewVoice(voiceKey, sampleText = 'The Lord is my shepherd, I shall not want.') {
    const previousVoice = this.currentVoiceKey;
    this.currentVoiceKey = voiceKey;
    
    const success = await this.speak(sampleText);
    
    // Restore previous voice if preview fails
    if (!success) {
      this.currentVoiceKey = previousVoice;
    }
    
    return success;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isAvailable: !!GOOGLE_TTS_CONFIG.apiKey,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentVoice: this.getCurrentVoiceInfo(),
      settings: this.settings,
    };
  }
}

// Export singleton instance
const googleTtsService = new GoogleTtsService();
export default googleTtsService;
