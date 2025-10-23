# Quick Start: Deploy to TestFlight 🚀

## Fastest Way (Recommended)

### Option 1: Use the Deployment Script ⭐

```bash
cd /Users/jz/Desktop/github/project-1/fivefold-ios
./deploy-testflight.sh
```

Choose option 2 to build and submit automatically!

---

### Option 2: Manual EAS Build

```bash
cd /Users/jz/Desktop/github/project-1/fivefold-ios

# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Login
eas login

# Build and submit in one command
eas build --platform ios --profile production --auto-submit
```

**That's it!** Wait 10-20 minutes for the build to complete, then check [App Store Connect](https://appstoreconnect.apple.com) → TestFlight.

---

### Option 3: Use Xcode

```bash
cd /Users/jz/Desktop/github/project-1/fivefold-ios

# Open the Xcode workspace
open ios/Biblely.xcworkspace
```

Then in Xcode:
1. Select "Any iOS Device" as the destination
2. Product → Archive
3. Distribute App → App Store Connect → Upload
4. Wait for processing in App Store Connect

---

## What You Need

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)

2. **Xcode** (if using Option 3)
   - Download from Mac App Store

3. **Your Apple ID** signed into:
   - EAS CLI (for Options 1 & 2)
   - OR Xcode (for Option 3)

---

## After Upload

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "Biblely"
3. Go to "TestFlight" tab
4. Wait 10-30 minutes for processing
5. Add testers (Internal = instant, External = 1-3 days review)

---

## Need Help?

See detailed instructions in **TESTFLIGHT_DEPLOYMENT.md**

## App Information

- **App Name**: Biblely
- **Bundle ID**: com.jesusxoi.biblely
- **Version**: 1.0.0
- **Owner**: jesusxoi


