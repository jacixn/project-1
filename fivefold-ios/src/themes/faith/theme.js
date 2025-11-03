// ✝️ Faith Theme - Heavenly Sky & Divine Light
export const faithTheme = {
  name: 'Faith',
  id: 'faith',
  
  // Light Mode (Main Look)
  light: {
    // Background colors - Heavenly sky blue
    background: '#E3F2FD', // Very light sky blue
    surface: 'rgba(224, 242, 254, 0.8)', // Light blue surface
    card: 'rgba(255, 255, 255, 0.85)', // White card
    
    // Text colors - Clear and readable
    text: '#1A237E', // Deep blue
    textSecondary: '#283593', // Medium blue
    textTertiary: '#3F51B5', // Light blue
    
    // Brand colors - Sky and divine light
    primary: '#4A90E2', // Beautiful sky blue
    primaryLight: '#5BA3F5', // Lighter sky blue
    primaryDark: '#2979FF', // Vibrant blue
    
    // Status colors
    success: '#7CB342', // Grass green
    warning: '#FFB74D', // Golden orange
    error: '#EF5350', // Soft red
    info: '#4A90E2', // Sky blue
    
    // UI colors - Light and airy
    border: 'rgba(74, 144, 226, 0.2)', // Light blue border
    separator: 'rgba(227, 242, 253, 0.3)', // Sky separator
    overlay: 'rgba(0, 0, 0, 0.4)', // Dark overlay
    
    // Prayer/Bible specific - Heavenly tones
    prayerBackground: 'rgba(227, 242, 253, 0.8)', // Sky prayer
    bibleBackground: 'rgba(255, 248, 225, 0.8)', // Warm light bible
    verseBackground: 'rgba(255, 255, 255, 0.2)', // Glassy white
    
    // Tab colors - Sky tones
    tabBackground: 'rgba(224, 242, 254, 0.6)', // Light transparent tabs
    tabActive: '#4A90E2', // Sky blue active
    tabInactive: '#90CAF9', // Lighter blue inactive
    
    // Shadows - Blue glow
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
    elevation: 6,
    
    // Gradients - Sky to light flows
    gradient: ['#E3F2FD', '#4A90E2', '#2979FF'], // Sky gradient
    headerGradient: ['#E3F2FD', '#BBDEFB'], // Light sky gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(74, 144, 226, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(227, 242, 253, 0.15)',
      borderColor: 'rgba(74, 144, 226, 0.3)',
      borderWidth: 1,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(74, 144, 226, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(74, 144, 226, 0.2)',
      borderColor: 'rgba(74, 144, 226, 0.4)',
      borderWidth: 1,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#E3F2FD', '#4A90E2', '#E3F2FD'],
      pulse: '#4A90E2',
      ripple: 'rgba(74, 144, 226, 0.3)',
    }
  },

  // Dark Mode (Alternative Look)
  dark: {
    // Background colors - Deep blue night
    background: '#0D1B2A', // Deep night blue
    surface: 'rgba(21, 36, 51, 0.8)', // Dark blue surface
    card: 'rgba(30, 45, 61, 0.15)', // Dark glassy card
    
    // Text colors - High contrast
    text: '#FFFFFF', // Pure white
    textSecondary: '#F8FAFC', // Very light
    textTertiary: '#F1F5F9', // Light gray-white
    
    // Brand colors - Bright sky blue
    primary: '#5BA3F5', // Bright sky blue
    primaryLight: '#90CAF9', // Light blue
    primaryDark: '#2979FF', // Vibrant blue
    
    // Status colors
    success: '#8BC34A', // Bright green
    warning: '#FFB74D', // Golden
    error: '#EF5350', // Red
    info: '#5BA3F5', // Sky blue
    
    // UI colors - Dark with blue accents
    border: 'rgba(74, 144, 226, 0.3)', // Blue border
    separator: 'rgba(21, 36, 51, 0.4)', // Dark separator
    overlay: 'rgba(13, 27, 42, 0.9)', // Deep dark overlay
    
    // Prayer/Bible specific - Dark blue tones
    prayerBackground: 'rgba(21, 36, 51, 0.9)', // Dark prayer
    bibleBackground: 'rgba(30, 45, 61, 0.9)', // Darker bible
    verseBackground: 'rgba(40, 55, 71, 0.2)', // Dark glassy verse
    
    // Tab colors - Dark with blue highlights
    tabBackground: 'rgba(21, 36, 51, 0.7)', // Dark transparent tabs
    tabActive: '#5BA3F5', // Sky blue active
    tabInactive: '#2979FF', // Vibrant blue inactive
    
    // Shadows - Blue glow in dark
    shadowColor: '#5BA3F5',
    shadowOpacity: 0.5,
    elevation: 8,
    
    // Gradients - Night to sky flows
    gradient: ['#0D1B2A', '#5BA3F5', '#2979FF'], // Night to sky
    headerGradient: ['#0D1B2A', '#152433'], // Dark gradient
    
    // Glass effect properties - Dark blue glass
    glass: {
      backgroundColor: 'rgba(30, 45, 61, 0.12)',
      borderColor: 'rgba(74, 144, 226, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#5BA3F5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 10,
    },
    
    // Modal glass effect - Dark blue
    modalGlass: {
      backgroundColor: 'rgba(21, 36, 51, 0.18)',
      borderColor: 'rgba(74, 144, 226, 0.35)',
      borderWidth: 1,
      shadowColor: '#5BA3F5',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.6,
      shadowRadius: 25,
      elevation: 12,
    },
    
    // Card glass effect - Subtle dark blue
    cardGlass: {
      backgroundColor: 'rgba(30, 45, 61, 0.1)',
      borderColor: 'rgba(74, 144, 226, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#5BA3F5',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    
    // Button glass effect - Vibrant blue
    buttonGlass: {
      backgroundColor: 'rgba(74, 144, 226, 0.25)',
      borderColor: 'rgba(74, 144, 226, 0.45)',
      borderWidth: 1,
      shadowColor: '#5BA3F5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 7,
    },
    
    // Special effects - Heavenly glow in dark
    glow: {
      shadowColor: '#5BA3F5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Divine light in darkness
    animation: {
      shimmer: ['#0D1B2A', '#5BA3F5', '#0D1B2A'],
      pulse: '#5BA3F5',
      ripple: 'rgba(91, 163, 245, 0.4)',
    }
  }
};

