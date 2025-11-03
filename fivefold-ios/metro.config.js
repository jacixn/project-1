// Load polyfill for URL.canParse
require('./metro-patch');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
