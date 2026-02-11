# Active Context

## Current Focus: App Store Submission (February 8, 2026)

### App Store Readiness Audit - COMPLETED (code side)

All code-side changes for App Store submission have been implemented. The following manual steps remain for the developer:

---

## YOUR ACTION REQUIRED - App Store Checklist

### 1. Host Legal Pages (CRITICAL - Apple will reject without these)
- Three HTML files are ready in `fivefold-ios/legal/`:
  - `privacy-policy.html` -- Privacy Policy
  - `terms-of-service.html` -- Terms of Service
  - `support.html` -- Support & FAQ page
- **You must host these** on a public URL (GitHub Pages, Notion public page, or your own domain like `biblely.app`)
- Once hosted, update the URLs in `ProfileTab.js` -- search for `biblely.app/privacy-policy`, `biblely.app/terms-of-service`, `biblely.app/support` and replace with your real URLs
- Apple requires a **Privacy Policy URL** and a **Support URL** in App Store Connect

### 2. Fill in EAS Submit Credentials
- Open `fivefold-ios/eas.json`
- Replace these placeholder values:
  - `"appleId": "jesusxoi@example.com"` --> your real Apple ID email
  - `"ascAppId": "placeholder"` --> your App Store Connect App ID (numeric, found in App Store Connect > App Information)
  - `"appleTeamId": "placeholder"` --> your Apple Developer Team ID (found in developer.apple.com > Membership)

### 3. Take App Screenshots
- Required for App Store Connect listing
- Minimum sizes: **6.7" display** (iPhone 15 Pro Max) and **5.5" display** (iPhone 8 Plus)
- Since `supportsTablet: true`, you also need **12.9" iPad Pro** screenshots
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
- **Review Notes** -- Tell Apple: "This is a wellness/fitness tracker, NOT a medical device. No in-app purchases. No subscriptions. The app is completely free."

---

## What Was Done (Code Changes)

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

### Previous Major Features
- **Nutrition Tracker ("Fuel")** -- Full calorie & macro tracking with Gemini Vision food scanning, DeepSeek personalised targets, body composition insights
- **Body Composition ("Your Body")** -- Health Score, BMI, body fat, muscle mass, bone mass, body water, visceral fat, body age, ideal weight range -- located on PhysiqueScreen
- **Bible Data** -- 44 translations from private GitHub repo
- **Task System** -- Calendar scheduling, AI point assignment, celebration animations

## Critical Reminders
- **NEVER delete `fivefold-ios/ios/BiblelyVerseWidget/`** — this is the iOS widget extension. Protect it during all cleanup, refactoring, and cache-clearing operations.

## Next Steps
- Complete the 4 manual action items above
- Run `eas build --platform ios --profile production` to create the production build
- Run `eas submit --platform ios` to upload to App Store Connect
- Fill out all App Store Connect forms and submit for review
