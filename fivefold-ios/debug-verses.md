# Daily Verse Debug Guide

## How to Test Verse Rotation

The verse of the day now changes every 24 hours based on the current date. Here's how to verify it's working:

### Manual Testing Steps:

1. **Check Today's Verse**: Open the app and note the current verse in the Bible section
2. **Change Device Date**: 
   - Go to Settings > General > Date & Time
   - Turn off "Set Automatically" 
   - Change the date to tomorrow
   - Return to the app
3. **Verify Change**: The verse should be different
4. **Reset Date**: Go back to Settings and turn "Set Automatically" back on

### Expected Behavior:

- ✅ Verse changes every day at midnight (00:00)
- ✅ Same verse shows all day (00:00 to 23:59)
- ✅ Different verse each day
- ✅ Consistent verse for the same date (won't randomly change)

### Verse Pool:

The app now has **31 different verses** that rotate daily, including:
- Jeremiah 29:11 (original)
- Proverbs 3:5-6
- Romans 8:28
- Philippians 4:13
- Joshua 1:9
- And 26 more inspiring verses!

### Technical Details:

- Uses date-based hash algorithm for consistent daily selection
- No internet required - all verses stored locally
- Automatically updates when date changes
- Checks for date change every minute while app is open

The verse will no longer be stuck on Jeremiah 29:11 for days! 🎉
