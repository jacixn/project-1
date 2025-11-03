// Polyfill for URL.canParse for older Node versions (< 18.17.0)
if (typeof URL.canParse === 'undefined') {
  URL.canParse = function (url, base) {
    try {
      if (base !== undefined) {
        new URL(url, base);
      } else {
        new URL(url);
      }
      return true;
    } catch {
      return false;
    }
  };
}

