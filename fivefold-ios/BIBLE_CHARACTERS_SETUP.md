# Bible Characters - GitHub Setup Guide

This guide will help you set up the GitHub repository to store your Bible character data dynamically, so you can update character information without rebuilding the app.

## What Changed

- **Before**: All character data was hardcoded in `BibleStudyModal.js`
- **After**: Character data is loaded from a JSON file on GitHub

## Setup Steps

### 1. Update the GitHub URL

Open `fivefold-ios/src/services/bibleCharactersService.js` and update this line with your actual GitHub repo info:

```javascript
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/bible-characters.json';
```

Replace:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO` with your repository name

Example:
```javascript
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jsmith/biblely-data/main/bible-characters.json';
```

### 2. Update Image URLs (Optional)

If you want to host character images on GitHub, update the `imageUrl` fields in `bible-characters.json`:

```json
"imageUrl": "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/profileImage/adam1.png"
```

**Note**: Right now, the app uses local images as fallback, so this is optional.

### 3. Upload to GitHub

1. **Create a new repository** (or use existing):
   - Go to github.com
   - Click "New repository"
   - Name it (e.g., `biblely-data` or `bible-characters`)
   - Make it **Public** (required for raw file access)

2. **Upload the JSON file**:
   - Go to your repository
   - Click "Add file" → "Upload files"
   - Upload `bible-characters.json`
   - Commit the changes

3. **Upload character images** (optional):
   - Create a folder called `profileImage`
   - Upload your character images (adam1.png, eve1.png, etc.)

### 4. Test the Setup

1. **Get the raw URL**:
   - Open `bible-characters.json` in your GitHub repo
   - Click the "Raw" button
   - Copy the URL (should look like the GITHUB_RAW_URL above)

2. **Update the service**:
   - Paste the URL in `bibleCharactersService.js`

3. **Run the app**:
   - The app will automatically fetch character data on startup
   - Check the console for:
     ```
     ✅ Loaded 4 characters and 8 groups
     ```

## How It Works

### Data Flow

```
App Starts
    ↓
Load from GitHub (if internet available)
    ↓
Cache locally for 24 hours
    ↓
Use cached data on next startup (faster)
    ↓
Refresh from GitHub after 24 hours
```

### Caching

- **First Load**: Fetches from GitHub
- **Subsequent Loads**: Uses cached data for 24 hours
- **Offline**: Uses last cached data
- **Cache Duration**: 24 hours (configurable in `bibleCharactersService.js`)

## Adding New Characters

### 1. Edit the JSON File

Open `bible-characters.json` and add a new character:

```json
{
  "characters": {
    "Noah": {
      "name": "Noah - The Ark Builder",
      "imageUrl": "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/profileImage/noah.png",
      "story": "Noah was a righteous man who built an ark...",
      "themes": [
        "Faith and Obedience: Noah trusted God completely",
        "God's Judgment: The flood represented divine judgment"
      ],
      "culturalImpact": "Noah's ark is one of the most famous stories...",
      "verses": ["Genesis 6:9", "Genesis 7:1", "Hebrews 11:7"]
    }
  }
}
```

### 2. Add to Character Group

Update the `characterGroups` array to include the new character:

```json
{
  "characterGroups": [
    {
      "id": "noah",
      "title": "Noah's Ark & The Great Flood",
      "icon": "🚢",
      "characters": ["Noah", "Noah's Wife", "Shem", "Ham", "Japheth"]
    }
  ]
}
```

### 3. Commit Changes

- Save the JSON file
- Commit to GitHub
- **That's it!** No app rebuild needed

### 4. Force Refresh (Optional)

If users need the update immediately:
- They can close and reopen the app
- Or wait up to 24 hours for automatic refresh

## Local Images

Character images are currently stored locally in `/Users/jz/Desktop/github/project-1/fivefold-ios/src/assets/`:

- `adam.png`
- `eve.png`
- `cain.png`
- `abel.png`

To add images for new characters, update `getLocalImage()` in `BibleStudyModal.js`:

```javascript
const getLocalImage = (characterName) => {
  const imageMap = {
    'Adam': require('../assets/adam.png'),
    'Eve': require('../assets/eve.png'),
    'Cain': require('../assets/cain.png'),
    'Abel': require('../assets/abel.png'),
    'Noah': require('../assets/noah.png'), // Add new character
  };
  return imageMap[characterName] || null;
};
```

## Troubleshooting

### Characters Not Loading

1. **Check the URL**: Make sure `GITHUB_RAW_URL` is correct
2. **Check GitHub**: Ensure repository is Public
3. **Check JSON**: Validate syntax at jsonlint.com
4. **Check Console**: Look for error messages in app logs

### Clear Cache

To force reload from GitHub:

```javascript
// In your app code
await bibleCharactersService.clearCache();
await bibleCharactersService.refresh();
```

## Benefits

✅ **No App Updates**: Update content without rebuilding  
✅ **Fast Loading**: 24-hour cache for speed  
✅ **Offline Support**: Works without internet after first load  
✅ **Easy Management**: Edit JSON file, commit, done  
✅ **Version Control**: Track all changes in Git history  

## Current Status

- **4 Characters Loaded**: Adam, Eve, Cain, Abel
- **8 Character Groups**: Defined with hundreds of character names
- **Ready for Expansion**: Just add JSON entries for new characters

## Next Steps

1. Create GitHub repository
2. Update `GITHUB_RAW_URL` in `bibleCharactersService.js`
3. Upload `bible-characters.json`
4. Start adding more characters to the JSON file!

---

**Questions?** Check the console logs for debugging info:
- `📥 Fetching Bible characters from GitHub...`
- `✅ Loaded X characters from GitHub`
- `❌ Error fetching from GitHub: [error message]`



