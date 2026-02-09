# Progress

## Working
- Daily verse retrieval and Verse of the Day modal flow exists in `fivefold-ios/src/screens/BiblePrayerTab.js`.
- Share card capture + save to Photos works via ViewShot + MediaLibrary.
- Theme + language contexts are integrated across major screens.
- **Bible reader with 44 translations** — fetched from private GitHub repo (`jacixn/bible-versions`) with PAT auth. Cached locally for 30 days.
- **Nutrition Tracker ("Fuel")** — full calorie & macro tracking with food scanning (Gemini Vision), manual entry, favorites, personalised targets (DeepSeek), animated dashboard
- **Body Composition ("Your Body")** — Health Score, 14+ body metrics, expandable card on PhysiqueScreen
- **App Store legal pages** — Privacy Policy, Terms of Service, Support/FAQ in `fivefold-ios/legal/`
- **Legal links in Settings** — Privacy Policy, Terms of Service, Support & FAQ accessible from ProfileTab
- **Marketing copy** — App Store description, subtitle, keywords ready in `fivefold-ios/legal/app-store-copy.md`

## Recently improved (Feb 8, 2026)
- **App Store readiness audit** — all code-side issues fixed (permissions, version mismatch, privacy manifest, API key security, legal links)
- **PrivacyInfo.xcprivacy** — now declares 8 collected data types (was empty before)
- **Permission strings** — camera and photo library descriptions now accurately mention food scanning
- **Info.plist version** — fixed mismatch (was 1.0.43, now 1.0.46 matching app.json)
- **OCR API key** — moved from hardcoded to gitignored `ocr.config.js`
- **Nutrition Tracker ("Fuel")** — full calorie & macro tracking system with body profile setup, TDEE calculation, food logging (camera via Gemini Vision + manual), favorites, animated dashboard with calorie ring
- **AI Workout Integration** — smart workout generator now uses nutrition data (calories, goal, weight) to suggest appropriate exercise weights and rep ranges
- **Bible data fully migrated** — scraped 44 translations (31,102 verses each) from BibleHub.com and hosted on private GitHub repo
- Expanded `bibleVersions.js` from 31 to 44 translations
- Updated all onboarding/marketing text from "35+" to "44" translations
- Fixed blank Bible reader screen (iPad NLT issue) — root cause was missing data files in the old source repo

## Previously improved (Dec 14, 2025)
- Increased readability/contrast in Verse of the Day modal by:
  - Adding a darker scrim behind verse text
  - Making action buttons use darker gradients for consistent contrast on pastel backgrounds
  - Adding subtle text shadows for title/quote/reference

## Known risks
- Low-contrast UI can recur anywhere white text is placed on light gradients/glass with low opacity.
- If the GitHub PAT in `github.config.js` expires, Bible fetching will fail silently (returns empty array). Generate a new Fine-grained PAT scoped to `jacixn/bible-versions` with Contents read permission.
- The `github.config.js` file is gitignored — after a fresh clone, it must be recreated manually with the PAT.
- The `gemini.config.js` file is gitignored — after a fresh clone, it must be recreated with a Google AI Studio API key for food photo analysis to work. Without it, the Scan Food feature gracefully falls back (user can still enter manually).
- The `ocr.config.js` file is gitignored — after a fresh clone, it must be recreated with an OCR.space API key.
- The `deepseek.config.js` file is gitignored — required for personalised nutrition targets, physique coaching, task analysis, and other smart features.

## YOUR ACTION REQUIRED FOR APP STORE SUBMISSION
1. **Host legal pages** — Upload 3 HTML files from `fivefold-ios/legal/` to a public URL, then update URLs in ProfileTab.js
2. **Fill in eas.json** — Replace placeholder appleId, ascAppId, appleTeamId with real credentials
3. **Take screenshots** — 6.7", 5.5", and 12.9" iPad sizes for App Store Connect
4. **Fill out App Store Connect** — App Privacy declarations, age rating, paste marketing copy from `legal/app-store-copy.md`
5. **Submit** — `eas build --platform ios --profile production` then `eas submit --platform ios`

## Next work
- Complete the 4 manual App Store submission steps listed above
- Submit for Apple review
- Monitor review feedback and address any rejection reasons
