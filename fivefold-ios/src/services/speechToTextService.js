import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GOOGLE_TTS_CONFIG } from '../../googleTts.config';
import aiRateLimiter from '../utils/aiRateLimiter';

const SPEECH_API_URL = 'https://speech.googleapis.com/v1/speech:recognize';

const RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    extension: '.wav',
    outputFormat: 3,
    audioEncoder: 1,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: 1819304813,
    audioQuality: 127,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

class SpeechToTextService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.permissionGranted = false;
    this._startPromise = null;
    this._cancelled = false;
    this._warmedUp = false;
  }

  isAvailable() {
    return !!GOOGLE_TTS_CONFIG?.apiKey;
  }

  async requestPermission() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('[STT] Permission error:', error);
      return false;
    }
  }

  async preWarm() {
    if (this._warmedUp) return;
    try {
      if (!this.permissionGranted) {
        const { status } = await Audio.getPermissionsAsync();
        this.permissionGranted = status === 'granted';
      }
      this._warmedUp = true;
    } catch (e) { /* ignore */ }
  }

  async _releaseNativeRecorder() {
    if (this.recording) {
      try { await this.recording.stopAndUnloadAsync(); } catch (e) { /* already stopped */ }
      this.recording = null;
    }
    this.isRecording = false;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) { /* ignore */ }
  }

  startRecording() {
    this._cancelled = false;
    this._startPromise = this._doStart();
    return this._startPromise;
  }

  async _doStart() {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Speech service not configured.' };
      }

      if (!this.permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) {
          return { success: false, error: 'Microphone permission denied. Please allow microphone access in Settings.' };
        }
      }

      if (this._cancelled) return { success: false, cancelled: true };

      if (this.recording) {
        await this._releaseNativeRecorder();
        await new Promise(r => setTimeout(r, 60));
        if (this._cancelled) return { success: false, cancelled: true };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      if (this._cancelled) return { success: false, cancelled: true };

      let recording = null;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (this._cancelled) return { success: false, cancelled: true };
        try {
          const result = await Audio.Recording.createAsync(RECORDING_OPTIONS);
          recording = result.recording;
          break;
        } catch (err) {
          lastError = err;
          console.log(`[STT] createAsync attempt ${attempt + 1} failed:`, err.message);
          await this._releaseNativeRecorder();
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          if (this._cancelled) return { success: false, cancelled: true };
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
        }
      }

      if (this._cancelled) {
        if (recording) {
          try { await recording.stopAndUnloadAsync(); } catch (e) { /* ignore */ }
        }
        await this._releaseNativeRecorder();
        return { success: false, cancelled: true };
      }

      if (!recording) {
        console.error('[STT] All createAsync attempts failed:', lastError?.message);
        return { success: false, error: 'Could not start recording. Please try again.' };
      }

      this.recording = recording;
      this.isRecording = true;

      console.log('[STT] Recording started');
      return { success: true };
    } catch (error) {
      console.error('[STT] Start recording error:', error);
      this.isRecording = false;
      this.recording = null;
      return { success: false, error: 'Could not start recording. Please try again.' };
    }
  }

  async stopRecording() {
    if (this._startPromise) {
      const startResult = await this._startPromise;
      this._startPromise = null;
      if (!startResult.success) {
        return { success: false, error: 'Recording was not started.' };
      }
    }

    if (!this.recording) {
      return { success: false, error: 'No active recording' };
    }

    try {
      console.log('[STT] Stopping recording...');
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      if (!uri) {
        return { success: false, error: 'Recording failed — no audio captured.' };
      }

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      if (!base64Audio || base64Audio.length < 100) {
        return { success: false, error: 'Recording too short. Please hold the mic button and speak.' };
      }

      const rl = await aiRateLimiter.checkLimit('speechToText');
      if (!rl.allowed) {
        return { success: false, error: rl.message, rateLimited: true };
      }

      console.log('[STT] Audio captured, transcribing...');
      await aiRateLimiter.increment('speechToText');
      const text = await this.transcribe(base64Audio);

      if (text) {
        console.log('[STT] Transcription:', text.substring(0, 80));
        return { success: true, text };
      }
      return { success: false, error: 'Could not understand audio. Please try speaking more clearly.' };
    } catch (error) {
      console.error('[STT] Stop recording error:', error);
      this.isRecording = false;
      this.recording = null;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (e) { /* ignore */ }
      return { success: false, error: 'Transcription failed. Please try again.' };
    }
  }

  async transcribe(base64Audio) {
    try {
      const apiKey = GOOGLE_TTS_CONFIG?.apiKey;
      if (!apiKey) {
        console.error('[STT] No API key');
        return null;
      }

      const response = await fetch(`${SPEECH_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            model: 'latest_long',
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: base64Audio,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[STT] API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return data.results
          .map(r => r.alternatives?.[0]?.transcript || '')
          .join(' ')
          .trim();
      }

      return null;
    } catch (error) {
      console.error('[STT] Transcription error:', error);
      return null;
    }
  }

  async cancelRecording() {
    this._cancelled = true;
    if (this._startPromise) {
      try { await this._startPromise; } catch (e) { /* ignore */ }
      this._startPromise = null;
    }
    await this._releaseNativeRecorder();
    this._warmedUp = false;
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      hasPermission: this.permissionGranted,
      isAvailable: this.isAvailable(),
    };
  }
}

const speechToTextService = new SpeechToTextService();
export default speechToTextService;
