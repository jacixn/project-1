// Speech-to-Text Service
// Uses expo-av for recording when available, otherwise provides fallback

let Audio = null;
let FileSystem = null;
let isAudioAvailable = false;

// Try to load expo-av (might not be available without native rebuild)
try {
  Audio = require('expo-av').Audio;
  FileSystem = require('expo-file-system');
  isAudioAvailable = true;
} catch (error) {
  console.log('expo-av not available - voice input will require app rebuild');
  isAudioAvailable = false;
}

// Wit.ai free token for speech-to-text
const WIT_AI_TOKEN = 'JZXKQYLC6GQVBPXL7H7XZRPGJ4WNIVOU';
const WIT_AI_URL = 'https://api.wit.ai/speech';

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
    return isAudioAvailable;
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions() {
    if (!isAudioAvailable) {
      return false;
    }
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    if (!isAudioAvailable) {
      return { 
        success: false, 
        error: 'Voice input requires an app rebuild. Please type your message instead.',
        needsRebuild: true
      };
    }

    try {
      // Request permissions if not already granted
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return { success: false, error: 'Microphone permission denied' };
        }
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;

      console.log('🎤 Recording started');
      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Check if it's a native module error
      if (error.message?.includes('native module') || error.message?.includes('ExponentAV')) {
        return { 
          success: false, 
          error: 'Voice input requires an app rebuild. Please type your message instead.',
          needsRebuild: true
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop recording and transcribe
   */
  async stopRecording() {
    if (!this.recording) {
      return { success: false, error: 'No active recording' };
    }

    try {
      console.log('🎤 Stopping recording...');
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.isRecording = false;
      this.recording = null;

      if (!uri) {
        return { success: false, error: 'No recording file found' };
      }

      console.log('📁 Recording saved to:', uri);

      // Transcribe the audio
      const transcription = await this.transcribeAudio(uri);
      
      // Clean up the recording file
      try {
        await FileSystem.deleteAsync(uri);
      } catch (e) {
        // Ignore cleanup errors
      }

      return transcription;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel recording without transcribing
   */
  async cancelRecording() {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Clean up
      if (uri) {
        try {
          await FileSystem.deleteAsync(uri);
        } catch (e) {}
      }
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    } finally {
      this.isRecording = false;
      this.recording = null;
    }
  }

  /**
   * Transcribe audio using Wit.ai (free tier)
   */
  async transcribeAudio(audioUri) {
    try {
      console.log('📝 Transcribing audio...');

      // Read the audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Try Wit.ai (free tier)
      try {
        const witResponse = await fetch(WIT_AI_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WIT_AI_TOKEN}`,
            'Content-Type': 'audio/mpeg3',
          },
          body: bytes,
        });

        if (witResponse.ok) {
          const result = await witResponse.json();
          if (result.text) {
            console.log('✅ Transcription:', result.text);
            return { success: true, text: result.text };
          }
        }
      } catch (witError) {
        console.log('Wit.ai transcription failed:', witError);
      }

      return { 
        success: false, 
        error: 'Could not transcribe audio. Please try again or type your message.' 
      };

    } catch (error) {
      console.error('Transcription error:', error);
      return { success: false, error: 'Failed to transcribe audio' };
    }
  }

  /**
   * Get recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      hasPermission: this.permissionGranted,
      isAvailable: isAudioAvailable,
    };
  }
}

// Export singleton instance
const speechToTextService = new SpeechToTextService();
export default speechToTextService;
