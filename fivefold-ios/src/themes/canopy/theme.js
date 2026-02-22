export const canopyWallpaper = require('./wallpaper1.jpg');

export const canopyTheme = {
  name: 'Canopy',
  id: 'canopy',

  light: {
    background: '#F2FAF0',
    surface: 'rgba(238, 248, 235, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1A3A1C',
    textSecondary: '#2D5830',
    textTertiary: '#4A7850',

    primary: '#43A047',
    primaryLight: '#66BB6A',
    primaryDark: '#2E7D32',

    success: '#43A047',
    warning: '#E8A735',
    error: '#D94040',
    info: '#43A047',

    border: 'rgba(67, 160, 71, 0.2)',
    separator: 'rgba(238, 248, 235, 0.3)',
    overlay: 'rgba(67, 160, 71, 0.4)',

    prayerBackground: 'rgba(242, 250, 240, 0.8)',
    bibleBackground: 'rgba(238, 248, 235, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(238, 248, 235, 0.6)',
    tabActive: '#43A047',
    tabInactive: '#2E7D32',

    shadowColor: '#43A047',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#DDF0D8', '#43A047', '#2E7D32'],
    headerGradient: ['#F2FAF0', '#DDF0D8'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#43A047',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(238, 248, 235, 0.15)',
      borderColor: 'rgba(67, 160, 71, 0.3)',
      borderWidth: 1,
      shadowColor: '#43A047',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(67, 160, 71, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#43A047',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(67, 160, 71, 0.2)',
      borderColor: 'rgba(67, 160, 71, 0.4)',
      borderWidth: 1,
      shadowColor: '#43A047',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#43A047',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#DDF0D8', '#43A047', '#DDF0D8'],
      pulse: '#43A047',
      ripple: 'rgba(67, 160, 71, 0.3)',
    }
  },

  dark: {
    background: '#0C1A0C',
    surface: 'rgba(15, 30, 15, 0.85)',
    card: 'rgba(22, 44, 22, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#66BB6A',
    primaryLight: '#81C784',
    primaryDark: '#43A047',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#66BB6A',

    border: 'rgba(102, 187, 106, 0.3)',
    separator: 'rgba(15, 30, 15, 0.4)',
    overlay: 'rgba(12, 26, 12, 0.8)',

    prayerBackground: 'rgba(15, 30, 15, 0.9)',
    bibleBackground: 'rgba(22, 44, 22, 0.9)',
    verseBackground: 'rgba(30, 58, 30, 0.2)',

    tabBackground: 'rgba(15, 30, 15, 0.7)',
    tabActive: '#66BB6A',
    tabInactive: '#43A047',

    shadowColor: '#66BB6A',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0F1E0F', '#66BB6A', '#81C784'],
    headerGradient: ['#0C1A0C', '#0F1E0F'],

    glass: {
      backgroundColor: 'rgba(22, 44, 22, 0.12)',
      borderColor: 'rgba(102, 187, 106, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#66BB6A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(15, 30, 15, 0.18)',
      borderColor: 'rgba(102, 187, 106, 0.35)',
      borderWidth: 1,
      shadowColor: '#66BB6A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(22, 44, 22, 0.1)',
      borderColor: 'rgba(102, 187, 106, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#66BB6A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(102, 187, 106, 0.25)',
      borderColor: 'rgba(102, 187, 106, 0.45)',
      borderWidth: 1,
      shadowColor: '#66BB6A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#66BB6A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0F1E0F', '#66BB6A', '#0F1E0F'],
      pulse: '#66BB6A',
      ripple: 'rgba(102, 187, 106, 0.4)',
    }
  }
};
