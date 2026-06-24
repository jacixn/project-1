/**
 * profanityFilterService.js
 *
 * LENIENT content filter for a Christian app's social hub.
 *
 * Philosophy: block genuinely offensive WORDS, not innocent words that merely
 * contain an offensive substring. Matching is WHOLE-WORD only (after light
 * normalization), so "hello", "helloooo", "class", "grass", "assist", "beer",
 * "hate", "kill it" all pass, while "fuck", "fuuuck", "sh1t", "sex", "bitch",
 * and slurs are blocked.
 *
 * Per-word normalization before matching:
 *  - unicode homoglyph + zero-width strip (anti-evasion)
 *  - lowercase, strip to letters
 *  - de-leet (3 to e, 1 to i, @ to a, $ to s, ...)
 *  - collapse repeated letters (fuuuck to fuck)
 * A small suffix expansion (s/ed/ing/er/...) covers plural and verb forms.
 */

// Curated blocked roots (whole-word matched, auto-expanded with suffixes).
const ROOTS = [
  // Core profanity
  'fuck', 'fuk', 'fuc', 'fck', 'fk', 'phuck', 'fucker', 'motherfucker', 'mofo',
  'shit', 'sht', 'shite', 'bullshit',
  'bitch', 'biatch', 'btch',
  'cunt', 'cnt', 'cvnt',
  'asshole', 'ahole', 'arsehole', 'jackass', 'dumbass', 'smartass',
  'dick', 'dickhead', 'cock', 'prick',
  'wanker', 'tosser', 'twat', 'bollocks', 'bugger',
  'bastard', 'douchebag', 'douche',

  // Slurs (zero tolerance)
  'nigger', 'nigga', 'niga', 'niger', 'faggot', 'fag', 'faggy',
  'retard', 'retarded', 'spic', 'chink', 'gook', 'kike', 'coon', 'paki',
  'wetback', 'beaner', 'tranny', 'trannie', 'dyke', 'negro', 'jigaboo',
  'sandnigger', 'towelhead', 'raghead', 'wop', 'dago',

  // Explicit sexual
  'sex', 'sexy', 'porn', 'porno', 'pornhub', 'onlyfans',
  'pussy', 'penis', 'vagina', 'boobs', 'boob', 'tits', 'titty', 'titties',
  'cum', 'jizz', 'sperm', 'blowjob', 'handjob', 'rimjob', 'deepthroat',
  'masturbate', 'masturbation', 'dildo', 'buttplug', 'anal', 'horny',
  'orgasm', 'boner', 'erection', 'gangbang', 'creampie', 'cumshot', 'bukkake',
  'hentai', 'milf', 'fap', 'clit', 'queef', 'nudes', 'slut', 'whore', 'thot',
  'pedophile', 'pedo', 'paedophile', 'paedo', 'molest', 'molester',
  'bestiality', 'incest',

  // Extreme / directed harm
  'rape', 'rapist', 'kys', 'kms',
];

const SUFFIXES = ['', 's', 'es', 'ed', 'er', 'ers', 'ing', 'in', 'y', 'a', 'ah'];

const BLOCKED_SET = new Set();
for (const root of ROOTS) {
  const clean = root.replace(/[^a-z]/g, '');
  if (!clean) continue;
  for (const suf of SUFFIXES) BLOCKED_SET.add(clean + suf);
}

// Multi-word phrases (matched as substrings of the spaced, letters-only text).
const BLOCKED_PHRASES = [
  'kill yourself', 'kill urself', 'kill ur self', 'kill myself', 'kill my self',
  'go kill yourself',
];

// Normalization helpers
const _normalize = (str) => str.replace(/[^a-z]/g, '');

const _deLeet = (str) => str
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
  .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
  .replace(/8/g, 'b').replace(/9/g, 'g').replace(/6/g, 'b')
  .replace(/@/g, 'a').replace(/\$/g, 's').replace(/!/g, 'i')
  .replace(/[^a-z]/g, '');

const _collapse = (str) => str.replace(/(.)\1+/g, '$1');

// Common Cyrillic/Greek/look-alike homoglyphs to Latin, built from numeric code
// points so the source contains no confusable literal characters.
const _HOMO_PAIRS = [
  [0x0430, 'a'], [0x0431, 'b'], [0x0435, 'e'], [0x0456, 'i'], [0x043E, 'o'], [0x0440, 'p'],
  [0x0441, 'c'], [0x0443, 'y'], [0x0445, 'x'], [0x043A, 'k'], [0x043C, 'm'],
  [0x043D, 'h'], [0x0442, 't'], [0x0451, 'e'], [0x044B, 'y'], [0x0455, 's'],
  [0x03B1, 'a'], [0x03B5, 'e'], [0x03B9, 'i'], [0x03BA, 'k'], [0x03BF, 'o'],
  [0x03C1, 'p'], [0x03C4, 't'], [0x03C5, 'u'], [0x03C7, 'x'],
  [0x00F8, 'o'], [0x0142, 'l'], [0x00F1, 'n'],
];
const HOMOGLYPHS = {};
for (const [cp, latin] of _HOMO_PAIRS) HOMOGLYPHS[String.fromCharCode(cp)] = latin;

const _isInvisible = (cp) =>
  cp === 0x00AD || cp === 0x034F || cp === 0x061C || cp === 0x180E || cp === 0xFEFF ||
  (cp >= 0x200B && cp <= 0x200F) || (cp >= 0x2028 && cp <= 0x202F) ||
  (cp >= 0x2060 && cp <= 0x2069) || (cp >= 0xFFF9 && cp <= 0xFFFC);

const _normalizeUnicode = (str) => {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (_isInvisible(cp)) continue;            // drop zero-width / format chars
    out += HOMOGLYPHS[ch] || ch;               // fold homoglyphs to Latin
  }
  // Strip combining diacritical marks (0x0300-0x036F).
  out = out.normalize('NFD');
  let stripped = '';
  for (const ch of out) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0300 && cp <= 0x036F) continue;
    // Fold full-width ASCII (0xFF01-0xFF5E) down to normal ASCII.
    stripped += (cp >= 0xFF01 && cp <= 0xFF5E) ? String.fromCharCode(cp - 0xFEE0) : ch;
  }
  return stripped;
};

/**
 * Whole-word profanity check (lenient).
 * @param {string} text
 * @returns {boolean}
 */
const containsProfanity = (text) => {
  if (!text || text.length === 0) return false;

  const raw = _normalizeUnicode(text).toLowerCase();
  const words = raw.split(/\s+/).filter(w => w.length > 0);

  for (const word of words) {
    const stripped = _normalize(word);
    if (!stripped) continue;
    const deleet = _deLeet(word);
    // Match the whole word (and its de-leeted / repeat-collapsed forms) against
    // the blocked set. Whole-word only, never a substring of a longer word.
    const variants = new Set([
      stripped, _collapse(stripped),
      deleet, _collapse(deleet),
    ]);
    for (const v of variants) {
      if (v && BLOCKED_SET.has(v)) return true;
    }
  }

  // Multi-word phrase check on the spaced, letters-only text.
  const spaced = raw.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  for (const phrase of BLOCKED_PHRASES) {
    if (spaced.includes(phrase)) return true;
  }

  return false;
};

export default { containsProfanity };
