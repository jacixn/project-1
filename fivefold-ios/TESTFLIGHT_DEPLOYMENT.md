# TestFlight Deployment Guide for Biblely

This guide covers deploying your Biblely app to TestFlight. You have two options:

## Option 1: Using EAS Build (Recommended for Expo Apps) ⭐

EAS Build handles all the complexity automatically and is the recommended approach for Expo apps.

### Prerequisites
1. Apple Developer Account (paid, $99/year)
2. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

### Steps

1. **Login to EAS**
   ```bash
   cd /Users/jz/Desktop/github/project-1/fivefold-ios
   eas login
   ```

2. **Configure the build**
   ```bash
   eas build:configure
   ```

3. **Build for iOS (Production)**
   ```bash
   eas build --platform ios --profile production
   ```
   
   During the build:
   - EAS will ask if you want to create credentials
   - Choose "Yes" to let EAS handle certificates and provisioning profiles
   - This will build and upload to App Store Connect automatically

4. **Submit to TestFlight**
   ```bash
   eas submit --platform ios --latest
   ```
   
   Or build and submit in one command:
   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

5. **Wait for Processing**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to your app → TestFlight
   - Wait for Apple to process your build (usually 10-30 minutes)
   - Add internal testers and distribute

---

## Option 2: Using Xcode Directly

If you prefer to use Xcode directly, follow these steps:

### Prerequisites
1. Apple Developer Account (paid, $99/year)
2. Xcode installed (latest version recommended)
3. Your Mac must be signed into your Apple ID in Xcode

### Step 1: Prebuild the App
Since this is an Expo app, you need to ensure the native code is generated:

```bash
cd /Users/jz/Desktop/github/project-1/fivefold-ios
npx expo prebuild --platform ios --clean
```

### Step 2: Install Dependencies
```bash
cd ios
pod install
cd ..
```

### Step 3: Open in Xcode

Open the workspace (NOT the .xcodeproj):
```bash
open ios/Biblely.xcworkspace
```

### Step 4: Configure Signing & Capabilities

1. **Select the Project**
   - In Xcode's left sidebar, click on "Biblely" (blue icon at the top)
   
2. **Select the Target**
   - Under "TARGETS", click "Biblely"
   
3. **Go to Signing & Capabilities Tab**
   - Select "Automatically manage signing" checkbox
   - Choose your Team (your Apple Developer account)
   - Verify Bundle Identifier: `com.jesusxoi.biblely`
   
4. **Select Release Scheme**
   - At the top of Xcode, click the scheme dropdown (next to play/stop buttons)
   - Choose "Any iOS Device (arm64)" as the destination

### Step 5: Archive the App

1. **Product Menu → Archive**
   - Wait for the archive process to complete (can take 5-15 minutes)
   
2. **Organizer Window Opens Automatically**
   - If it doesn't, go to Window → Organizer
   - Select the "Archives" tab

### Step 6: Distribute to App Store Connect

1. **Click "Distribute App"**
   
2. **Select "App Store Connect"**
   - Click Next
   
3. **Select "Upload"**
   - Click Next
   
4. **Distribution Options**
   - Keep default options (include bitcode if available, upload symbols)
   - Click Next
   
5. **Automatic Signing**
   - Select "Automatically manage signing"
   - Click Next
   
6. **Review and Upload**
   - Review the app information
   - Click "Upload"
   - Wait for the upload to complete

### Step 7: TestFlight Setup in App Store Connect

1. **Go to App Store Connect**
   - Visit [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Sign in with your Apple Developer account

2. **Navigate to Your App**
   - Click "My Apps"
   - If this is your first build, you may need to create a new app:
     - Click the "+" button → "New App"
     - Platform: iOS
     - Name: Biblely
     - Primary Language: English
     - Bundle ID: com.jesusxoi.biblely
     - SKU: com.jesusxoi.biblely (can be anything unique)
     - User Access: Full Access

3. **Wait for Processing**
   - Go to TestFlight tab
   - Your build will appear with "Processing" status
   - This usually takes 10-30 minutes
   - You'll receive an email when it's ready

4. **Add Test Information**
   - Once processing is complete, click on your build
   - Add "What to Test" notes for your testers
   - Submit for Beta App Review (required for external testing)

5. **Add Testers**
   - Internal Testing: Up to 100 testers (no review needed)
     - Click "Internal Testing"
     - Add internal testers by email
   - External Testing: Unlimited testers (requires Beta App Review)
     - Click "External Testing"
     - Create a test group
     - Add external testers

---

## Troubleshooting

### "No accounts with App Store Connect access"
- Sign in to Xcode with your Apple ID: Xcode → Settings → Accounts
- Make sure your account has App Store Connect access

### "Failed to register bundle identifier"
- The bundle ID might already be registered
- Go to [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles → Identifiers
- Check if `com.jesusxoi.biblely` exists

### "Provisioning profile doesn't include signing certificate"
- Go to Xcode → Settings → Accounts
- Select your Apple ID → Manage Certificates
- Click "+" and create an "Apple Distribution" certificate

### Build fails with "Pod" errors
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

---

## Important Notes

### Before Each Build

1. **Update Version Numbers** (in `app.json`):
   ```json
   "version": "1.0.1",  // App version (user-facing)
   ```
   
   And update build number in `Info.plist`:
   ```xml
   <key>CFBundleVersion</key>
   <string>2</string>  // Build number (must increment)
   ```
   
   Or let EAS handle this automatically by adding to `eas.json`:
   ```json
   "build": {
     "production": {
       "autoIncrement": true
     }
   }
   ```

2. **Test on Device First**
   ```bash
   npm run ios
   ```

### App Store Connect Review Times
- TestFlight Beta App Review: 1-3 days (for external testing)
- Internal testing: No review needed, instant
- Full App Store review: 1-2 days (when you're ready for public release)

---

## Quick Reference Commands

### EAS Build (Recommended)
```bash
# Build and submit to TestFlight in one command
eas build --platform ios --profile production --auto-submit

# Check build status
eas build:list
```

### Xcode Direct
```bash
# Prebuild and open
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
open ios/Biblely.xcworkspace
```

---

## Next Steps After TestFlight

Once your TestFlight build is approved and tested:

1. Add App Store metadata (screenshots, description, keywords)
2. Submit for App Store review
3. Release to the App Store

---

## Support

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- TestFlight Docs: https://developer.apple.com/testflight/
- App Store Connect: https://appstoreconnect.apple.com


