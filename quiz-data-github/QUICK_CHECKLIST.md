# Quick Setup Checklist ✅

## Before You Test

- [ ] Create GitHub repo named `biblely-quiz-data`
- [ ] Make it **PUBLIC** (very important!)
- [ ] Upload these 4 files to the repo:
  - [ ] `categories.json`
  - [ ] `questions.json`
  - [ ] `badges.json`
  - [ ] `levels.json`

- [ ] Open `fivefold-ios/src/services/quizService.js`
- [ ] Change line 4: Replace `Jvictor-19` with **YOUR** GitHub username
- [ ] Save the file

## Testing

- [ ] Restart your app completely
- [ ] Navigate to Quiz & Games
- [ ] You should see "Loading Quiz Data..." (first time only)
- [ ] Home screen should load with your progress
- [ ] Tap **Daily Challenge** button → Should start 5-question quiz
- [ ] Go back and tap **Speed Round** button → Should start 10-question quiz
- [ ] Try a regular category quiz → Should work normally

## If Something Goes Wrong

**App stuck on "Loading Quiz Data...":**
1. Check your GitHub username in `quizService.js` (line 4)
2. Make sure repo is PUBLIC
3. Verify JSON files are uploaded to GitHub
4. Check internet connection

**Daily Challenge/Speed Round not working:**
1. Check browser console for errors
2. Verify questions.json has proper structure
3. Make sure app has internet for first load

## GitHub URL Structure

Your quiz data will be at:
```
https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/categories.json
https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/questions.json
https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/badges.json
https://raw.githubusercontent.com/YOUR-USERNAME/biblely-quiz-data/main/levels.json
```

Test by opening these URLs in your browser - you should see JSON data.

## Done! 🎉

Once everything works:
- Daily Challenge refreshes every 24 hours automatically
- Speed Round gives fresh questions every tap
- Quiz data updates from GitHub every 24 hours
- Your app stays lightweight!

