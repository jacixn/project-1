export const aquariumWallpaper = require('./wallpaper1.jpg');

export const aquariumTheme = {
  name: 'Aquarium',
  id: 'aquarium',

  light: {
    background: '#E6F8FC',
    surface: 'rgba(220, 245, 252, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#0A2A3C',
    textSecondary: '#1B4A5E',
    textTertiary: '#2E6A80',

    primary: '#0091EA',
    primaryLight: '#40C4FF',
    primaryDark: '#0077C2',

    success: '#2E8B57',
    warning: '#E8A735',
    error: '#D94040',
    info: '#0091EA',

    border: 'rgba(0, 145, 234, 0.2)',
    separator: 'rgba(220, 245, 252, 0.3)',
    overlay: 'rgba(0, 145, 234, 0.4)',

    prayerBackground: 'rgba(230, 248, 252, 0.8)',
    bibleBackground: 'rgba(220, 245, 252, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(220, 245, 252, 0.6)',
    tabActive: '#0091EA',
    tabInactive: '#0077C2',

    shadowColor: '#0091EA',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#B3E5FC', '#0091EA', '#0077C2'],
    headerGradient: ['#E6F8FC', '#B3E5FC'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#0091EA',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(220, 245, 252, 0.15)',
      borderColor: 'rgba(0, 145, 234, 0.3)',
      borderWidth: 1,
      shadowColor: '#0091EA',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 145, 234, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#0091EA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(0, 145, 234, 0.2)',
      borderColor: 'rgba(0, 145, 234, 0.4)',
      borderWidth: 1,
      shadowColor: '#0091EA',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#0091EA',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#B3E5FC', '#0091EA', '#B3E5FC'],
      pulse: '#0091EA',
      ripple: 'rgba(0, 145, 234, 0.3)',
    }
  },

  dark: {
    background: '#071C26',
    surface: 'rgba(10, 32, 44, 0.85)',
    card: 'rgba(16, 48, 64, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#40C4FF',
    primaryLight: '#80D8FF',
    primaryDark: '#0091EA',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#40C4FF',

    border: 'rgba(64, 196, 255, 0.3)',
    separator: 'rgba(10, 32, 44, 0.4)',
    overlay: 'rgba(7, 28, 38, 0.8)',

    prayerBackground: 'rgba(10, 32, 44, 0.9)',
    bibleBackground: 'rgba(16, 48, 64, 0.9)',
    verseBackground: 'rgba(22, 60, 78, 0.2)',

    tabBackground: 'rgba(10, 32, 44, 0.7)',
    tabActive: '#40C4FF',
    tabInactive: '#0091EA',

    shadowColor: '#40C4FF',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0A2030', '#40C4FF', '#80D8FF'],
    headerGradient: ['#071C26', '#0A2030'],

    glass: {
      backgroundColor: 'rgba(16, 48, 64, 0.12)',
      borderColor: 'rgba(64, 196, 255, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#40C4FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(10, 32, 44, 0.18)',
      borderColor: 'rgba(64, 196, 255, 0.35)',
      borderWidth: 1,
      shadowColor: '#40C4FF',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(16, 48, 64, 0.1)',
      borderColor: 'rgba(64, 196, 255, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#40C4FF',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(64, 196, 255, 0.25)',
      borderColor: 'rgba(64, 196, 255, 0.45)',
      borderWidth: 1,
      shadowColor: '#40C4FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#40C4FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0A2030', '#40C4FF', '#0A2030'],
      pulse: '#40C4FF',
      ripple: 'rgba(64, 196, 255, 0.4)',
    }
  }
};
