export const sprintWallpaper = require('./wallpaper1.jpg');

export const sprintTheme = {
  name: 'Sprint',
  id: 'sprint',

  light: {
    background: '#E6EEF8',
    surface: 'rgba(195, 215, 240, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#0D1F3C',
    textSecondary: '#1A3560',
    textTertiary: '#3D5A8A',

    primary: '#1A56B0',
    primaryLight: '#6A9EE0',
    primaryDark: '#0F3D80',

    success: '#1A56B0',
    warning: '#E8963A',
    error: '#EF4444',
    info: '#1A56B0',

    border: 'rgba(26, 86, 176, 0.2)',
    separator: 'rgba(195, 215, 240, 0.3)',
    overlay: 'rgba(26, 86, 176, 0.4)',

    prayerBackground: 'rgba(230, 238, 248, 0.8)',
    bibleBackground: 'rgba(195, 215, 240, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(195, 215, 240, 0.6)',
    tabActive: '#1A56B0',
    tabInactive: '#0F3D80',

    shadowColor: '#1A56B0',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#6A9EE0', '#1A56B0', '#0F3D80'],
    headerGradient: ['#E6EEF8', '#CDD8EC'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#1A56B0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    modalGlass: {
      backgroundColor: 'rgba(195, 215, 240, 0.15)',
      borderColor: 'rgba(26, 86, 176, 0.3)',
      borderWidth: 1,
      shadowColor: '#1A56B0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(26, 86, 176, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#1A56B0',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    buttonGlass: {
      backgroundColor: 'rgba(26, 86, 176, 0.2)',
      borderColor: 'rgba(26, 86, 176, 0.4)',
      borderWidth: 1,
      shadowColor: '#1A56B0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    glow: {
      shadowColor: '#1A56B0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    animation: {
      shimmer: ['#CDD8EC', '#1A56B0', '#CDD8EC'],
      pulse: '#1A56B0',
      ripple: 'rgba(26, 86, 176, 0.3)',
    }
  },

  dark: {
    background: '#030610',
    surface: 'rgba(8, 14, 30, 0.8)',
    card: 'rgba(12, 22, 48, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#E0E8F4',
    textTertiary: '#A0B8D8',

    primary: '#2D6AC4',
    primaryLight: '#6A9EE0',
    primaryDark: '#1A4E9A',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#2D6AC4',

    border: 'rgba(45, 106, 196, 0.3)',
    separator: 'rgba(8, 14, 30, 0.4)',
    overlay: 'rgba(3, 6, 16, 0.8)',

    prayerBackground: 'rgba(8, 14, 30, 0.9)',
    bibleBackground: 'rgba(12, 22, 48, 0.9)',
    verseBackground: 'rgba(18, 32, 65, 0.2)',

    tabBackground: 'rgba(8, 14, 30, 0.7)',
    tabActive: '#2D6AC4',
    tabInactive: '#1A4E9A',

    shadowColor: '#2D6AC4',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#080E1E', '#2D6AC4', '#6A9EE0'],
    headerGradient: ['#030610', '#080E1E'],

    glass: {
      backgroundColor: 'rgba(12, 22, 48, 0.12)',
      borderColor: 'rgba(45, 106, 196, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#2D6AC4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },
    modalGlass: {
      backgroundColor: 'rgba(8, 14, 30, 0.18)',
      borderColor: 'rgba(45, 106, 196, 0.35)',
      borderWidth: 1,
      shadowColor: '#2D6AC4',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },
    cardGlass: {
      backgroundColor: 'rgba(12, 22, 48, 0.1)',
      borderColor: 'rgba(45, 106, 196, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#2D6AC4',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonGlass: {
      backgroundColor: 'rgba(45, 106, 196, 0.25)',
      borderColor: 'rgba(45, 106, 196, 0.45)',
      borderWidth: 1,
      shadowColor: '#2D6AC4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },
    glow: {
      shadowColor: '#2D6AC4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    animation: {
      shimmer: ['#080E1E', '#2D6AC4', '#080E1E'],
      pulse: '#2D6AC4',
      ripple: 'rgba(45, 106, 196, 0.4)',
    }
  }
};
