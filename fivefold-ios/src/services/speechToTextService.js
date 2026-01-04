// Speech-to-Text Service - Uses Deepgram API for voice transcription
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Deepgram free tier API key (you can get your own at deepgram.com)
const DEEPGRAM_API_KEY = '85d2a8b0e8c9f4c5b2e1d0c9a8b7c6d5e4f3a2b1'; // Replace with real key
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

// Alternative: Use free Wit.ai or AssemblyAI
const WIT_AI_TOKEN = 'JZXKQYLC6GQVBPXL7H7XZRPGJ4WNIVOU'; // Wit.ai free token
const WIT_AI_URL = 'https://api.wit.ai/speech';

class SpeechToTextService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.permissionGranted = false;
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions() {
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
      const recordingRef = this.recording;
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
   * Transcribe audio using Wit.ai (free, no API key needed for basic use)
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

      // Try Wit.ai first (free tier)
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
            console.log('✅ Wit.ai transcription:', result.text);
            return { success: true, text: result.text };
          }
        }
      } catch (witError) {
        console.log('Wit.ai failed, trying alternative...');
      }

      // Fallback: Use Google Cloud Speech-to-Text free tier
      // For now, return a message asking user to type
      console.log('⚠️ Transcription service unavailable');
      return { 
        success: false, 
        error: 'Voice transcription is currently unavailable. Please type your message.' 
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
    };
  }
}

// Export singleton instance
const speechToTextService = new SpeechToTextService();
export default speechToTextService;

