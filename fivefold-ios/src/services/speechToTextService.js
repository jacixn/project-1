// Speech-to-Text Service
// Voice input functionality - coming in a future update

class SpeechToTextService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.permissionGranted = false;
  }

  /**
   * Check if voice input is available
   */
  isAvailable() {
    // Voice input is not yet available - will be enabled in a future update
    return false;
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    // Voice input will be available in a future update
    return { 
      success: false, 
      error: 'Voice input is coming soon. For now, please type your message.',
      needsRebuild: true
    };
  }

  /**
   * Stop recording and transcribe
   */
  async stopRecording() {
    return { success: false, error: 'Voice input not available' };
  }

  /**
   * Cancel recording without transcribing
   */
  async cancelRecording() {
    this.isRecording = false;
    this.recording = null;
  }

  /**
   * Get recording status
   */
  getStatus() {
    return {
      isRecording: false,
      hasPermission: false,
      isAvailable: false,
    };
  }
}

// Export singleton instance
const speechToTextService = new SpeechToTextService();
export default speechToTextService;
