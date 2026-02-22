export const retroWallpaper = require('./wallpaper1.jpg');

export const retroTheme = {
  name: 'Retro',
  id: 'retro',

  light: {
    background: '#EBF4FF',
    surface: 'rgba(230, 240, 255, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1A1A3A',
    textSecondary: '#2E2E5A',
    textTertiary: '#4A4A78',

    primary: '#0047AB',
    primaryLight: '#3B7DD8',
    primaryDark: '#003580',

    success: '#2E8B57',
    warning: '#E8A735',
    error: '#D94040',
    info: '#0047AB',

    border: 'rgba(0, 71, 171, 0.2)',
    separator: 'rgba(230, 240, 255, 0.3)',
    overlay: 'rgba(0, 71, 171, 0.4)',

    prayerBackground: 'rgba(235, 244, 255, 0.8)',
    bibleBackground: 'rgba(230, 240, 255, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(230, 240, 255, 0.6)',
    tabActive: '#0047AB',
    tabInactive: '#003580',

    shadowColor: '#0047AB',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#D6E8FF', '#0047AB', '#003580'],
    headerGradient: ['#EBF4FF', '#D6E8FF'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(230, 240, 255, 0.15)',
      borderColor: 'rgba(0, 71, 171, 0.3)',
      borderWidth: 1,
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 71, 171, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(0, 71, 171, 0.2)',
      borderColor: 'rgba(0, 71, 171, 0.4)',
      borderWidth: 1,
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#0047AB',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#D6E8FF', '#0047AB', '#D6E8FF'],
      pulse: '#0047AB',
      ripple: 'rgba(0, 71, 171, 0.3)',
    }
  },

  dark: {
    background: '#08102A',
    surface: 'rgba(12, 20, 50, 0.85)',
    card: 'rgba(18, 30, 65, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#3070D0',
    primaryLight: '#5A95E8',
    primaryDark: '#1A50A8',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3070D0',

    border: 'rgba(48, 112, 208, 0.3)',
    separator: 'rgba(12, 20, 50, 0.4)',
    overlay: 'rgba(8, 16, 42, 0.8)',

    prayerBackground: 'rgba(12, 20, 50, 0.9)',
    bibleBackground: 'rgba(18, 30, 65, 0.9)',
    verseBackground: 'rgba(25, 40, 80, 0.2)',

    tabBackground: 'rgba(12, 20, 50, 0.7)',
    tabActive: '#3070D0',
    tabInactive: '#1A50A8',

    shadowColor: '#3070D0',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0C1432', '#3070D0', '#5A95E8'],
    headerGradient: ['#08102A', '#0C1432'],

    glass: {
      backgroundColor: 'rgba(18, 30, 65, 0.12)',
      borderColor: 'rgba(48, 112, 208, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#3070D0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(12, 20, 50, 0.18)',
      borderColor: 'rgba(48, 112, 208, 0.35)',
      borderWidth: 1,
      shadowColor: '#3070D0',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(18, 30, 65, 0.1)',
      borderColor: 'rgba(48, 112, 208, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#3070D0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(48, 112, 208, 0.25)',
      borderColor: 'rgba(48, 112, 208, 0.45)',
      borderWidth: 1,
      shadowColor: '#3070D0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#3070D0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0C1432', '#3070D0', '#0C1432'],
      pulse: '#3070D0',
      ripple: 'rgba(48, 112, 208, 0.4)',
    }
  }
};
