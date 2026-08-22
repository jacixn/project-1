import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState } from 'react-native';
import aiRateLimiter from '../utils/aiRateLimiter';
import { createSpeechChain } from './speechProviders';
import { levelFromMetering, MIN_RECORD_MS } from '../utils/voiceInput';

// 16 kHz mono 16-bit PCM WAV: what every provider in the chain accepts as-is.
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
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

// Keys: the rotating-chain keys from ai.config.js plus Gemini's and the
// Google key (Google Speech is last; that key is currently blocked for the
// Speech API and just cools down). All three files are gitignored.
let KEYS = null;
const loadKeys = () => {
  if (KEYS) return KEYS;
  const keys = {};
  try { Object.assign(keys, require('../../ai.config').AI_CONFIG || {}); } catch (e) { /* no ai.config.js */ }
  try {
    const gc = require('../../gemini.config').GEMINI_CONFIG;
    if (gc?.apiKey && gc.apiKey !== 'YOUR_GEMINI_API_KEY_HERE') keys.GEMINI_API_KEY = gc.apiKey;
  } catch (e) { /* no gemini.config.js */ }
  try {
    const tc = require('../../googleTts.config').GOOGLE_TTS_CONFIG;
    if (tc?.apiKey) keys.GOOGLE_SPEECH_API_KEY = tc.apiKey;
  } catch (e) { /* no googleTts.config.js */ }
  KEYS = keys;
  return keys;
};

const RECORD_MODE = { allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false };
const PLAYBACK_MODE = { allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false };

class SpeechToTextService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.permissionGranted = false;
    this._startPromise = null;
    this._cancelled = false;
    this._warmedUp = false;
    this._chain = null;
    this.startedAt = 0;
    this.onLevel = null;
  }

  chain() {
    if (!this._chain) this._chain = createSpeechChain({ keys: loadKeys() });
    return this._chain;
  }

  isAvailable() {
    const st = this.chain().status();
    return Object.values(st).some((s) => s !== 'no key');
  }

  providerStatus() {
    return this.chain().status();
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
    this.onLevel = null;
    try { await Audio.setAudioModeAsync(PLAYBACK_MODE); } catch (e) { /* ignore */ }
  }

  // startRecording({ onLevel }) -> { success } | { success: false, error, cancelled }
  // error: 'permission' | 'background' | 'noKeys' | 'notStarted'
  startRecording(opts = {}) {
    this._cancelled = false;
    this.onLevel = typeof opts.onLevel === 'function' ? opts.onLevel : null;
    this._startPromise = this._doStart();
    return this._startPromise;
  }

  async _doStart() {
    try {
      if (AppState.currentState !== 'active') return { success: false, error: 'background' };
      if (!this.isAvailable()) return { success: false, error: 'noKeys' };

      if (!this.permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) return { success: false, error: 'permission' };
      }
      if (this._cancelled) return { success: false, cancelled: true };

      if (this.recording) {
        await this._releaseNativeRecorder();
        await new Promise((r) => setTimeout(r, 60));
        if (this._cancelled) return { success: false, cancelled: true };
      }
      if (AppState.currentState !== 'active') return { success: false, error: 'background' };

      await Audio.setAudioModeAsync(RECORD_MODE);
      if (this._cancelled) return { success: false, cancelled: true };

      let recording = null;
      let lastError = null;
      const onStatus = (status) => {
        if (this.onLevel && status?.isRecording) this.onLevel(levelFromMetering(status.metering));
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        if (this._cancelled) return { success: false, cancelled: true };
        if (AppState.currentState !== 'active') return { success: false, error: 'background' };
        try {
          const result = await Audio.Recording.createAsync(RECORDING_OPTIONS, onStatus, 100);
          recording = result.recording;
          break;
        } catch (err) {
          lastError = err;
          if (AppState.currentState !== 'active') return { success: false, error: 'background' };
          console.log(`[STT] createAsync attempt ${attempt + 1} failed:`, err.message);
          await this._releaseNativeRecorder();
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          if (this._cancelled) return { success: false, cancelled: true };
          await Audio.setAudioModeAsync(RECORD_MODE);
        }
      }

      if (this._cancelled) {
        if (recording) { try { await recording.stopAndUnloadAsync(); } catch (e) { /* ignore */ } }
        await this._releaseNativeRecorder();
        return { success: false, cancelled: true };
      }
      if (!recording) {
        console.error('[STT] All createAsync attempts failed:', lastError?.message);
        await this._releaseNativeRecorder();
        return { success: false, error: 'notStarted', detail: lastError?.message };
      }

      this.recording = recording;
      this.isRecording = true;
      this.startedAt = Date.now();
      console.log('[STT] Recording started');
      return { success: true };
    } catch (error) {
      console.error('[STT] Start recording error:', error);
      await this._releaseNativeRecorder();
      return { success: false, error: 'notStarted', detail: error?.message };
    }
  }

  // stopRecording() -> { success: true, text, provider }
  //   | { success: false, tooShort | nothingHeard | rateLimited | cancelled | error, status }
  // Safe to call while startRecording() is still in flight: it waits for it.
  async stopRecording() {
    if (this._startPromise) {
      const startResult = await this._startPromise;
      this._startPromise = null;
      if (!startResult.success) {
        return startResult.cancelled ? { success: false, cancelled: true } : { success: false, error: startResult.error || 'notStarted', detail: startResult.detail };
      }
    }
    if (!this.recording) return { success: false, error: 'notStarted' };

    const rec = this.recording;
    const heldMs = Date.now() - this.startedAt;
    this.recording = null;
    this.isRecording = false;
    this.onLevel = null;

    let uri = null;
    try {
      console.log('[STT] Stopping recording after', heldMs, 'ms');
      await rec.stopAndUnloadAsync();
      uri = rec.getURI();
    } catch (error) {
      console.error('[STT] Stop recording error:', error);
    }
    try { await Audio.setAudioModeAsync(PLAYBACK_MODE); } catch (e) { /* ignore */ }

    const discard = async () => { if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); };

    if (!uri) return { success: false, error: 'notStarted', detail: 'no audio file' };
    if (heldMs < MIN_RECORD_MS) { await discard(); return { success: false, tooShort: true, heldMs }; }

    let base64 = '';
    try {
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (e) {
      console.error('[STT] read error:', e?.message);
    }
    // 16 kHz * 2 bytes = 32 KB/s; under ~2 KB base64 is a header with no audio.
    if (!base64 || base64.length < 2000) { await discard(); return { success: false, nothingHeard: true }; }

    const rl = await aiRateLimiter.checkLimit('speechToText');
    if (!rl.allowed) { await discard(); return { success: false, error: rl.message, rateLimited: true }; }
    await aiRateLimiter.increment('speechToText');

    console.log('[STT] Audio captured, transcribing via chain', JSON.stringify(this.providerStatus()));
    const audio = {
      uri,
      base64,
      mime: 'audio/wav',
      durationMs: heldMs,
      file: { uri, name: 'voice.wav', type: 'audio/wav' },
    };
    let out;
    try {
      out = await this.chain().transcribe(audio);
    } catch (e) {
      out = { text: '', error: 'unavailable', detail: e?.message };
    }
    await discard();

    if (out.text) {
      console.log(`[STT] Transcribed by ${out.provider}:`, out.text.substring(0, 80));
      return { success: true, text: out.text, provider: out.provider };
    }
    if (out.silent) return { success: false, nothingHeard: true, provider: out.provider };
    if (out.error === 'noKeys') return { success: false, error: 'noKeys' };
    return { success: false, error: 'unavailable', status: out.lastStatus, detail: out.detail };
  }

  async cancelRecording() {
    this._cancelled = true;
    if (this._startPromise) {
      try { await this._startPromise; } catch (e) { /* ignore */ }
      this._startPromise = null;
    }
    const uri = this.recording?.getURI?.();
    await this._releaseNativeRecorder();
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    this._warmedUp = false;
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      hasPermission: this.permissionGranted,
      isAvailable: this.isAvailable(),
      providers: this.providerStatus(),
    };
  }
}

const speechToTextService = new SpeechToTextService();
export default speechToTextService;
