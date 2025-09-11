# 📖 Fivefold Bible Verses Repository

This repository hosts the Bible verses data for the Fivefold iOS app.

## 🚀 Quick Setup Instructions

### 1. Create a new GitHub repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it: `fivefold-bible-verses` (or any name you prefer)
3. Make it **Public** (so the app can fetch without authentication)
4. Initialize with README

### 2. Upload the verses.json file
1. Upload the `verses.json` file to the root of your repository
2. Commit with message: "Initial verses data - 370 verses across 30 categories"

### 3. Get the raw file URL
Your verses will be available at:
```
https://raw.githubusercontent.com/YOUR_USERNAME/fivefold-bible-verses/main/verses.json
```

Replace `YOUR_USERNAME` with your GitHub username.

## 📊 Data Structure

The `verses.json` file contains:
- **370 Bible verses** across 30 categories
- **Categories** with colors, icons, and gradients
- **Metadata** including version and last updated timestamp

### Example structure:
```json
{
  "categories": [...],
  "verses": {
    "faith": [
      {
        "id": "hebrews-11-1",
        "text": "Now faith is confidence in what we hope for...",
        "reference": "Hebrews 11:1",
        "category": "faith",
        "theme": "Trust in the Unseen",
        "context": "The author of Hebrews defines faith...",
        "keywords": ["faith", "confidence", "hope"],
        "relatedVerses": ["romans-10-17"],
        "memorability": "high",
        "popularity": 95
      }
    ]
  },
  "metadata": {
    "totalVerses": 370,
    "totalCategories": 30,
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## 🔄 Updating Verses

To add new verses or update existing ones:
1. Edit the `verses.json` file directly on GitHub
2. The app will automatically fetch the latest version
3. No app store update required! 🎉

## 📱 App Integration

The Fivefold app fetches verses from this repository and caches them locally for offline access.

