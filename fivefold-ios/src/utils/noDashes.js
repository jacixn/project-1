// A dash guard for text that arrives from outside the build.
//
// The Bible map's locations are fetched from a JSON file on GitHub and cached
// on the device for a day, so correcting the file does not correct what a
// phone is already showing, and an older cached copy can resurface at any
// time. This cleans the text on the way to the screen, so the app never shows
// an em dash even when the data still has one.
//
// It is a safety net, not the fix. The copy itself is written without dashes.

const EM = /\s*[—–―]\s*|\s+--\s+/g;

/**
 * Replace every dash with the punctuation the sentence actually wants.
 * A following capital letter means a new sentence was starting, so it takes a
 * full stop; anything else takes a comma. A dash before "and" or "but" takes
 * a comma too, since a sentence should not open with one.
 */
export const deDash = (text) => {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(EM, (_m, offset, whole) => {
      const after = whole.slice(offset).replace(EM, '').trimStart();
      const word = after.split(/\s+/)[0] || '';
      if (/^(and|but|or|so|yet|nor)$/i.test(word)) return ', ';
      if (/^[A-Z]/.test(word) && !/^[A-Z]\./.test(word)) return '. ';
      return ', ';
    })
    // A dash next to punctuation can leave ", ," or ". ,".
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*,/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/** Every dash-like character this guards against, for tests to assert on. */
export const DASHES = ['—', '–', '―'];
export const hasDash = (text) => typeof text === 'string' && /[—–―]|\s--\s/.test(text);
