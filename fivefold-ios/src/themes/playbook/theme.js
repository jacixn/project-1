export const playbookWallpaper = require('./wallpaper1.jpg');

export const playbookTheme = {
  name: 'Playbook',
  id: 'playbook',

  light: {
    background: '#FFFDE8',
    surface: 'rgba(255, 248, 180, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#2A2500',
    textSecondary: '#4A4210',
    textTertiary: '#7A7030',

    primary: '#D4B800',
    primaryLight: '#F0DC50',
    primaryDark: '#A89200',

    success: '#D4B800',
    warning: '#E8963A',
    error: '#EF4444',
    info: '#D4B800',

    border: 'rgba(212, 184, 0, 0.2)',
    separator: 'rgba(255, 248, 180, 0.3)',
    overlay: 'rgba(212, 184, 0, 0.4)',

    prayerBackground: 'rgba(255, 253, 232, 0.8)',
    bibleBackground: 'rgba(255, 248, 180, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(255, 248, 180, 0.6)',
    tabActive: '#B8A000',
    tabInactive: '#8A7800',

    shadowColor: '#D4B800',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#F0DC50', '#D4B800', '#A89200'],
    headerGradient: ['#FFFDE8', '#FFF8CC'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#D4B800',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    modalGlass: {
      backgroundColor: 'rgba(255, 248, 180, 0.15)',
      borderColor: 'rgba(212, 184, 0, 0.3)',
      borderWidth: 1,
      shadowColor: '#D4B800',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(212, 184, 0, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#D4B800',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    buttonGlass: {
      backgroundColor: 'rgba(212, 184, 0, 0.2)',
      borderColor: 'rgba(212, 184, 0, 0.4)',
      borderWidth: 1,
      shadowColor: '#D4B800',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    glow: {
      shadowColor: '#D4B800',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    animation: {
      shimmer: ['#FFF8CC', '#D4B800', '#FFF8CC'],
      pulse: '#D4B800',
      ripple: 'rgba(212, 184, 0, 0.3)',
    }
  },

  dark: {
    background: '#0A0900',
    surface: 'rgba(20, 18, 5, 0.8)',
    card: 'rgba(30, 28, 10, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#FFF8D0',
    textTertiary: '#D0C880',

    primary: '#E8C820',
    primaryLight: '#F0DC50',
    primaryDark: '#B8A000',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#E8C820',

    border: 'rgba(232, 200, 32, 0.3)',
    separator: 'rgba(20, 18, 5, 0.4)',
    overlay: 'rgba(10, 9, 0, 0.8)',

    prayerBackground: 'rgba(20, 18, 5, 0.9)',
    bibleBackground: 'rgba(30, 28, 10, 0.9)',
    verseBackground: 'rgba(40, 38, 15, 0.2)',

    tabBackground: 'rgba(20, 18, 5, 0.7)',
    tabActive: '#E8C820',
    tabInactive: '#B8A000',

    shadowColor: '#E8C820',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#141205', '#E8C820', '#F0DC50'],
    headerGradient: ['#0A0900', '#141205'],

    glass: {
      backgroundColor: 'rgba(30, 28, 10, 0.12)',
      borderColor: 'rgba(232, 200, 32, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#E8C820',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },
    modalGlass: {
      backgroundColor: 'rgba(20, 18, 5, 0.18)',
      borderColor: 'rgba(232, 200, 32, 0.35)',
      borderWidth: 1,
      shadowColor: '#E8C820',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },
    cardGlass: {
      backgroundColor: 'rgba(30, 28, 10, 0.1)',
      borderColor: 'rgba(232, 200, 32, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#E8C820',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonGlass: {
      backgroundColor: 'rgba(232, 200, 32, 0.25)',
      borderColor: 'rgba(232, 200, 32, 0.45)',
      borderWidth: 1,
      shadowColor: '#E8C820',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },
    glow: {
      shadowColor: '#E8C820',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    animation: {
      shimmer: ['#141205', '#E8C820', '#141205'],
      pulse: '#E8C820',
      ripple: 'rgba(232, 200, 32, 0.4)',
    }
  }
};
