# Fix Xcode Upload Issues ✅

I've fixed the errors you encountered! Here's what was changed and what to do next:

## ✅ Issues Fixed

### 1. Invalid UIBackgroundModes Value
**Problem**: Had duplicate entries and invalid value `background-processing`
**Fixed**: 
- Removed duplicates
- Changed `background-processing` to `processing` (the correct iOS value)
- Updated both `Info.plist` and `app.json`

### 2. Missing dSYM Symbols
**Problem**: React Native frameworks missing debug symbols
**Solution**: Skip symbol upload during distribution (you can upload them later if needed)

---

## 🚀 Try Again - Two Options

### Option A: Archive Again in Xcode (Recommended)

Since we fixed the Info.plist, you need to archive again:

1. **In Xcode**:
   - Make sure you saved all changes (Cmd+S or just close and reopen Xcode)
   - Select **"Any iOS Device (arm64)"** as destination
   - Go to **Product → Clean Build Folder** (hold Option key: Shift+Cmd+K)
   - Go to **Product → Archive**

2. **When Organizer opens**:
   - Click **"Distribute App"**
   - Choose **"App Store Connect"**
   - Choose **"Upload"**
   - **IMPORTANT**: On the "App Store Connect distribution options" screen:
     - ✅ **UNCHECK** "Upload your app's symbols"
     - ✅ **UNCHECK** "Include bitcode" (if visible)
   - Continue with **"Automatically manage signing"**
   - Click **"Upload"**

This will skip the dSYM upload that was causing errors.

---

### Option B: Use EAS Build Instead (Easier!)

EAS Build handles all these issues automatically:

```bash
cd /Users/jz/Desktop/github/project-1/fivefold-ios

# Build and submit automatically
eas build --platform ios --profile production --auto-submit
```

This avoids all Xcode configuration issues and handles symbols correctly.

---

## 🔍 What Changed

**Files Modified:**
1. `ios/Biblely/Info.plist` - Fixed UIBackgroundModes
2. `app.json` - Updated to match

**Changes:**
```xml
<!-- BEFORE (Wrong - had duplicates and invalid value) -->
<key>UIBackgroundModes</key>
<array>
  <string>background-processing</string>
  <string>remote-notification</string>
  <string>background-processing</string>
  <string>remote-notification</string>
</array>

<!-- AFTER (Correct - added required BGTaskSchedulerPermittedIdentifiers) -->
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.jesusxoi.biblely.refresh</string>
  <string>com.jesusxoi.biblely.processing</string>
</array>
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
  <string>processing</string>
</array>
```

---

## 📱 Valid iOS Background Modes

For future reference, valid iOS UIBackgroundModes are:
- `audio` - Audio playback
- `location` - Location updates
- `voip` - Voice over IP
- `remote-notification` - Push notifications ✅ (you're using this)
- `fetch` - Background fetch
- `processing` - Background processing ✅ (you're using this)
- `bluetooth-central` - Bluetooth LE
- `bluetooth-peripheral` - Bluetooth LE accessory

---

## 💡 About dSYM Symbols

**What are they?**
- Debug symbols for crash reporting
- Help symbolicate crash logs

**Do you need them now?**
- No, not required for TestFlight
- You can upload them later through Xcode or App Store Connect if needed

**When to include them?**
- When you have a crash reporting service (like Sentry, Firebase Crashlytics)
- For final App Store submission (recommended but optional)

---

## ✅ Next Steps

1. Close and reopen Xcode (to ensure changes are loaded)
2. Archive again following "Option A" above
3. When uploading, **uncheck symbol upload**
4. Upload should succeed! 🎉

If you still get errors, use EAS Build (Option B) - it's much simpler for React Native/Expo apps.

---

## 🆘 Still Having Issues?

If you see other errors:
1. Make sure you're signed into your Apple Developer account in Xcode
2. Check that your Bundle ID is registered at developer.apple.com
3. Try EAS Build - it handles everything automatically

Good luck! 🚀

