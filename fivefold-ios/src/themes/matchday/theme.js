export const matchdayWallpaper = require('./wallpaper1.jpg');

export const matchdayTheme = {
  name: 'Match Day',
  id: 'matchday',

  light: {
    background: '#E8F0FF',
    surface: 'rgba(200, 218, 255, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#0A1A3A',
    textSecondary: '#1A3060',
    textTertiary: '#3A5590',

    primary: '#0055DD',
    primaryLight: '#5599FF',
    primaryDark: '#003DA8',

    success: '#0055DD',
    warning: '#E8963A',
    error: '#EF4444',
    info: '#0055DD',

    border: 'rgba(0, 85, 221, 0.2)',
    separator: 'rgba(200, 218, 255, 0.3)',
    overlay: 'rgba(0, 85, 221, 0.4)',

    prayerBackground: 'rgba(232, 240, 255, 0.8)',
    bibleBackground: 'rgba(200, 218, 255, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(200, 218, 255, 0.6)',
    tabActive: '#0055DD',
    tabInactive: '#003DA8',

    shadowColor: '#0055DD',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#5599FF', '#0055DD', '#003DA8'],
    headerGradient: ['#E8F0FF', '#D0DDFF'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#0055DD',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    modalGlass: {
      backgroundColor: 'rgba(200, 218, 255, 0.15)',
      borderColor: 'rgba(0, 85, 221, 0.3)',
      borderWidth: 1,
      shadowColor: '#0055DD',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 85, 221, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#0055DD',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    buttonGlass: {
      backgroundColor: 'rgba(0, 85, 221, 0.2)',
      borderColor: 'rgba(0, 85, 221, 0.4)',
      borderWidth: 1,
      shadowColor: '#0055DD',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    glow: {
      shadowColor: '#0055DD',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    animation: {
      shimmer: ['#D0DDFF', '#0055DD', '#D0DDFF'],
      pulse: '#0055DD',
      ripple: 'rgba(0, 85, 221, 0.3)',
    }
  },

  dark: {
    background: '#020510',
    surface: 'rgba(5, 12, 30, 0.8)',
    card: 'rgba(10, 20, 50, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#E0EAFF',
    textTertiary: '#A0B8E0',

    primary: '#1A6AEE',
    primaryLight: '#5599FF',
    primaryDark: '#0050BB',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#1A6AEE',

    border: 'rgba(26, 106, 238, 0.3)',
    separator: 'rgba(5, 12, 30, 0.4)',
    overlay: 'rgba(2, 5, 16, 0.8)',

    prayerBackground: 'rgba(5, 12, 30, 0.9)',
    bibleBackground: 'rgba(10, 20, 50, 0.9)',
    verseBackground: 'rgba(15, 30, 65, 0.2)',

    tabBackground: 'rgba(5, 12, 30, 0.7)',
    tabActive: '#1A6AEE',
    tabInactive: '#0050BB',

    shadowColor: '#1A6AEE',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#050C1E', '#1A6AEE', '#5599FF'],
    headerGradient: ['#020510', '#050C1E'],

    glass: {
      backgroundColor: 'rgba(10, 20, 50, 0.12)',
      borderColor: 'rgba(26, 106, 238, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#1A6AEE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },
    modalGlass: {
      backgroundColor: 'rgba(5, 12, 30, 0.18)',
      borderColor: 'rgba(26, 106, 238, 0.35)',
      borderWidth: 1,
      shadowColor: '#1A6AEE',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },
    cardGlass: {
      backgroundColor: 'rgba(10, 20, 50, 0.1)',
      borderColor: 'rgba(26, 106, 238, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#1A6AEE',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonGlass: {
      backgroundColor: 'rgba(26, 106, 238, 0.25)',
      borderColor: 'rgba(26, 106, 238, 0.45)',
      borderWidth: 1,
      shadowColor: '#1A6AEE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },
    glow: {
      shadowColor: '#1A6AEE',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    animation: {
      shimmer: ['#050C1E', '#1A6AEE', '#050C1E'],
      pulse: '#1A6AEE',
      ripple: 'rgba(26, 106, 238, 0.4)',
    }
  }
};
