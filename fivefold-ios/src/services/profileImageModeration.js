/**
 * profileImageModeration.js
 *
 * Scans user-uploaded profile pictures using Gemini Vision API
 * to ensure they are appropriate for a family-friendly Bible app.
 * Implements a cooldown (expires midnight next day) after each upload to prevent spam.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let GEMINI_CONFIG = null;

try {
  GEMINI_CONFIG = require('../../gemini.config').GEMINI_CONFIG;
} catch (e) {
  console.warn('[ProfileModeration] gemini.config.js not found — custom photo uploads will be unavailable');
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MODERATION_PROMPT = `You are a content moderation system for a family-friendly Bible app. A user wants to use this image as their profile picture.

REJECT if the image contains ANY of the following:
- Nudity or sexually suggestive content
- Violence, gore, or weapons
- Hate symbols, slurs, or offensive text/gestures
- Drug use or drug paraphernalia
- Spam, advertisements, or QR codes
- Disturbing, shocking, or graphic content
- Profanity or vulgar language in text

APPROVE if the image is any of:
- A normal selfie, portrait, or group photo
- Nature, animals, landscapes, scenery
- Anime, cartoon, illustration, or artwork
- Abstract art, patterns, or objects
- Sports, food, flowers, or general lifestyle imagery

You MUST respond in this exact JSON format with no other text:
{"approved": true}
or
{"approved": false, "reason": "Brief, user-friendly explanation of why it was rejected"}`;

function extractJSON(text) {
  if (!text) return null;
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // noop
  }
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
    } catch (e) {
      // noop
    }
  }
  return null;
}

function extractResponseText(result) {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return null;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].text && !parts[i].thought) {
      return parts[i].text.trim();
    }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].text) return parts[i].text.trim();
  }
  return null;
}

/**
 * Check if the user is in the upload cooldown (expires midnight next day).
 * @returns {{ allowed: boolean, retryDate: Date|null }}
 */
export async function checkUploadCooldown(userId) {
  try {
    const raw = await AsyncStorage.getItem(`pfp_rejected_at_${userId}`);
    if (!raw) return { allowed: true, retryDate: null };

    const expiresAt = parseInt(raw, 10);
    const now = Date.now();

    if (now >= expiresAt) {
      await AsyncStorage.removeItem(`pfp_rejected_at_${userId}`);
      return { allowed: true, retryDate: null };
    }

    return { allowed: false, retryDate: new Date(expiresAt) };
  } catch (e) {
    console.warn('[ProfileModeration] Failed to check cooldown:', e);
    return { allowed: true, retryDate: null };
  }
}

/**
 * Store a cooldown that expires at midnight (00:00) the next day.
 */
export async function setUploadCooldown(userId) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    await AsyncStorage.setItem(`pfp_rejected_at_${userId}`, String(tomorrow.getTime()));
  } catch (e) {
    console.warn('[ProfileModeration] Failed to set cooldown:', e);
  }
}

// ── Cached custom photo (24-hour grace period) ──

const PHOTO_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function cacheCustomPhoto(userId, url) {
  try {
    await AsyncStorage.setItem(
      `pfp_cached_photo_${userId}`,
      JSON.stringify({ url, abandonedAt: null })
    );
  } catch (e) {
    console.warn('[ProfileModeration] Failed to cache photo:', e);
  }
}

export async function abandonCachedPhoto(userId) {
  try {
    const raw = await AsyncStorage.getItem(`pfp_cached_photo_${userId}`);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.url) return;
    data.abandonedAt = Date.now();
    await AsyncStorage.setItem(`pfp_cached_photo_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[ProfileModeration] Failed to abandon cached photo:', e);
  }
}

export async function getCachedCustomPhoto(userId) {
  try {
    const raw = await AsyncStorage.getItem(`pfp_cached_photo_${userId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.url) return null;

    if (data.abandonedAt && Date.now() - data.abandonedAt >= PHOTO_CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(`pfp_cached_photo_${userId}`);
      return null;
    }

    return data;
  } catch (e) {
    console.warn('[ProfileModeration] Failed to get cached photo:', e);
    return null;
  }
}

export async function restoreCachedPhoto(userId) {
  try {
    const raw = await AsyncStorage.getItem(`pfp_cached_photo_${userId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    data.abandonedAt = null;
    await AsyncStorage.setItem(`pfp_cached_photo_${userId}`, JSON.stringify(data));
    return data.url;
  } catch (e) {
    console.warn('[ProfileModeration] Failed to restore cached photo:', e);
    return null;
  }
}

/**
 * Check if Gemini moderation is configured and available.
 */
export function isModerationConfigured() {
  return !!(GEMINI_CONFIG && GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE');
}

/**
 * Send an image to Gemini Vision for content moderation.
 * @param {string} base64Image - base64-encoded image (no data: prefix)
 * @param {string} mimeType - defaults to 'image/jpeg'
 * @returns {{ approved: boolean, reason: string }}
 */
export async function moderateProfileImage(base64Image, mimeType = 'image/jpeg') {
  if (!isModerationConfigured()) {
    console.warn('[ProfileModeration] Gemini not configured — rejecting upload as a safety measure');
    return { approved: false, reason: 'Photo uploads are temporarily unavailable. Please try again later.' };
  }

  try {
    const url = `${GEMINI_ENDPOINT}?key=${GEMINI_CONFIG.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: MODERATION_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn('[ProfileModeration] API error:', response.status);
      return { approved: false, reason: 'We couldn\'t verify your image right now. Please try again later.' };
    }

    const result = await response.json();
    const text = extractResponseText(result);

    if (!text) {
      console.warn('[ProfileModeration] Empty response from Gemini');
      return { approved: false, reason: 'We couldn\'t verify your image right now. Please try again later.' };
    }

    const parsed = extractJSON(text);
    if (!parsed || typeof parsed.approved !== 'boolean') {
      console.warn('[ProfileModeration] Could not parse moderation response:', text);
      return { approved: false, reason: 'We couldn\'t verify your image right now. Please try again later.' };
    }

    return {
      approved: parsed.approved,
      reason: parsed.reason || '',
    };
  } catch (error) {
    console.warn('[ProfileModeration] Moderation failed:', error.message);
    return { approved: false, reason: 'We couldn\'t verify your image right now. Please try again later.' };
  }
}
