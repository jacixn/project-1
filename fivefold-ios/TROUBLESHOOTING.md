# 🛠️ iOS Simulator Troubleshooting Guide

## 🚨 Common Issue: "Simulator device failed to open" or Timeout Errors

### Quick Fix (Try this first):
```bash
# 1. Kill all Expo/Metro processes
pkill -f "expo|metro|react-native"

# 2. Clear Expo cache and restart
npx expo start --clear
```

### If that doesn't work, try the Full Reset:

## 🔄 Full Reset Process

### Step 1: Kill All Processes
```bash
# Kill Expo and Metro processes
pkill -f "expo|metro|react-native|node.*expo"

# Check if any are still running
ps aux | grep -E "(expo|metro)" | grep -v grep
```

### Step 2: Reset iOS Simulators
```bash
# Shutdown all simulators
xcrun simctl shutdown all

# Optional: Erase all simulators (nuclear option)
xcrun simctl erase all
```

### Step 3: Clear All Caches
```bash
# Clear Expo cache
npx expo install --fix

# Clear npm cache (if needed)
npm start -- --reset-cache

# Clear Metro cache
npx react-native start --reset-cache
```

### Step 4: Restart Fresh
```bash
# Start with cleared cache
npx expo start --clear

# Then press 'i' to open iOS simulator
```

## 🎯 Quick Commands to Remember

### One-liner fix (most common):
```bash
pkill -f "expo|metro" && npx expo start --clear
```

### Check what's running:
```bash
ps aux | grep -E "(expo|metro)" | grep -v grep
```

### List available simulators:
```bash
xcrun simctl list devices | grep iPhone
```

## 🔍 Other Common Issues

### Port Already in Use:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use different port
npx expo start --port 8082
```

### Simulator Won't Open:
```bash
# Open Simulator app manually first
open -a Simulator

# Then try Expo again
npx expo start --ios
```

### Cache Issues:
```bash
# Clear all possible caches
rm -rf node_modules
npm install
npx expo install --fix
```

## 📱 Pro Tips

1. **Always try the Quick Fix first** - it solves 90% of issues
2. **Keep Simulator app open** - prevents startup delays
3. **Use `--clear` flag** when restarting after errors
4. **Check console logs** - they usually tell you what's wrong
5. **Restart your Mac** if nothing else works (rare but effective)

## 🆘 When All Else Fails

1. Restart your computer
2. Update Xcode from App Store
3. Update Expo CLI: `npm install -g @expo/cli@latest`
4. Check Expo status: https://status.expo.dev/

---

**Save this file and refer to it whenever you have simulator issues!** 🎉
