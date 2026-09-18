#!/usr/bin/env node
/**
 * Guard: a custom profile photo is never sent to an AI service, scanned, or
 * gated behind an attempt counter / cooldown. Locks the 2026-09-19 removal of
 * the Gemini profile-image moderation so it cannot creep back in under a new
 * name, through a helper, inside storageService, or in the legal copy.
 * Run from the repo root: node scripts/test-profile-photo-no-scan.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.resolve(ROOT, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p);
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
};
// Comments are not behaviour: strip them so a comment that says "no
// cooldown" cannot trip a ban and a comment cannot hide a violation.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[ \t])\/\/.*$/gm, '$1');
// Slice a function body by its opening line and the first closing brace at
// the same indentation. Assert the slice really reached the outer catch so a
// shortened anchor cannot silently hide code.
const between = (src, startRe, endRe, mustContain) => {
  const a = src.search(startRe); assert(a >= 0, `start anchor ${startRe}`);
  const rest = src.slice(a); const b = rest.search(endRe); assert(b >= 0, `end anchor ${endRe}`);
  const slice = rest.slice(0, b);
  if (mustContain) assert(mustContain.test(slice), `slice for ${startRe} must contain ${mustContain}`);
  return slice;
};
const awaited = (slice) => [...new Set([...slice.matchAll(/await\s+([\w.$]+)\s*\(/g)].map((m) => m[1]))].sort();

let passed = 0;
const ok = (cond, msg) => { assert(cond, msg); passed++; console.log(`  PASS ${msg}`); };

// Anything that could carry an image to a model or judge it.
const NETWORK_OR_SCAN = /\bfetch\s*\(|axios|XMLHttpRequest|\.then\s*\(|googleapis|generativelanguage|inline_data|inlineData|file_data|fileData|image_url|imageUrl|readAsStringAsync|base64|btoa\(|arrayBuffer|productionAiService|foodVisionService|chatWithCoachImage|aiService|Vision|SAFE_SEARCH|moderat|approv|declin|Not Accepted|safe to use|Gemini|Groq|OpenAI|Anthropic|Mistral|OpenRouter/i;
// Anything that rations uploads.
const RATIONING = /cooldown|rejection|attempt|strike|\bgrace\b|pfp_|midnight|tomorrow|following day|again on|\bwait\b|\blimit\b|abandon|restore|cache/i;

// 1. The moderation service is gone and nothing imports it.
ok(!fs.existsSync(path.join(ROOT, 'src/services/profileImageModeration.js')), 'profileImageModeration.js is deleted');
const srcFiles = walk(path.join(ROOT, 'src')).concat([path.join(ROOT, 'App.js')]);
const importers = srcFiles.filter((f) => /profileImageModeration|moderateProfileImage/.test(read(f)));
ok(importers.length === 0, `no source file references the moderation service (${importers.map(rel).join(', ') || 'none'})`);

// 2. ProfileTab upload: picker -> uploadProfilePicture, nothing else awaited.
const profileRaw = read(path.join(ROOT, 'src/screens/ProfileTab.js'));
const profile = stripComments(profileRaw);
const pUpload = between(profile, /const handleUploadPhoto = async \(\) => \{/, /\n  \};\n/, /catch \(error\)[\s\S]*Upload Failed/);
assert.deepStrictEqual(awaited(pUpload), [
  'ImagePicker.launchImageLibraryAsync',
  'ImagePicker.requestMediaLibraryPermissionsAsync',
  'Promise.race',
  'import',
  'saveData',
  'updateAndSyncProfile',
  'updateLocalProfile',
  'userStorage.getRaw',
  'userStorage.setRaw',
], 'ProfileTab upload awaits exactly the picker, the storage upload, and the profile save');
ok(true, 'ProfileTab upload awaits only the picker, the upload, and the profile save');
ok(/Promise\.race\(\[uploadProfilePicture\(user\.uid, uri\), timeout\]\)/.test(pUpload), 'ProfileTab upload sends the picked uri straight to uploadProfilePicture, capped by a timeout');
ok(!NETWORK_OR_SCAN.test(pUpload), 'ProfileTab upload has no network call, model call, or approval logic');
ok(!RATIONING.test(pUpload), 'ProfileTab upload has no cooldown, attempt counter, or cached-photo logic');
const pImports = [...profile.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
ok(!pImports.some((i) => /moderat|vision|safeSearch|avatarCheck|photoCheck/i.test(i)), 'ProfileTab imports no moderation or vision helper');

// 3. handleAvatarSelected: no cached-photo grace period or rationing.
const pSelect = between(profile, /const handleAvatarSelected = async \(avatarId\) => \{/, /\n  \};\n/, /catch \(error\)/);
ok(!RATIONING.test(pSelect), 'handleAvatarSelected has no cached-photo grace or cooldown logic');
ok(!NETWORK_OR_SCAN.test(pSelect), 'handleAvatarSelected makes no network or model call');

// 4. Progress overlay: one state, no analysis branch or copy.
const states = [...new Set([...profile.matchAll(/setPhotoUploadStatus\(([^)]*)\)/g)].map((m) => m[1].trim()))].sort();
assert.deepStrictEqual(states, ["'uploading'", 'null'], `photoUploadStatus is only ever 'uploading' or null (got ${states.join(', ')})`);
ok(true, "photoUploadStatus is only ever 'uploading' or null");
const overlay = between(profile, /<Modal visible=\{photoUploadStatus !== null\}/, /<\/Modal>/);
ok(!/photoUploadStatus\s*===|\?\s*['"]/.test(overlay), 'overlay has no per-state branch');
ok(!/check|scan|analy|review|screen|safe|verif|moderat/i.test(overlay), 'overlay copy says nothing about checking the photo');

// 5. Onboarding upload: same shape.
const onboardingRaw = read(path.join(ROOT, 'src/components/SimpleOnboarding.js'));
const onboarding = stripComments(onboardingRaw);
const oUpload = between(onboarding, /const handleUploadPhoto = async \(\) => \{/, /\n  \};\n/, /catch \(error\)[\s\S]*Upload Failed/);
assert.deepStrictEqual(awaited(oUpload), [
  'ImagePicker.launchImageLibraryAsync',
  'ImagePicker.requestMediaLibraryPermissionsAsync',
  'Promise.race',
], 'Onboarding upload awaits exactly the picker and the storage upload');
ok(true, 'Onboarding upload awaits only the picker and the upload');
ok(/Promise\.race\(\[uploadProfilePicture\(user\.uid, uri\), timeout\]\)/.test(oUpload), 'Onboarding upload sends the picked uri straight to uploadProfilePicture, capped by a timeout');
ok(!NETWORK_OR_SCAN.test(oUpload), 'Onboarding upload has no network call, model call, or approval logic');
ok(!RATIONING.test(oUpload), 'Onboarding upload has no cooldown or attempt counter');
const oImports = [...onboarding.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
ok(!oImports.some((i) => /moderat|vision|safeSearch|avatarCheck|photoCheck|expo-file-system/i.test(i)), 'Onboarding imports no moderation, vision, or file-reading helper');

// 6. storageService.uploadProfilePicture: blob -> uploadBytes -> URL, nothing else.
const storageSvcRaw = read(path.join(ROOT, 'src/services/storageService.js'));
const storageSvc = stripComments(storageSvcRaw);
assert.deepStrictEqual(
  [...storageSvc.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]).sort(),
  ['../config/firebase', 'firebase/storage'],
  'storageService imports only firebase/storage and the firebase config',
);
ok(true, 'storageService imports only firebase/storage and the firebase config');
const upl = between(storageSvc, /export const uploadProfilePicture = async \(userId, localUri\) => \{/, /\n\};\n/, /catch \(error\)/);
assert.deepStrictEqual(awaited(upl), ['getDownloadURL', 'uploadLocalFile'], 'uploadProfilePicture awaits only uploadLocalFile and getDownloadURL');
ok(true, 'uploadProfilePicture awaits only uploadLocalFile and getDownloadURL');
ok(!/\bfetch\s*\(|\.then\s*\(|import\(|googleapis|generativelanguage|inline_data|file_data|readAsStringAsync|base64|productionAiService|foodVisionService|chatWithCoachImage|moderat|approv/i.test(upl), 'uploadProfilePicture makes no call beyond Firebase Storage');
const helper = between(storageSvc, /const uploadLocalFile = async/, /\n\};\n/);
ok(/uploadBytes\(storageRef, blob/.test(helper) && !/googleapis|generativelanguage|fetch\s*\(/i.test(helper), 'uploadLocalFile only hands the blob to uploadBytes');

// 7. AvatarPicker is presentational: verified-email gate only.
const pickerRaw = read(path.join(ROOT, 'src/components/AvatarPicker.js'));
const picker = stripComments(pickerRaw);
ok(/isEmailVerified\(\)/.test(picker), 'AvatarPicker still requires a verified email');
const hooks = [...new Set([...picker.matchAll(/\buse[A-Z]\w*/g)].map((m) => m[0]))].sort();
assert.deepStrictEqual(hooks, ['useTheme'], `AvatarPicker uses no hook but useTheme (got ${hooks.join(', ')})`);
ok(true, 'AvatarPicker uses no hook but useTheme');
ok(!/Storage|getRaw|getItem|new Date\(|Date\.now|toLocale|useAuth/.test(picker), 'AvatarPicker reads no storage, dates, or auth');
ok(!RATIONING.test(picker), 'AvatarPicker has no cooldown, attempt, or cached-photo vocabulary');
ok(!NETWORK_OR_SCAN.test(picker), 'AvatarPicker makes no network or model call');
ok((picker.match(/styles\.uploadBanner\b/g) || []).length === 1, 'AvatarPicker renders exactly one banner (verify your email)');
const uploadSection = between(picker, /<View style=\{styles\.uploadSection\}>/, /<\/View>\s*<\/View>\s*\);/);
ok((uploadSection.match(/\?\s*\(/g) || []).length === 1 && /!verified \?/.test(uploadSection), 'upload section branches once, on the verified email only');
ok(!/cooldownRefreshKey/.test(profile), 'ProfileTab no longer passes a cooldown key to AvatarPicker');

// 8. Only the food, gym, chat-image, and speech services talk to Gemini with media.
const geminiMedia = srcFiles.filter((f) => /generativelanguage|vision\.googleapis|inline_data|inlineData|file_data|SAFE_SEARCH|chatWithCoachImage/.test(read(f))).map(rel).sort();
assert.deepStrictEqual(geminiMedia, [
  'src/components/AiBibleChat.js',
  'src/services/foodVisionService.js',
  'src/services/productionAiService.js',
  'src/services/speechProviders.js',
], `exact set of files that send media to Gemini (got ${geminiMedia.join(', ')})`);
ok(true, 'exact set of files that send media to Gemini is unchanged');
for (const f of ['src/screens/ProfileTab.js', 'src/components/SimpleOnboarding.js', 'src/components/AvatarPicker.js', 'src/services/storageService.js']) {
  const txt = stripComments(read(path.join(ROOT, f)));
  ok(!/inline_data|inlineData|file_data|generativelanguage|vision\.googleapis|SAFE_SEARCH|chatWithCoachImage/.test(txt), `${f} carries no Gemini media payload`);
}

// 9. Legal copy, sentence by sentence: any sentence about the profile photo
// must either use no scan vocabulary, or negate every scan word with no
// reversal ("not scanned by us, but checked by Gemini" fails).
const TRIGGER = /\b(profile|custom|own|your|uploaded)\s+(photo|picture|image)s?\b/i;
// Verbs and provider names only: a bare "AI" also appears in neutral
// sentences ("count daily AI usage") next to "profile photos".
const SCAN = /\b(check\w*|scan\w*|screen\w*|review\w*|moderat\w*|analys\w*|analyz\w*|vet\w*|inspect\w*|filter\w*|approv\w*|accept\w*|reject\w*|declin\w*|attempt\w*|cooldown\w*|strike\w*|Gemini|automatic\w*)\b/gi;
const NEGATION = /\b(not|never|isn't|aren't|no|without)\b/i;
const REVERSAL = /\b(but|however|before|once|after|unless|except)\b/i;
const GLOBAL_BANS = /three attempts|cooldown ends at midnight|profile picture rejected|attempts? left|until midnight|following day|photo checks|photo moderation|automatically (checked|scanned|screened|reviewed)/i;
const sentences = (txt) => txt
  .replace(/<[^>]+>/g, ' ')
  .split(/(?<=[.!?])\s+|\\n|\\u2022|\n/)
  .map((s) => s.trim())
  .filter(Boolean);
const legalTargets = {
  'in-app LegalScreen': path.join(ROOT, 'src/screens/LegalScreen.js'),
  'in-app onboarding consent': path.join(ROOT, 'src/components/SimpleOnboarding.js'),
  'site privacy-policy.html': path.join(SITE, 'privacy-policy.html'),
  'site terms-of-service.html': path.join(SITE, 'terms-of-service.html'),
  'site support.html': path.join(SITE, 'support.html'),
};
for (const [label, p] of Object.entries(legalTargets)) {
  const txt = read(p);
  const bad = txt.match(GLOBAL_BANS);
  ok(!bad, `${label} has no attempt/cooldown/scan phrasing${bad ? ` (found: "${bad[0]}")` : ''}`);
  const offenders = [];
  for (const s of sentences(txt)) {
    if (!TRIGGER.test(s)) continue;
    const hits = [...s.matchAll(SCAN)];
    if (!hits.length) continue;
    const negated = hits.every((h) => NEGATION.test(s.slice(0, h.index)));
    if (!negated || REVERSAL.test(s)) offenders.push(s.slice(0, 140));
  }
  ok(offenders.length === 0, `${label}: every profile-photo sentence is scan-free or plainly negated${offenders.length ? ` (offender: "${offenders[0]}")` : ''}`);
  ok(/not scanned|isn't scanned|never sent to Gemini|not sent to any AI/i.test(txt), `${label} states photos are not scanned`);
}
ok(/Last updated: 19 September 2026/.test(read(legalTargets['in-app LegalScreen'])), 'in-app legal dates bumped');
for (const f of ['privacy-policy.html', 'terms-of-service.html', 'support.html']) {
  ok(/Last updated: September 19, 2026/.test(read(path.join(SITE, f))), `${f} date bumped`);
}

console.log(`\nAll ${passed} profile-photo no-scan checks passed`);
