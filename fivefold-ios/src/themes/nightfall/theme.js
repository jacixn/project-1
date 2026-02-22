export const nightfallWallpaper = require('./wallpaper1.jpg');

export const nightfallTheme = {
  name: 'Nightfall',
  id: 'nightfall',

  light: {
    background: '#F0EEF5',
    surface: 'rgba(235, 230, 245, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1F1B2E',
    textSecondary: '#3A3452',
    textTertiary: '#5A5478',

    primary: '#C4860E',
    primaryLight: '#DFAA42',
    primaryDark: '#9A6A0A',

    success: '#2E8B57',
    warning: '#E8A735',
    error: '#D94040',
    info: '#C4860E',

    border: 'rgba(196, 134, 14, 0.2)',
    separator: 'rgba(235, 230, 245, 0.3)',
    overlay: 'rgba(196, 134, 14, 0.4)',

    prayerBackground: 'rgba(240, 238, 245, 0.8)',
    bibleBackground: 'rgba(235, 230, 245, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(235, 230, 245, 0.6)',
    tabActive: '#C4860E',
    tabInactive: '#9A6A0A',

    shadowColor: '#C4860E',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#E4DFF0', '#C4860E', '#9A6A0A'],
    headerGradient: ['#F0EEF5', '#E4DFF0'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#C4860E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(235, 230, 245, 0.15)',
      borderColor: 'rgba(196, 134, 14, 0.3)',
      borderWidth: 1,
      shadowColor: '#C4860E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(196, 134, 14, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#C4860E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(196, 134, 14, 0.2)',
      borderColor: 'rgba(196, 134, 14, 0.4)',
      borderWidth: 1,
      shadowColor: '#C4860E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#C4860E',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#E4DFF0', '#C4860E', '#E4DFF0'],
      pulse: '#C4860E',
      ripple: 'rgba(196, 134, 14, 0.3)',
    }
  },

  dark: {
    background: '#08081E',
    surface: 'rgba(15, 15, 40, 0.85)',
    card: 'rgba(22, 22, 55, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#F5A623',
    primaryLight: '#FFCA5E',
    primaryDark: '#C4860E',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#F5A623',

    border: 'rgba(245, 166, 35, 0.3)',
    separator: 'rgba(15, 15, 40, 0.4)',
    overlay: 'rgba(8, 8, 30, 0.8)',

    prayerBackground: 'rgba(15, 15, 40, 0.9)',
    bibleBackground: 'rgba(22, 22, 55, 0.9)',
    verseBackground: 'rgba(30, 30, 70, 0.2)',

    tabBackground: 'rgba(15, 15, 40, 0.7)',
    tabActive: '#F5A623',
    tabInactive: '#C4860E',

    shadowColor: '#F5A623',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0F0F28', '#F5A623', '#FFCA5E'],
    headerGradient: ['#08081E', '#0F0F28'],

    glass: {
      backgroundColor: 'rgba(22, 22, 55, 0.12)',
      borderColor: 'rgba(245, 166, 35, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(15, 15, 40, 0.18)',
      borderColor: 'rgba(245, 166, 35, 0.35)',
      borderWidth: 1,
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(22, 22, 55, 0.1)',
      borderColor: 'rgba(245, 166, 35, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(245, 166, 35, 0.25)',
      borderColor: 'rgba(245, 166, 35, 0.45)',
      borderWidth: 1,
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#F5A623',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0F0F28', '#F5A623', '#0F0F28'],
      pulse: '#F5A623',
      ripple: 'rgba(245, 166, 35, 0.4)',
    }
  }
};
