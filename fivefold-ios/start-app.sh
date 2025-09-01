#!/bin/bash

# 🚀 Always-Working App Starter
# This command fixes common issues and starts your app

echo "🔧 Fixing any issues and starting app..."

# Kill any conflicting processes
pkill -f "expo|metro|react-native" 2>/dev/null

# Shutdown simulators
xcrun simctl shutdown all 2>/dev/null

# Wait a moment
sleep 1

# Navigate to project directory
cd /Users/jz/Desktop/github/project-1/fivefold-ios

# Start with cleared cache and open iOS simulator
npx expo start --clear --ios
