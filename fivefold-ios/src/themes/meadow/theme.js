export const meadowWallpaper = require('./wallpaper1.jpg');

export const meadowTheme = {
  name: 'Meadow',
  id: 'meadow',

  light: {
    background: '#F2F8EC',
    surface: 'rgba(240, 248, 232, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#2D4420',
    textSecondary: '#3E5C2E',
    textTertiary: '#5A7A48',

    primary: '#7CB342',
    primaryLight: '#AED581',
    primaryDark: '#558B2F',

    success: '#43A047',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#7CB342',

    border: 'rgba(124, 179, 66, 0.2)',
    separator: 'rgba(240, 248, 232, 0.3)',
    overlay: 'rgba(124, 179, 66, 0.4)',

    prayerBackground: 'rgba(242, 248, 236, 0.8)',
    bibleBackground: 'rgba(240, 248, 232, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(240, 248, 232, 0.6)',
    tabActive: '#7CB342',
    tabInactive: '#558B2F',

    shadowColor: '#7CB342',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#E8F5D8', '#7CB342', '#558B2F'],
    headerGradient: ['#F2F8EC', '#E8F5D8'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(240, 248, 232, 0.15)',
      borderColor: 'rgba(124, 179, 66, 0.3)',
      borderWidth: 1,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(124, 179, 66, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(124, 179, 66, 0.2)',
      borderColor: 'rgba(124, 179, 66, 0.4)',
      borderWidth: 1,
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#7CB342',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#E8F5D8', '#7CB342', '#E8F5D8'],
      pulse: '#7CB342',
      ripple: 'rgba(124, 179, 66, 0.3)',
    }
  },

  dark: {
    background: '#101A0C',
    surface: 'rgba(22, 38, 16, 0.85)',
    card: 'rgba(30, 52, 22, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#8BC34A',
    primaryLight: '#AED581',
    primaryDark: '#689F38',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#8BC34A',

    border: 'rgba(139, 195, 74, 0.3)',
    separator: 'rgba(22, 38, 16, 0.4)',
    overlay: 'rgba(16, 26, 12, 0.8)',

    prayerBackground: 'rgba(22, 38, 16, 0.9)',
    bibleBackground: 'rgba(30, 52, 22, 0.9)',
    verseBackground: 'rgba(40, 68, 28, 0.2)',

    tabBackground: 'rgba(22, 38, 16, 0.7)',
    tabActive: '#8BC34A',
    tabInactive: '#689F38',

    shadowColor: '#8BC34A',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#163410', '#8BC34A', '#AED581'],
    headerGradient: ['#101A0C', '#163410'],

    glass: {
      backgroundColor: 'rgba(30, 52, 22, 0.12)',
      borderColor: 'rgba(139, 195, 74, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#8BC34A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(22, 38, 16, 0.18)',
      borderColor: 'rgba(139, 195, 74, 0.35)',
      borderWidth: 1,
      shadowColor: '#8BC34A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(30, 52, 22, 0.1)',
      borderColor: 'rgba(139, 195, 74, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#8BC34A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(139, 195, 74, 0.25)',
      borderColor: 'rgba(139, 195, 74, 0.45)',
      borderWidth: 1,
      shadowColor: '#8BC34A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#8BC34A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#163410', '#8BC34A', '#163410'],
      pulse: '#8BC34A',
      ripple: 'rgba(139, 195, 74, 0.4)',
    }
  }
};
