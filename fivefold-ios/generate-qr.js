const QRCode = require('qrcode');
const fs = require('fs');

// Your app's Expo development server URL
const appUrl = 'exp://192.168.1.112:8081';

// Generate QR code
QRCode.toFile('biblely-qr-code.png', appUrl, {
  color: {
    dark: '#000000',  // Black dots
    light: '#FFFFFF'  // White background
  },
  width: 512,
  margin: 2
}, function (err) {
  if (err) throw err;
  console.log('✅ QR code generated successfully!');
  console.log('📱 File saved as: biblely-qr-code.png');
  console.log('🔗 QR code points to:', appUrl);
  console.log('\n📋 Instructions for Twitter/X post:');
  console.log('1. Upload the biblely-qr-code.png image');
  console.log('2. Use this text:');
  console.log('');
  console.log('🙏 Try Biblely - Faith & Focus Daily on Expo Go 👉');
  console.log('Scan the QR code to experience beautiful spiritual companion app');
  console.log('');
  console.log('✨ Features: Prayer reminders, Bible study, interactive maps & more!');
  console.log('#ExpoGo #ReactNative #FaithApp #Biblely');
});
