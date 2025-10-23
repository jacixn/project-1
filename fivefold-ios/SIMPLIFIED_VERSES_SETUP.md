# Simplified Bible Verses Repository Setup

This document explains how to set up a centralized GitHub repository to store AI-simplified Bible verses, saving money by reusing simplifications across all users.

## How It Works

1. **User opens a chapter in "Simplify" mode**
2. **App checks GitHub first** (fast & free) - if found, uses it instantly
3. **If not in GitHub, checks local cache** (7-day expiry)
4. **If not cached, uses AI** (costs money) - only happens once per chapter
5. **Saves to local cache** for offline access
6. **Optionally uploads to GitHub** for all users to benefit

## Benefits

- ✅ **Saves Money**: Each chapter only needs AI simplification ONCE
- ✅ **Faster Loading**: GitHub fetching is instant vs AI which takes time
- ✅ **Offline Support**: Local cache works without internet
- ✅ **Community Benefit**: Once simplified, ALL users benefit

## Setup Instructions

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new **public** repository
2. Name it: `simplified-bible-verses`
3. Initialize with a README
4. Create this folder structure:
   ```
   simplified-bible-verses/
   ├── README.md
   └── chapters/
       ├── gen/          (Genesis)
       ├── exo/          (Exodus)
       ├── lev/          (Leviticus)
       └── ... (one folder per book)
   ```

### 2. Update Repository URLs

In `src/services/simplifiedVersesRepository.js`, replace:

```javascript
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/YOUR_USERNAME/simplified-bible-verses/main';
const GITHUB_API_BASE = 'https://api.github.com/repos/YOUR_USERNAME/simplified-bible-verses';
```

With your actual GitHub username:

```javascript
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/yourusername/simplified-bible-verses/main';
const GITHUB_API_BASE = 'https://api.github.com/repos/yourusername/simplified-bible-verses';
```

### 3. (Optional) Enable Auto-Upload to GitHub

To automatically upload new simplifications to GitHub for other users:

#### Step A: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it: "Biblely Simplified Verses"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately (you won't see it again)

#### Step B: Add Token to App

You have two options:

**Option 1: Hardcode in App (Quick but less secure)**
```javascript
// In BibleReader.js, uncomment and modify Step 5:
const githubToken = 'your_github_token_here';
```

**Option 2: User Configuration (More secure)**
```javascript
// Store token securely per user
await AsyncStorage.setItem('github_token', 'user_token');
```

#### Step C: Uncomment Upload Code

In `BibleReader.js` around line 489, uncomment this section:

```javascript
// STEP 5: Try to save to GitHub for future users
try {
  const githubToken = await AsyncStorage.getItem('github_token');
  if (githubToken) {
    console.log('📤 Uploading to GitHub for other users...');
    await simplifiedVersesRepository.saveSimplifiedChapter(
      bookId,
      bookName,
      chapterNum,
      simplifiedMap,
      githubToken
    );
  }
} catch (uploadError) {
  console.log('⚠️ Could not upload to GitHub:', uploadError.message);
}
```

### 4. File Format

Each simplified chapter is stored as:
```
chapters/{bookId}/{chapterNumber}.json
```

Example: `chapters/gen/1.json`

```json
{
  "book": "Genesis",
  "bookId": "gen",
  "chapter": 1,
  "simplifiedDate": "2025-01-21T12:00:00.000Z",
  "verseCount": 31,
  "verses": {
    "gen.1.1": "In the beginning, God made the sky and the earth.",
    "gen.1.2": "The earth had no shape and was empty...",
    ...
  }
}
```

## How to Manually Add Simplified Chapters

If you want to pre-populate some chapters:

1. Simplify a chapter using the app (it will save to local cache)
2. Get the simplified JSON from the console logs
3. Create a file: `chapters/{bookId}/{chapter}.json`
4. Commit and push to your repository

## Monitoring

Check console logs to see the caching behavior:

```
🤖 Starting to get simplified verses for Genesis 1
📡 Step 1: Checking GitHub repository...
✅ Found in GitHub! Using pre-simplified verses (saved AI costs)
```

or

```
📡 Step 1: Checking GitHub repository...
📝 Not found in GitHub, checking local cache...
💾 Step 2: Checking local cache...
🤖 Step 3: Using AI to simplify verses (this costs money)...
```

## Cost Savings Example

- **Without GitHub**: 1,189 chapters × 30 verses × $0.001/verse = **$35.67** every time
- **With GitHub**: First user pays $35.67, all other users pay **$0**
- **After 10 users**: Saved **$320**
- **After 100 users**: Saved **$3,567**

## Book IDs Reference

Use these IDs for the `chapters/` folder structure:

### Old Testament
- gen (Genesis), exo (Exodus), lev (Leviticus), num (Numbers), deu (Deuteronomy)
- jos (Joshua), jdg (Judges), rut (Ruth), 1sa (1 Samuel), 2sa (2 Samuel)
- 1ki (1 Kings), 2ki (2 Kings), 1ch (1 Chronicles), 2ch (2 Chronicles)
- ezr (Ezra), neh (Nehemiah), est (Esther), job (Job), psa (Psalms)
- pro (Proverbs), ecc (Ecclesiastes), sng (Song of Songs), isa (Isaiah)
- jer (Jeremiah), lam (Lamentations), ezk (Ezekiel), dan (Daniel)
- hos (Hosea), jol (Joel), amo (Amos), oba (Obadiah), jon (Jonah)
- mic (Micah), nam (Nahum), hab (Habakkuk), zep (Zephaniah)
- hag (Haggai), zec (Zechariah), mal (Malachi)

### New Testament
- mat (Matthew), mrk (Mark), luk (Luke), jhn (John), act (Acts)
- rom (Romans), 1co (1 Corinthians), 2co (2 Corinthians)
- gal (Galatians), eph (Ephesians), php (Philippians), col (Colossians)
- 1th (1 Thessalonians), 2th (2 Thessalonians)
- 1ti (1 Timothy), 2ti (2 Timothy), tit (Titus), phm (Philemon)
- heb (Hebrews), jas (James), 1pe (1 Peter), 2pe (2 Peter)
- 1jn (1 John), 2jn (2 John), 3jn (3 John), jud (Jude), rev (Revelation)

## Security Notes

- Keep your GitHub token **SECRET**
- Never commit tokens to your code repository
- Use environment variables or secure storage
- Regenerate token if compromised
- Consider using GitHub Actions for automated uploads instead

## Questions?

The system will work fine without GitHub - it will just use AI every time. GitHub is an optimization to save money and improve speed.




