/**
 * Chatterbox TTS Service
 * Uses device TTS via expo-speech (no native rebuild needed)
 * Chatterbox AI with expo-av requires native module setup
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
  /**
   * Listen for playback state. Returns a function that stops listening.
   *
   * There is also a single `onStateChange` slot, which is what every screen
   * used to assign to. Three of them did, so whichever mounted last silenced
   * the other two and a Listen button elsewhere in the app would sit there
   * looking idle while audio played. Screens subscribe now; the slot stays
   * for bibleAudioService, which is the one internal user.
   */
  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    if (!this._listeners) this._listeners = new Set();
    this._listeners.add(fn);
    return () => { if (this._listeners) this._listeners.delete(fn); };
  }

  _notifyStateChange(state) {
    const meta = { isLoading: this.isLoading, isPlaying: this.isPlaying };
    if (this.onStateChange) {
      try { this.onStateChange(state, meta); } catch (e) {}
    }
    if (this._listeners) {
      // Copied, so a listener that unsubscribes while being told does not
      // disturb the walk.
      for (const fn of [...this._listeners]) {
        try { fn(state, meta); } catch (e) {}
      }
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
