// 🌸 Blush Bloom Theme - Feminine Pink Paradise
export const blushBloomTheme = {
  name: 'Blush Bloom',
  id: 'blush-bloom',
  
  // Light Mode (Current Beautiful Look)
  light: {
    // Background colors - Soft pink gradients
    background: '#FDF2F8', // Very light pink
    surface: 'rgba(252, 231, 243, 0.7)', // Transparent pink surface
    card: 'rgba(255, 255, 255, 0.15)', // Glassy transparent white
    
    // Text colors - Elegant contrast
    text: '#831843', // Deep rose
    textSecondary: '#BE185D', // Medium rose
    textTertiary: '#EC4899', // Light rose
    
    // Brand colors - Pink spectrum
    primary: '#F472B6', // Hot pink
    primaryLight: '#FBCFE8', // Very light pink
    primaryDark: '#BE185D', // Dark pink
    
    // Status colors - Pink-tinted
    success: '#F472B6', // Pink success
    warning: '#FBBF24', // Golden warning
    error: '#F87171', // Soft red
    info: '#F472B6', // Pink info
    
    // UI colors - Glassy and transparent
    border: 'rgba(236, 72, 153, 0.2)', // Transparent pink border
    separator: 'rgba(252, 231, 243, 0.3)', // Light pink separator
    overlay: 'rgba(236, 72, 153, 0.4)', // Pink overlay
    
    // Prayer/Bible specific - Soft pink tones
    prayerBackground: 'rgba(253, 242, 248, 0.8)', // Transparent light pink
    bibleBackground: 'rgba(252, 231, 243, 0.8)', // Transparent medium pink
    verseBackground: 'rgba(255, 255, 255, 0.2)', // Glassy white
    
    // Tab colors - Glassy pink
    tabBackground: 'rgba(252, 231, 243, 0.6)', // Transparent pink tabs
    tabActive: '#F472B6', // Hot pink active
    tabInactive: '#BE185D', // Dark pink inactive
    
    // Shadows - Pink glow
    shadowColor: '#F472B6',
    shadowOpacity: 0.3,
    elevation: 6,
    
    // Gradients - Beautiful pink flows
    gradient: ['#FECACA', '#F472B6', '#BE185D'], // Light to dark pink
    headerGradient: ['#FDF2F8', '#FCE7F3'], // Subtle pink gradient
    
    // Glass effect properties
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
    
    // Modal glass effect
    modalGlass: {
      backgroundColor: 'rgba(252, 231, 243, 0.15)',
      borderColor: 'rgba(244, 114, 182, 0.3)',
      borderWidth: 1,
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    
    // Card glass effect
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(244, 114, 182, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    
    // Button glass effect
    buttonGlass: {
      backgroundColor: 'rgba(244, 114, 182, 0.2)',
      borderColor: 'rgba(244, 114, 182, 0.4)',
      borderWidth: 1,
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    
    // Special effects
    glow: {
      shadowColor: '#F472B6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    
    // Animation colors
    animation: {
      shimmer: ['#FECACA', '#F472B6', '#FECACA'],
      pulse: '#F472B6',
      ripple: 'rgba(244, 114, 182, 0.3)',
    }
  },

  // Dark Mode (New Professional Dark Pink)
  dark: {
    // Background colors - Deep dark with pink undertones
    background: '#1A0B14', // Deep dark rose
    surface: 'rgba(45, 20, 35, 0.8)', // Dark rose surface
    card: 'rgba(60, 25, 45, 0.15)', // Dark glassy pink
    
    // Text colors - High contrast light colors for readability
    text: '#FFFFFF', // Pure white for maximum readability
    textSecondary: '#F8FAFC', // Very light gray-white
    textTertiary: '#F1F5F9', // Light gray-white
    
    // Brand colors - Bright pink spectrum for dark mode
    primary: '#F472B6', // Hot pink (brighter for dark backgrounds)
    primaryLight: '#FBCFE8', // Very light pink
    primaryDark: '#EC4899', // Vibrant pink
    
    // Status colors - High contrast for dark mode
    success: '#10B981', // Bright green
    warning: '#F59E0B', // Bright amber
    error: '#EF4444', // Bright red
    info: '#F472B6', // Bright pink
    
    // UI colors - Dark glassy pink
    border: 'rgba(236, 72, 153, 0.3)', // Darker pink border
    separator: 'rgba(45, 20, 35, 0.4)', // Dark rose separator
    overlay: 'rgba(26, 11, 20, 0.8)', // Deep dark overlay
    
    // Prayer/Bible specific - Dark pink tones
    prayerBackground: 'rgba(45, 20, 35, 0.9)', // Dark rose prayer
    bibleBackground: 'rgba(60, 25, 45, 0.9)', // Darker rose bible
    verseBackground: 'rgba(80, 30, 60, 0.2)', // Dark glassy verse
    
    // Tab colors - Dark glassy pink
    tabBackground: 'rgba(45, 20, 35, 0.7)', // Dark transparent tabs
    tabActive: '#EC4899', // Vibrant pink active
    tabInactive: '#BE185D', // Deep pink inactive
    
    // Shadows - Pink glow in dark
    shadowColor: '#EC4899',
    shadowOpacity: 0.4,
    elevation: 8,
    
    // Gradients - Dark pink flows
    gradient: ['#2D1420', '#EC4899', '#F472B6'], // Dark to bright pink
    headerGradient: ['#1A0B14', '#2D1420'], // Dark rose gradient
    
    // Glass effect properties - Dark pink glass
    glass: {
      backgroundColor: 'rgba(60, 25, 45, 0.12)',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },
    
    // Modal glass effect - Dark rose
    modalGlass: {
      backgroundColor: 'rgba(45, 20, 35, 0.18)',
      borderColor: 'rgba(236, 72, 153, 0.35)',
      borderWidth: 1,
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },
    
    // Card glass effect - Subtle dark pink
    cardGlass: {
      backgroundColor: 'rgba(60, 25, 45, 0.1)',
      borderColor: 'rgba(236, 72, 153, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    
    // Button glass effect - Vibrant dark pink
    buttonGlass: {
      backgroundColor: 'rgba(236, 72, 153, 0.25)',
      borderColor: 'rgba(236, 72, 153, 0.45)',
      borderWidth: 1,
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },
    
    // Special effects - Pink energy in dark
    glow: {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Dark pink energy
    animation: {
      shimmer: ['#2D1420', '#EC4899', '#2D1420'],
      pulse: '#EC4899',
      ripple: 'rgba(236, 72, 153, 0.4)',
    }
  }
};



