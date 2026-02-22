# Active Context

## Current Focus: App Store Submission (February 8, 2026)

### App Store Readiness Audit - COMPLETED (code side)

All code-side changes for App Store submission have been implemented. The following manual steps remain for the developer:

---

## YOUR ACTION REQUIRED - App Store Checklist

### 1. ~~Host Legal Pages~~ -- DONE
- Website `biblely.uk` is live and hosting privacy policy, terms of service, and support pages
- URLs in the app already point to `biblely.uk/privacy-policy`, `biblely.uk/terms-of-service`

### 2. ~~Fill in EAS Submit Credentials~~ -- DONE (February 22, 2026)
- `eas.json` updated with real credentials:
  - `appleId`: `antwijason55@icloud.com`
  - `ascAppId`: `6754227503`
  - `appleTeamId`: `HM3DN88VTX`

### 3. Take App Screenshots
- Required for App Store Connect listing
- Minimum sizes: **6.7" display** (iPhone 15 Pro Max) and **5.5" display** (iPhone 8 Plus)
- `supportsTablet: false` so NO iPad screenshots needed
- Use Xcode Simulator to capture screenshots at each size
- Recommended: 5-8 screenshots showing key features (Bible, Prayer, Workouts, Nutrition, Todos)

### 4. Fill Out App Store Connect Forms
- **App Privacy declarations** -- Declare these data types (all for "App Functionality", linked to identity, no tracking):
  - Contact Info (email)
  - Name
  - User ID
  - Photos (not linked to identity)
  - Other User Content (prayers, journal, todos, saved verses)
  - Fitness (workout history)
  - Health (nutrition data, body composition)
  - Other Usage Data (streaks, points, app interactions)
- **Age Rating questionnaire** -- No violence, no gambling, no mature themes. Contains religious content. Likely rating: 4+ or 9+
- **Marketing copy** -- Ready in `fivefold-ios/legal/app-store-copy.md` (app name, subtitle, description, keywords, categories). Just copy-paste into App Store Connect.
- **License Agreement (EULA)** -- Use Apple's standard EULA (already selected in App Store Connect)
- **Review Notes** -- Paste this into App Store Connect > App Review > App Review Information > Review Notes:

```
This is a wellness/fitness tracker and Bible reading app, NOT a medical device. No in-app purchases. No subscriptions. The app is completely free.

HEALTH & FITNESS DISCLAIMER: The app provides body composition estimates (BMI, body fat %, muscle mass, body water %, visceral fat, bone mass, body age, Health Score) using standard research-based formulas (Mifflin-St Jeor, BMI calculations). These are for informational and wellness tracking purposes only — they are NOT clinical measurements and are NOT intended to diagnose, treat, or prevent any medical condition. The app clearly states this in multiple places: the App Store description, in-app disclaimers on the Physique screen, Nutrition screen, Gym screen, and in the Terms of Service (Section 8). Users are advised to consult healthcare professionals for medical accuracy.

The app uses DeepSeek for text-based analysis features (Bible study responses, task scoring, workout suggestions, nutrition insights). Users are explicitly informed about this data transfer during onboarding and in the Privacy Policy (Section 4.3 & 5), which clearly states data may be processed on servers in China. No account credentials or authentication tokens are sent to DeepSeek. Users must accept the privacy terms before using the app.

User-generated content features (prayer wall, social feed, messaging) are moderated with automated profanity filtering, user reporting, and user blocking mechanisms.
```

### 5. Remaining Code Issues to Fix Before Submission
- **Bible Translation Copyrights (CRITICAL)** -- Many of the 44 Bible translations are copyrighted (NIV, ESV, NLT, NKJV, NASB, etc.). Either get licenses, use an API like API.Bible, or remove copyrighted ones and keep only public domain translations (KJV, ASV, WEB, YLT, Darby, WBT).
- **"Coming Soon" Placeholder Text** -- Found in ~10+ locations (CustomisationScreen, ProfileTab, SimpleOnboarding, EnhancedOnboarding, ExercisesModal, translations/languages.js). Apple may reject for incomplete app (Guideline 2.1). Either implement the features, remove the buttons, or replace with proper disabled states.

---

## What Was Done (Code Changes)

### Loading Animation Unification (February 2026)
- **Created `CustomLoadingIndicator` component** (`src/components/CustomLoadingIndicator.js`) — a drop-in replacement for `ActivityIndicator` that reads the user's selected loading animation from `userStorage('fivefold_loading_animation')` and validates against referral count gates.
- **Updated 20+ screens/components** to use `CustomLoadingIndicator` for all full-screen and section loading states:
  - Screens: LeaderboardScreen, NutritionScreen, PhysiqueScreen, FriendsScreen, MessagesScreen, PrayerWallScreen, BibleCharactersScreen, ChallengesScreen, ChatScreen, ProfileTab (language change, analytics, reports, restrictions, sign-out)
  - Components: BibleReader, ExercisesModal, EnhancedPrayerCard, VoicePickerModal, CreateChallengeModal, ShareVerseModal, WorkoutExercisePicker
- Bible components (BibleFastFacts, ThematicGuides, KeyVerses, InteractiveBibleMaps, BibleTimeline) already used `SimplePercentageLoader` which reads the user's animation preference internally.
- Inline button spinners (send, accept, verify, etc.) intentionally left as small `ActivityIndicator` for appropriate sizing.

### App Store Prep Changes (February 8, 2026)
1. **Privacy Policy, ToS, Support pages** -- Created in `fivefold-ios/legal/`
2. **Legal section in Settings** -- Added Privacy Policy, Terms of Service, and Support & FAQ links to ProfileTab.js under a "Legal" card
3. **Permission strings fixed** -- Camera and photo library descriptions in both `app.json` and `Info.plist` now mention food scanning
4. **Info.plist version fixed** -- Updated from 1.0.43/43 to 1.0.46/46 to match app.json
5. **PrivacyInfo.xcprivacy updated** -- Now declares 8 collected data types (email, name, user ID, photos, user content, fitness, health, usage data)
6. **OCR API key secured** -- Moved from hardcoded in `ocrService.js` to gitignored `ocr.config.js`
7. **Marketing copy drafted** -- Full App Store description, subtitle, keywords in `legal/app-store-copy.md`
8. **`.cursorrules` updated** -- Documented OCR config pattern and legal file locations
9. **`.gitignore` updated** -- Added `ocr.config.js`

### 17 New Themes Added (February 21, 2026)
- Added 17 new themes, all free (0 referrals): Cotton Candy, Ascent, Mach, Serenity, Pastures, Good Shepherd, Aurora, Minecraft, Meadow, Walk on Water, Heavens, Calvary, Retro, Nightfall, Cozy Study, Shores, Canopy
- Each theme has its own folder under `src/themes/` with `theme.js` (light + dark mode) and `wallpaper1.jpg`
- Registered in: `ThemeContext.js`, `CustomisationScreen.js`, `ThemeModal.js`
- Fixed `AnimatedWallpaper.js` to dynamically load wallpapers for ANY theme via `themeWallpapers[currentTheme]` instead of hardcoded if-statements
- Fixed all tab screens (BiblePrayerTab, TodosTab, GymTab, ProfileTab) and Settings.js to use `currentTheme !== 'light' && currentTheme !== 'dark'` for transparent background instead of hardcoded theme boolean checks — this was the root cause of wallpapers not showing for new themes
- App now has **25 total themes**

### Previous Major Features
- **Nutrition Tracker ("Fuel")** -- Full calorie & macro tracking with Gemini Vision food scanning, DeepSeek personalised targets, body composition insights
- **Body Composition ("Your Body")** -- Health Score, BMI, body fat, muscle mass, bone mass, body water, visceral fat, body age, ideal weight range -- located on PhysiqueScreen
- **Bible Data** -- 44 translations from private GitHub repo
- **Task System** -- Calendar scheduling, AI point assignment, celebration animations

### Quiz Questions System (February 2026)
- Added 200 contextual questions for **New Testament**, **Old Testament**, and **Life of Jesus** categories (600 total so far)
- Quiz data lives in `quiz-data/questions.json`, fetched from GitHub CDN with cache-busting
- **Remaining categories to fill**: Miracles, Parables, Women of the Bible (0 questions each)
- Each category gets 200 questions: 35 MC beginner, 35 MC intermediate, 30 MC advanced, 35 TF beginner, 35 TF intermediate, 30 TF advanced
- Questions MUST be written with full context (setting the scene, explaining who/what/where) — never short context-free questions
- See `.cursorrules` "Quiz Questions" section for full writing guidelines

## Critical Reminders
- **NEVER delete `fivefold-ios/ios/BiblelyVerseWidget/`** — this is the iOS widget extension. Protect it during all cleanup, refactoring, and cache-clearing operations.

## Next Steps
- Complete the 4 manual action items above
- Run `eas build --platform ios --profile production` to create the production build
- Run `eas submit --platform ios` to upload to App Store Connect
- Fill out all App Store Connect forms and submit for review
