#!/bin/bash

# 🛠️ iOS Simulator Fix Script
# Run this whenever you have simulator issues

echo "🔧 Fixing iOS Simulator Issues..."
echo ""

echo "1️⃣ Killing Expo/Metro processes..."
pkill -f "expo|metro|react-native" 2>/dev/null
echo "✅ Processes killed"

echo ""
echo "2️⃣ Shutting down simulators..."
xcrun simctl shutdown all 2>/dev/null
echo "✅ Simulators shutdown"

echo ""
echo "3️⃣ Checking for running processes..."
RUNNING=$(ps aux | grep -E "(expo|metro)" | grep -v grep)
if [ -z "$RUNNING" ]; then
    echo "✅ No conflicting processes found"
else
    echo "⚠️  Still running: $RUNNING"
fi

echo ""
echo "4️⃣ Starting Expo with cleared cache..."
echo "Press 'i' when Expo starts to open iOS simulator"
echo ""

# Start Expo with cleared cache
npx expo start --clear
