/**
 * Character Audio Service
 * Fetches Bible character audio from GitHub, caches locally, plays from cache.
 * If GitHub file is missing, falls back to on-demand TTS using Studio Female Premium Narration.
 * Same flow as Adam's audio: pull from GitHub when user selects Listen, then cache.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { GOOGLE_TTS_CONFIG } from '../../googleTts.config';
import aiRateLimiter from '../utils/aiRateLimiter';

const CACHE_DIR = `${FileSystem.cacheDirectory}character_audio/`;
const STUDIO_FEMALE_VOICE = GOOGLE_TTS_CONFIG.voices['studio-female'] || GOOGLE_TTS_CONFIG.defaultVoice;

function toSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

class CharacterAudioService {
  constructor() {
    this.initialized = false;
  }

  async ensureCacheDir() {
    if (this.initialized) return;
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      this.initialized = true;
    } catch (e) {
      console.warn('[CharacterAudio] Cache dir error:', e);
    }
  }

  /**
   * Get playable audio path for a character.
   * 1. Check local cache
   * 2. If not cached, download from GitHub (audioUrl)
   * 3. If download fails, generate via TTS (Studio Female) and cache
   * @param {string} audioUrl - GitHub URL for the character's MP3
   * @param {string} characterName - e.g. "Adam", "Lot's Wife"
   * @param {string} storyText - Fallback: text to synthesise if GitHub file missing
   * @returns {Promise<string|null>} - Local file URI to play, or null on error
   */
  async getAudioPath(audioUrl, characterName, storyText) {
    await this.ensureCacheDir();
    const slug = toSlug(characterName);
    const localPath = `${CACHE_DIR}${slug}.mp3`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists && fileInfo.size > 0) {
        return localPath;
      }

      if (audioUrl) {
        try {
          await FileSystem.downloadAsync(audioUrl, localPath);
          const afterInfo = await FileSystem.getInfoAsync(localPath);
          if (afterInfo.exists && afterInfo.size > 0) {
            return localPath;
          }
        } catch (downloadErr) {
          console.log('[CharacterAudio] GitHub download failed, using TTS fallback:', downloadErr?.message);
        }
      }

      if (storyText && storyText.trim().length > 0) {
        const ttsPath = await this.generateViaTTS(storyText, localPath);
        if (ttsPath) return ttsPath;
      }

      return null;
    } catch (e) {
      console.error('[CharacterAudio] getAudioPath error:', e);
      return null;
    }
  }

  /**
   * Generate audio via Google TTS (Studio Female) and save to path
   */
  async generateViaTTS(text, outputPath) {
    try {
      const rl = await aiRateLimiter.checkLimit('voice');
      if (!rl.allowed) return null;
      await aiRateLimiter.increment('voice');
      const requestBody = {
        input: { text },
        voice: {
          languageCode: STUDIO_FEMALE_VOICE.languageCode,
          name: STUDIO_FEMALE_VOICE.name,
          ssmlGender: STUDIO_FEMALE_VOICE.ssmlGender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 0,
        },
      };

      const url = `${GOOGLE_TTS_CONFIG.apiUrl}?key=${GOOGLE_TTS_CONFIG.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.warn('[CharacterAudio] TTS API error:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data.audioContent) return null;

      await FileSystem.writeAsStringAsync(outputPath, data.audioContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return outputPath;
    } catch (e) {
      console.warn('[CharacterAudio] TTS generate error:', e);
      return null;
    }
  }

  /**
   * Clear all cached character audio
   */
  async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      this.initialized = false;
      return true;
    } catch (e) {
      console.warn('[CharacterAudio] clearCache error:', e);
      return false;
    }
  }
}

const characterAudioService = new CharacterAudioService();
export default characterAudioService;
