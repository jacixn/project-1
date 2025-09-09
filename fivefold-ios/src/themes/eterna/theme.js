// ✨ Eterna Theme - Divine Heavenly Light
export const eternaTheme = {
  name: 'Eterna',
  id: 'eterna',
  
  // Light Mode (Current Divine Look)
  light: {
    // Background colors - Heavenly soft blues and purples
    background: '#E8F4FD', // Soft heavenly blue
    surface: 'rgba(230, 240, 255, 0.8)', // Ethereal blue surface
    card: 'rgba(255, 255, 255, 0.25)', // Glassy divine white
    
    // Text colors - Divine and serene
    text: '#2C3E50', // Deep serene blue-gray
    textSecondary: '#5D6D7E', // Medium blue-gray
    textTertiary: '#85929E', // Light blue-gray
    
    // Brand colors - Divine light spectrum
    primary: '#A569BD', // Soft divine purple
    primaryLight: '#D7BDE2', // Light ethereal purple
    primaryDark: '#7D3C98', // Deep divine purple
    
    // Status colors - Heavenly themed
    success: '#58D68D', // Divine green
    warning: '#F7DC6F', // Heavenly gold
    error: '#F1948A', // Soft divine coral
    info: '#85C1E9', // Heavenly blue
    
    // UI colors - Ethereal and divine
    border: 'rgba(165, 105, 189, 0.3)', // Transparent divine purple border
    separator: 'rgba(230, 240, 255, 0.4)', // Ethereal separator
    overlay: 'rgba(44, 62, 80, 0.6)', // Serene dark overlay
    
    // Prayer/Bible specific - Divine tones
    prayerBackground: 'rgba(232, 244, 253, 0.9)', // Heavenly blue prayer
    bibleBackground: 'rgba(230, 240, 255, 0.9)', // Ethereal blue bible
    verseBackground: 'rgba(255, 255, 255, 0.4)', // Glassy divine verse
    
    // Tab colors - Divine elegance
    tabBackground: 'rgba(230, 240, 255, 0.7)', // Transparent ethereal tabs
    tabActive: '#A569BD', // Divine purple active
    tabInactive: '#85929E', // Serene gray inactive
    
    // Shadows - Divine glow
    shadowColor: '#A569BD',
    shadowOpacity: 0.3,
    elevation: 6,
    
    // Gradients - Divine flows
    gradient: ['#E8F4FD', '#A569BD', '#7D3C98'], // Heavenly blue to divine purple
    headerGradient: ['#E8F4FD', '#D7BDE2'], // Subtle ethereal gradient
    
    // Glass effect properties - Divine glass
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(165, 105, 189, 0.3)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#A569BD',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 18,
      elevation: 8,
    },
    
    // Modal glass effect - Heavenly
    modalGlass: {
      backgroundColor: 'rgba(230, 240, 255, 0.25)',
      borderColor: 'rgba(165, 105, 189, 0.4)',
      borderWidth: 1,
      shadowColor: '#A569BD',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 12,
    },
    
    // Card glass effect - Ethereal subtlety
    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(165, 105, 189, 0.25)',
      borderWidth: 0.5,
      shadowColor: '#A569BD',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 6,
    },
    
    // Button glass effect - Divine elegance
    buttonGlass: {
      backgroundColor: 'rgba(165, 105, 189, 0.2)',
      borderColor: 'rgba(165, 105, 189, 0.4)',
      borderWidth: 1,
      shadowColor: '#A569BD',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 7,
    },
    
    // Special effects - Divine radiance
    glow: {
      shadowColor: '#A569BD',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Divine light flows
    animation: {
      shimmer: ['#D7BDE2', '#A569BD', '#D7BDE2'],
      pulse: '#A569BD',
      ripple: 'rgba(165, 105, 189, 0.3)',
    }
  },

  // Dark Mode (New Divine Dark)
  dark: {
    // Background colors - Deep divine darkness with purple undertones
    background: '#1A1625', // Deep divine dark
    surface: 'rgba(35, 30, 45, 0.8)', // Dark divine surface
    card: 'rgba(50, 40, 65, 0.15)', // Dark glassy divine
    
    // Text colors - High contrast divine colors for readability
    text: '#FFFFFF', // Pure white for maximum readability
    textSecondary: '#F1F5F9', // Very light gray-white
    textTertiary: '#E2E8F0', // Light blue-white
    
    // Brand colors - Bright divine spectrum for dark mode
    primary: '#D7BDE2', // Light ethereal purple (brighter for dark backgrounds)
    primaryLight: '#E8D5E8', // Very light divine purple
    primaryDark: '#B19CD9', // Bright divine purple
    
    // Status colors - High contrast divine themed
    success: '#10B981', // Bright emerald
    warning: '#F59E0B', // Bright amber
    error: '#EF4444', // Bright red
    info: '#3B82F6', // Bright blue
    
    // UI colors - Dark glassy divine
    border: 'rgba(165, 105, 189, 0.3)', // Divine purple border
    separator: 'rgba(35, 30, 45, 0.4)', // Dark divine separator
    overlay: 'rgba(26, 22, 37, 0.8)', // Deep divine overlay
    
    // Prayer/Bible specific - Dark divine tones
    prayerBackground: 'rgba(35, 30, 45, 0.9)', // Dark divine prayer
    bibleBackground: 'rgba(50, 40, 65, 0.9)', // Darker divine bible
    verseBackground: 'rgba(70, 55, 90, 0.2)', // Dark glassy divine verse
    
    // Tab colors - Dark glassy divine
    tabBackground: 'rgba(35, 30, 45, 0.7)', // Dark transparent tabs
    tabActive: '#B19CD9', // Bright divine purple active
    tabInactive: '#7D3C98', // Deep divine purple inactive
    
    // Shadows - Divine glow in dark
    shadowColor: '#B19CD9',
    shadowOpacity: 0.4,
    elevation: 8,
    
    // Gradients - Dark divine flows
    gradient: ['#231D2D', '#B19CD9', '#D7BDE2'], // Dark to bright divine
    headerGradient: ['#1A1625', '#231D2D'], // Dark divine gradient
    
    // Glass effect properties - Dark divine glass
    glass: {
      backgroundColor: 'rgba(50, 40, 65, 0.12)',
      borderColor: 'rgba(165, 105, 189, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)', // For web
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },
    
    // Modal glass effect - Dark divine
    modalGlass: {
      backgroundColor: 'rgba(35, 30, 45, 0.18)',
      borderColor: 'rgba(165, 105, 189, 0.35)',
      borderWidth: 1,
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },
    
    // Card glass effect - Subtle dark divine
    cardGlass: {
      backgroundColor: 'rgba(50, 40, 65, 0.1)',
      borderColor: 'rgba(165, 105, 189, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    
    // Button glass effect - Vibrant dark divine
    buttonGlass: {
      backgroundColor: 'rgba(165, 105, 189, 0.25)',
      borderColor: 'rgba(165, 105, 189, 0.45)',
      borderWidth: 1,
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },
    
    // Special effects - Divine energy in dark
    glow: {
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },
    
    // Animation colors - Dark divine energy
    animation: {
      shimmer: ['#231D2D', '#B19CD9', '#231D2D'],
      pulse: '#B19CD9',
      ripple: 'rgba(165, 105, 189, 0.4)',
    }
  }
};
