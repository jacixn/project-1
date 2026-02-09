# Tech Context

## Stack
- React Native + Expo (iOS focus)
- JavaScript codebase (not TypeScript)

## Notable libraries
- `expo-blur` for blur/glass effects
- `expo-linear-gradient` for gradients
- `@expo/vector-icons` for icons
- `@react-native-async-storage/async-storage` for persistence
- `react-native-view-shot` + `expo-media-library` for share-card capture + saving

## Dev notes / constraints
- Previous repo corruption incidents required re-cloning; keep commits small and verify files are non-empty.
- RN version warnings may prefer newer Node, but project has been running with Node 18 historically.

## Bible Data Architecture

### How Bible translations are hosted
- **44 English Bible translations** are stored as JSON files in a **private** GitHub repository: `https://github.com/jacixn/bible-versions`
- Files live at `versions/en/<TRANSLATION NAME>.json` (e.g., `versions/en/NEW LIVING TRANSLATION.json`)
- The app fetches them via `raw.githubusercontent.com` using a GitHub Personal Access Token (PAT) for authentication
- PAT is stored in `fivefold-ios/github.config.js` (gitignored, never committed)

### Key files
- `fivefold-ios/src/services/githubBibleService.js` — Primary Bible fetch service. Uses PAT from `github.config.js`. Caches data in AsyncStorage for 30 days.
- `fivefold-ios/src/data/bibleVersions.js` — Defines all 44 translations with their `id`, `abbreviation`, `githubFile` name, etc.
- `fivefold-ios/github.config.js` — Contains `GITHUB_CONFIG.token` (the PAT). **Gitignored.** Format:
  ```js
  export const GITHUB_CONFIG = {
    token: 'github_pat_xxxx...',
  };
  ```

### If Bible data is lost — How to re-scrape
All Bible data was scraped from BibleHub.com on Feb 7-8, 2026. If the `jacixn/bible-versions` repo is ever lost or needs rebuilding:

1. **Install Python dependencies:**
   ```bash
   pip3 install beautifulsoup4 requests html5lib
   ```

2. **Get the scraper scripts** (previously saved at `/Users/jz/Desktop/bible-scraper/`):
   - `bible_scraper.py` — Scrapes every verse from BibleHub.com for all translations. Has `--resume` flag, caches HTML locally in `html_cache/`, saves progress to `scraper_progress.json`, outputs to `bible_data.json`. Takes ~4-5 hours.
   - `finish_and_deploy.py` — Splits `bible_data.json` into individual `versions/en/<NAME>.json` files.

3. **Run the scraper:**
   ```bash
   cd /Users/jz/Desktop/bible-scraper
   python3 bible_scraper.py --output bible_data.json
   # Monitor: tail -f bible_scraper.log
   # If it crashes, resume: python3 bible_scraper.py --resume --output bible_data.json
   ```

4. **Split into version files:**
   ```bash
   python3 finish_and_deploy.py
   ```5. **Push to GitHub (private repo):**
   ```bash
   cd /Users/jz/Desktop/bible-scraper
   git init
   git config http.postBuffer 524288000   # Needed for large push (~157MB)
   git add versions/
   git commit -m "Add Bible translations"
   git remote add origin https://github.com/jacixn/bible-versions.git
   git branch -M main
   git push -u origin main
   ```

6. **Generate a new PAT if needed:**
   - Go to GitHub > Settings > Developer Settings > Fine-grained tokens
   - Create token scoped to `jacixn/bible-versions` with read-only "Contents" permission
   - Paste into `fivefold-ios/github.config.js`

### Scraper output stats (Feb 8, 2026)
- 31,102 verses scraped
- 44 translations found
- Total data: ~157MB across 44 JSON files
- Full Bible translations (66 books): NIV, NLT, ESV, KJV, NKJV, NASB, CSB, AMP, CEV, GNT, GWT, LSV, YLT, BLB, BSB, ASV, WEB, DRB, CPDV, NAB, NRSV, NHEB, WBT, SLT, ERV, HCSB, ISV, LAMSA, LSB, MSB, NASB77, NASB95, NET
- OT only: JPS Tanakh 1917, Brenton Septuagint, Peshitta Holy Bible
- NT only: Anderson, Weymouth, Worrell, Worsley, Godbey, Haweis, Mace, Aramaic Bible in Plain English, Berean Literal Bible
