/**
 * Chatterbox TTS Service
 * For now, uses device TTS via expo-speech
 * Chatterbox AI integration requires native rebuild - coming soon
 */

import * as Speech from 'expo-speech';

class ChatterboxService {
  constructor() {
    this.isLoading = false;
    this.isPlaying = false;
    this.onStateChange = null;
  }

  /**
   * Speak text using device TTS
   * (Chatterbox AI requires native rebuild - will be added later)
   */
  async speak(text, options = {}) {
    try {
      if (this.isPlaying) {
        await this.stop();
      }
      
      this.isLoading = true;
      this._notifyStateChange('loading');
      
      // Clean text for speech
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\n\n+/g, '. ')
        .replace(/\n/g, ' ')
        .trim();
      
      this.isPlaying = true;
      this.isLoading = false;
      this._notifyStateChange('playing');
      
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
          onError: (error) => {
            console.error('[Chatterbox] Speech error:', error);
            this.isPlaying = false;
            this._notifyStateChange('error');
            resolve(false);
          },
        });
      });
    } catch (error) {
      console.error('[Chatterbox] Speak error:', error);
      this.isPlaying = false;
      this._notifyStateChange('error');
      return false;
    }
  }

  /**
   * Stop playback
   */
  async stop() {
    try {
      await Speech.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
    this.isPlaying = false;
    this._notifyStateChange('stopped');
  }

  /**
   * Pause playback (not fully supported by expo-speech)
   */
  async pause() {
    await this.stop();
  }

  /**
   * Resume playback (not supported - just restart)
   */
  async resume() {
    // expo-speech doesn't support resume
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
   * Check if service is available
   */
  async checkAvailability() {
    // Device TTS is always available
    return true;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.stop();
  }
}

// Export singleton instance
export default new ChatterboxService();
