# Exercise Database Setup - GitHub Upload Instructions

## What We've Built

The app now has a smart exercise system:
- **138 default exercises** loaded from GitHub (keeps app lightweight)
- **Custom exercises** stored locally on each user's device
- Users can add their own exercises with name, body part, category, and equipment
- Both default and custom exercises appear together in all exercise lists

## Setup Steps

### Step 1: Upload exercises.json to GitHub

You have a file at: `fivefold-ios/exercises.json`

1. Go to your GitHub repository: https://github.com/jacixn/fivefold-exercises
2. Click "Add file" → "Upload files"
3. Drag and drop `exercises.json` or click to browse
4. Commit message: "added 138 comprehensive exercises with smith machine variations"
5. Click "Commit changes"

### Step 2: Verify the URL

The app will automatically fetch exercises from:
```
https://raw.githubusercontent.com/jacixn/fivefold-exercises/main/exercises.json
```

Make sure the file is accessible at this URL.

### Step 3: Clear Cache in App

On first launch after this update:
1. Open the app
2. Go to Gym tab
3. Tap "Exercises" card
4. Tap the three dots (•••) in top right
5. Tap "Clear Cache & Refresh"

This will fetch the new comprehensive exercise list from GitHub.

## Features for Users

### In the Exercises Modal (Three Dots Menu):

1. **Add Custom Exercise**
   - Tap to open form
   - Enter exercise name (e.g., "Cable Chest Fly")
   - Select body part (Arms, Back, Chest, Core, Full Body, Legs, Shoulders)
   - Select category (Strength, Cardio, Bodyweight, Olympic, Plyometric)
   - Select equipment (Barbell, Dumbbell, Cable, Machine, Smith Machine, Body Weight, etc.)
   - Tap "Add" to save

2. **My Custom Exercises**
   - View all custom exercises you've created
   - Custom exercises have a star icon ⭐
   - Tap delete icon to remove custom exercises
   - Custom exercises appear alongside default exercises in all lists

3. **Clear Cache & Refresh**
   - Re-downloads the latest default exercises from GitHub
   - Keeps your custom exercises intact
   - Useful if we update the default exercise list

## Benefits

- **Lightweight App**: No hardcoded exercise data, app size stays small
- **Always Updated**: Update default exercises on GitHub without releasing new app version
- **User Customization**: Users can add gym-specific or custom exercises
- **Privacy**: Custom exercises stay on user's device, not shared
- **Offline Support**: Exercises cached for 30 days, works without internet

## Technical Details

- Default exercises: Fetched from GitHub, cached for 30 days
- Custom exercises: Stored in AsyncStorage with key `@custom_exercises`
- Cache version: `4` (auto-updates when structure changes)
- Both exercise lists merge seamlessly in the UI
- Custom exercises have `isCustom: true` flag












