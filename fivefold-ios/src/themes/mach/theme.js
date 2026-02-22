export const machWallpaper = require('./wallpaper1.jpg');

export const machTheme = {
  name: 'Mach',
  id: 'mach',

  light: {
    background: '#EFF3FB',
    surface: 'rgba(223, 231, 247, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1A2744',
    textSecondary: '#2B3F6B',
    textTertiary: '#4A6199',

    primary: '#3B5FE0',
    primaryLight: '#A0B4F0',
    primaryDark: '#2A47B8',

    success: '#3B5FE0',
    warning: '#E8963A',
    error: '#EF4444',
    info: '#3B5FE0',

    border: 'rgba(59, 95, 224, 0.2)',
    separator: 'rgba(223, 231, 247, 0.3)',
    overlay: 'rgba(59, 95, 224, 0.4)',

    prayerBackground: 'rgba(239, 243, 251, 0.8)',
    bibleBackground: 'rgba(223, 231, 247, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(223, 231, 247, 0.6)',
    tabActive: '#3B5FE0',
    tabInactive: '#2A47B8',

    shadowColor: '#3B5FE0',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#F0C46A', '#3B5FE0', '#2A47B8'],
    headerGradient: ['#EFF3FB', '#E0E8F8'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#3B5FE0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(223, 231, 247, 0.15)',
      borderColor: 'rgba(59, 95, 224, 0.3)',
      borderWidth: 1,
      shadowColor: '#3B5FE0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(59, 95, 224, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#3B5FE0',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(59, 95, 224, 0.2)',
      borderColor: 'rgba(59, 95, 224, 0.4)',
      borderWidth: 1,
      shadowColor: '#3B5FE0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#3B5FE0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#E0E8F8', '#3B5FE0', '#E0E8F8'],
      pulse: '#3B5FE0',
      ripple: 'rgba(59, 95, 224, 0.3)',
    }
  },

  dark: {
    background: '#050508',
    surface: 'rgba(10, 14, 30, 0.8)',
    card: 'rgba(15, 22, 45, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#4169E1',
    primaryLight: '#7B9AF0',
    primaryDark: '#3050C8',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#4169E1',

    border: 'rgba(65, 105, 225, 0.3)',
    separator: 'rgba(10, 14, 30, 0.4)',
    overlay: 'rgba(5, 5, 8, 0.8)',

    prayerBackground: 'rgba(10, 14, 30, 0.9)',
    bibleBackground: 'rgba(15, 22, 45, 0.9)',
    verseBackground: 'rgba(22, 32, 60, 0.2)',

    tabBackground: 'rgba(10, 14, 30, 0.7)',
    tabActive: '#4169E1',
    tabInactive: '#3050C8',

    shadowColor: '#4169E1',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0A0E1E', '#4169E1', '#D4882A'],
    headerGradient: ['#050508', '#0A0E1E'],

    glass: {
      backgroundColor: 'rgba(15, 22, 45, 0.12)',
      borderColor: 'rgba(65, 105, 225, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#4169E1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(10, 14, 30, 0.18)',
      borderColor: 'rgba(65, 105, 225, 0.35)',
      borderWidth: 1,
      shadowColor: '#4169E1',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(15, 22, 45, 0.1)',
      borderColor: 'rgba(65, 105, 225, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#4169E1',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(65, 105, 225, 0.25)',
      borderColor: 'rgba(65, 105, 225, 0.45)',
      borderWidth: 1,
      shadowColor: '#4169E1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#4169E1',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0A0E1E', '#4169E1', '#0A0E1E'],
      pulse: '#4169E1',
      ripple: 'rgba(65, 105, 225, 0.4)',
    }
  }
};
