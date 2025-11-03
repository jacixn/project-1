# Quiz Data GitHub Setup Instructions

## Step 1: Create a New GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **"+"** button in the top right → **"New repository"**
3. Repository name: **`biblely-quiz-data`**
4. Description: "Quiz data for Biblely app"
5. Set to **Public** (so the app can fetch without authentication)
6. Click **"Create repository"**

## Step 2: Upload the Quiz Data Files

### Option A: Using GitHub Website (Easiest)

1. Go to your new repository: `https://github.com/YOUR-USERNAME/biblely-quiz-data`
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop these 4 files:
   - `categories.json`
   - `questions.json`
   - `badges.json`
   - `levels.json`
4. Add commit message: "Initial quiz data upload"
5. Click **"Commit changes"**

### Option B: Using Terminal (Alternative)

```bash
cd /Users/jz/Desktop/github/project-1/quiz-data-github

git init
git add .
git commit -m "Initial quiz data upload"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/biblely-quiz-data.git
git push -u origin main
```

## Step 3: Update the App Configuration

In the file: `/Users/jz/Desktop/github/project-1/fivefold-ios/src/services/quizService.js`

Update line 4 with YOUR GitHub username:

```javascript
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main';
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 4: Verify Setup

1. The quiz data files should now be accessible at:
   - `https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/categories.json`
   - `https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/questions.json`
   - `https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/badges.json`
   - `https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/levels.json`

2. Test by opening one of the URLs in your browser - you should see the JSON data

## Step 5: Test the App

1. Restart your Biblely app
2. Open Quiz & Games
3. The app will fetch data from GitHub (you'll see a loading screen)
4. Try Daily Challenge and Speed Round buttons

## Adding New Questions

To add more questions in the future:

1. Edit `questions.json` in your GitHub repository
2. Click the **pencil icon** to edit
3. Add your new questions following the existing structure
4. Commit changes
5. App users will get the new questions within 24 hours (cache refresh)

## Current Quiz Data Stats

- **Categories**: 6 (4 unlocked, 2 locked)
- **Total Questions**: 30+ questions
- **Question Types**: Multiple Choice & True/False
- **Difficulties**: Beginner & Intermediate
- **Badges**: 8 achievement badges
- **Levels**: 8 progression levels

## Need to Force Refresh?

Users can force refresh quiz data by:
1. Going to Stats tab
2. Pull down to refresh (if you implement pull-to-refresh)

Or data automatically refreshes every 24 hours.

## Troubleshooting

**App shows "Loading Quiz Data..." forever:**
- Check your GitHub username in `quizService.js`
- Verify the repository is PUBLIC
- Check the JSON files are valid (no syntax errors)
- Check internet connection

**Questions not updating:**
- Wait 24 hours for cache to expire
- Or clear app data and reopen

## Done!

Your quiz data is now hosted on GitHub and the app is lightweight! 🎉

