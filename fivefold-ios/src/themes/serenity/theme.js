export const serenityWallpaper = require('./wallpaper1.jpg');

export const serenityTheme = {
  name: 'Serenity',
  id: 'serenity',

  light: {
    background: '#EDF5FF',
    surface: 'rgba(218, 235, 255, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1B3A5C',
    textSecondary: '#2C5A8A',
    textTertiary: '#4A80B5',

    primary: '#5B9BD5',
    primaryLight: '#A8CEF0',
    primaryDark: '#3A7ABD',

    success: '#5B9BD5',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#5B9BD5',

    border: 'rgba(91, 155, 213, 0.2)',
    separator: 'rgba(218, 235, 255, 0.3)',
    overlay: 'rgba(91, 155, 213, 0.4)',

    prayerBackground: 'rgba(237, 245, 255, 0.8)',
    bibleBackground: 'rgba(218, 235, 255, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(218, 235, 255, 0.6)',
    tabActive: '#5B9BD5',
    tabInactive: '#3A7ABD',

    shadowColor: '#5B9BD5',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#D4ECFF', '#5B9BD5', '#3A7ABD'],
    headerGradient: ['#EDF5FF', '#DAEAFC'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#5B9BD5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(218, 235, 255, 0.15)',
      borderColor: 'rgba(91, 155, 213, 0.3)',
      borderWidth: 1,
      shadowColor: '#5B9BD5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(91, 155, 213, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#5B9BD5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(91, 155, 213, 0.2)',
      borderColor: 'rgba(91, 155, 213, 0.4)',
      borderWidth: 1,
      shadowColor: '#5B9BD5',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#5B9BD5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#DAEAFC', '#5B9BD5', '#DAEAFC'],
      pulse: '#5B9BD5',
      ripple: 'rgba(91, 155, 213, 0.3)',
    }
  },

  dark: {
    background: '#0D1B2A',
    surface: 'rgba(18, 35, 55, 0.8)',
    card: 'rgba(25, 48, 72, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#6BB3E0',
    primaryLight: '#A8CEF0',
    primaryDark: '#5B9BD5',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6BB3E0',

    border: 'rgba(107, 179, 224, 0.3)',
    separator: 'rgba(18, 35, 55, 0.4)',
    overlay: 'rgba(13, 27, 42, 0.8)',

    prayerBackground: 'rgba(18, 35, 55, 0.9)',
    bibleBackground: 'rgba(25, 48, 72, 0.9)',
    verseBackground: 'rgba(35, 60, 90, 0.2)',

    tabBackground: 'rgba(18, 35, 55, 0.7)',
    tabActive: '#6BB3E0',
    tabInactive: '#5B9BD5',

    shadowColor: '#6BB3E0',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#122337', '#6BB3E0', '#A8CEF0'],
    headerGradient: ['#0D1B2A', '#122337'],

    glass: {
      backgroundColor: 'rgba(25, 48, 72, 0.12)',
      borderColor: 'rgba(107, 179, 224, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#6BB3E0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(18, 35, 55, 0.18)',
      borderColor: 'rgba(107, 179, 224, 0.35)',
      borderWidth: 1,
      shadowColor: '#6BB3E0',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(25, 48, 72, 0.1)',
      borderColor: 'rgba(107, 179, 224, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#6BB3E0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(107, 179, 224, 0.25)',
      borderColor: 'rgba(107, 179, 224, 0.45)',
      borderWidth: 1,
      shadowColor: '#6BB3E0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#6BB3E0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#122337', '#6BB3E0', '#122337'],
      pulse: '#6BB3E0',
      ripple: 'rgba(107, 179, 224, 0.4)',
    }
  }
};
