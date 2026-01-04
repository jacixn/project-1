/**
 * Chatterbox TTS Service
 * Uses Hugging Face Spaces to generate realistic AI voices
 * Falls back to device TTS if unavailable
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';

// Hugging Face Chatterbox Space API
const CHATTERBOX_API = 'https://resemble-ai-chatterbox-turbo-demo.hf.space';

class ChatterboxService {
  constructor() {
    this.sound = null;
    this.isLoading = false;
    this.isPlaying = false;
    this.onStateChange = null;
    this.isAvailable = true; // Will be checked on first use
  }

  /**
   * Generate speech using Chatterbox TTS
   * @param {string} text - Text to convert to speech
   * @param {object} options - Optional settings
   * @returns {Promise<string>} - Path to audio file
   */
  async generateSpeech(text, options = {}) {
    if (this.isLoading) {
      console.log('[Chatterbox] Already generating speech...');
      return null;
    }

    this.isLoading = true;
    this._notifyStateChange('loading');

    try {
      console.log('[Chatterbox] Generating speech for:', text.substring(0, 50) + '...');

      // Call the Hugging Face Gradio API
      const sessionResponse = await fetch(`${CHATTERBOX_API}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            text,           // Text to synthesize
            null,           // Audio prompt (null for default voice)
            0.5,            // Exaggeration (0-1)
            0.5,            // CFG weight (0-1)
          ],
          fn_index: 0,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error(`API returned ${sessionResponse.status}`);
      }

      const result = await sessionResponse.json();
      
      if (!result.data || !result.data[0]) {
        throw new Error('No audio data in response');
      }

      // The response contains a file path or base64 audio
      const audioData = result.data[0];
      
      // If it's a file path from the Space
      if (typeof audioData === 'object' && audioData.path) {
        const audioUrl = `${CHATTERBOX_API}/file=${audioData.path}`;
        return await this._downloadAudio(audioUrl);
      }
      
      // If it's base64 data
      if (typeof audioData === 'string' && audioData.startsWith('data:audio')) {
        return await this._saveBase64Audio(audioData);
      }

      throw new Error('Unexpected audio format');

    } catch (error) {
      console.error('[Chatterbox] Error generating speech:', error);
      this.isLoading = false;
      this._notifyStateChange('error');
      throw error;
    }
  }

  /**
   * Download audio from URL
   */
  async _downloadAudio(url) {
    const localPath = `${FileSystem.cacheDirectory}chatterbox_${Date.now()}.wav`;
    
    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download audio');
    }

    this.isLoading = false;
    this._notifyStateChange('ready');
    return localPath;
  }

  /**
   * Save base64 audio to file
   */
  async _saveBase64Audio(base64Data) {
    const localPath = `${FileSystem.cacheDirectory}chatterbox_${Date.now()}.wav`;
    
    // Remove data URL prefix
    const base64 = base64Data.replace(/^data:audio\/\w+;base64,/, '');
    
    await FileSystem.writeAsStringAsync(localPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    this.isLoading = false;
    this._notifyStateChange('ready');
    return localPath;
  }

  /**
   * Play generated audio using expo-av
   */
  async playAudio(audioPath) {
    try {
      // Stop any existing playback
      await this.stop();

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true },
        this._onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.isPlaying = true;
      this._notifyStateChange('playing');

    } catch (error) {
      console.error('[Chatterbox] Error playing audio:', error);
      this._notifyStateChange('error');
      throw error;
    }
  }

  /**
   * Generate and play speech in one call
   */
  async speak(text, options = {}) {
    try {
      // Try Chatterbox AI first
      const audioPath = await this.generateSpeech(text, options);
      if (audioPath) {
        await this.playAudio(audioPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Chatterbox] Speak error, falling back to device TTS:', error);
      // Fallback to device TTS
      return this._speakWithDeviceTTS(text);
    }
  }

  /**
   * Fallback to device TTS
   */
  async _speakWithDeviceTTS(text) {
    try {
      this.isPlaying = true;
      this._notifyStateChange('playing');
      
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\n\n+/g, '. ')
        .replace(/\n/g, ' ')
        .trim();
      
      return new Promise((resolve) => {
        Speech.speak(cleanText, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
          onDone: () => {
            this.isPlaying = false;
            this._notifyStateChange('finished');
            resolve(true);
          },
          onStopped: () => {
            this.isPlaying = false;
            this._notifyStateChange('stopped');
            resolve(true);
          },
          onError: () => {
            this.isPlaying = false;
            this._notifyStateChange('error');
            resolve(false);
          },
        });
      });
    } catch (error) {
      this.isPlaying = false;
      this._notifyStateChange('error');
      return false;
    }
  }

  /**
   * Stop playback
   */
  async stop() {
    // Stop expo-av sound
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        // Ignore errors when stopping
      }
      this.sound = null;
    }
    
    // Stop expo-speech
    try {
      await Speech.stop();
    } catch (e) {
      // Ignore
    }
    
    this.isPlaying = false;
    this._notifyStateChange('stopped');
  }

  /**
   * Pause playback
   */
  async pause() {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
      this._notifyStateChange('paused');
    }
  }

  /**
   * Resume playback
   */
  async resume() {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
      this._notifyStateChange('playing');
    }
  }

  /**
   * Handle playback status updates
   */
  _onPlaybackStatusUpdate(status) {
    if (status.didJustFinish) {
      this.isPlaying = false;
      this._notifyStateChange('finished');
    }
  }

  /**
   * Notify state change
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
   * Check if Chatterbox API is available
   */
  async checkAvailability() {
    try {
      const response = await fetch(`${CHATTERBOX_API}/api/`, {
        method: 'GET',
      });
      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch (error) {
      console.log('[Chatterbox] API not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.stop();
    
    // Clean up cached audio files
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      
      for (const file of files) {
        if (file.startsWith('chatterbox_')) {
          await FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Export singleton instance
export default new ChatterboxService();
