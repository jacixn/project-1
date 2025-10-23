#!/bin/bash

# Biblely TestFlight Deployment Script
# This script helps you deploy your app to TestFlight using EAS Build

set -e  # Exit on error

echo "🚀 Biblely TestFlight Deployment"
echo "================================"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed."
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
    echo "✅ EAS CLI installed successfully!"
    echo ""
fi

# Check if logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "📝 Please log in to your Expo account:"
    eas login
else
    echo "✅ Already logged in as: $(eas whoami)"
fi
echo ""

# Show current version
echo "📋 Current app version:"
CURRENT_VERSION=$(grep -A1 '"version":' app.json | grep -o '"[0-9.]*"' | tr -d '"' | head -1)
echo "   Version: $CURRENT_VERSION"
echo ""

# Ask user what to do
echo "What would you like to do?"
echo "1) Build only (no submit)"
echo "2) Build and submit to TestFlight"
echo "3) Check build status"
echo "4) Open Xcode workspace"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏗️  Building for iOS (production)..."
        echo "This will take 10-20 minutes. You can close this terminal."
        eas build --platform ios --profile production
        echo ""
        echo "✅ Build submitted! Check status at: https://expo.dev"
        ;;
    2)
        echo ""
        echo "🏗️  Building and submitting to TestFlight..."
        echo "This will take 10-20 minutes. You can close this terminal."
        eas build --platform ios --profile production --auto-submit
        echo ""
        echo "✅ Build and submit requested!"
        echo "📱 After processing, check TestFlight in App Store Connect:"
        echo "   https://appstoreconnect.apple.com"
        ;;
    3)
        echo ""
        echo "📊 Checking build status..."
        eas build:list --platform ios
        ;;
    4)
        echo ""
        echo "🔨 Opening Xcode workspace..."
        if [ ! -d "ios/Biblely.xcworkspace" ]; then
            echo "⚠️  Workspace not found. Running prebuild..."
            npx expo prebuild --platform ios --clean
            cd ios && pod install && cd ..
        fi
        open ios/Biblely.xcworkspace
        echo "✅ Xcode opened!"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "📚 For more detailed instructions, see TESTFLIGHT_DEPLOYMENT.md"
echo ""


