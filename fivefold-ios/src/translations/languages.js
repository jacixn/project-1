export const translations = {
  en: {
    // English translations
    appName: 'Biblely',
    tagline: 'Faith & Focus, Every Day',
    
    // Navigation
    tasks: 'Tasks',
    profile: 'Profile',
    
    // Headers
    tasksHeader: 'Tasks & Goals',
    tasksSubheader: 'Stay focused and earn points',
    yourJourney: 'Your Journey',
    
    // Stats
    tasksDone: 'Tasks Done',
    savedVerses: 'Saved Verses',
    prayers: 'Prayers',
    dayStreak: 'Day Streak',
    
    // Prayer Times
    todaysPrayers: "Today's Prayers",
    beforeSunrise: 'Before Sunrise',
    afterSunrise: 'After Sunrise',
    midday: 'Midday',
    beforeSunset: 'Before Sunset',
    afterSunset: 'After Sunset',
    completed: 'Completed',
    tooEarly: 'Too Early',
    missed: 'Missed',
    
    // Bible
    holyBible: 'Holy Bible',
    oldTestament: 'Old Testament',
    newTestament: 'New Testament',
    books: 'books',
    bibleVersion: 'Bible Version',
    comingSoon: 'Coming Soon',
    
    // Tasks
    addTask: 'Add Task',
    low: 'Low',
    mid: 'Mid',
    high: 'High',
    smart: 'Smart',
    estTime: 'Est. time',
    
    // Buttons
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    settings: 'Settings',
    editProfile: 'Edit Profile',
    discuss: 'Discuss',
    simple: 'Simple',
    
    // Settings
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    notifications: 'Notifications',
    deleteAccount: 'Delete Account',
    
    // Messages
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    pleaseWait: 'Please wait...',
    changingLanguage: 'Changing language...',
    pullToRefresh: 'Pull to refresh',
    achievements: 'Achievements',
    level: 'Level',
    points: 'points',
    believer: 'Believer',
    firstPrayer: 'First Prayer',
    bibleReader: 'Bible Reader',
    savedVersesTitle: 'Saved Verses',
    noSavedVerses: 'No saved verses yet',
    tapToSave: 'Tap the bookmark icon on any verse to save it',
    remove: 'Remove',
    simple: 'Simple',
    discuss: 'Discuss',

    // Profile related
    nameRequired: 'Name Required',
    enterNameMessage: 'Please enter your name to continue.',

    // Onboarding
    welcome: {
      skip: 'Skip',
      title: 'Welcome to Biblely',
      subtitle: 'Faith & Focus, Every Day',
      letsGo: "Let's Go",
      smartTasks: 'Smart task prioritization',
      dailyPrayer: 'Daily prayer reminders',
      bibleReading: 'Personalized Bible reading',
    },
    language: {
      title: 'Choose Your Language',
      subtitle: 'Select your preferred language',
      next: 'Next',
      back: 'Back',
    },
    features: {
      title: 'Powerful Features',
      subtitle: 'Everything you need for spiritual growth',
      smartTasks: {
        title: 'Smart Tasks & Goals',
        description: 'AI-powered task suggestions tailored to your spiritual journey',
      },
      prayerTimes: {
        title: 'Prayer Time Tracking',
        description: 'Never miss your daily prayers with intelligent reminders',
      },
      friendChat: {
        title: 'Friend Chat Support',
        description: 'Connect with your spiritual community for encouragement',
      },
    },
    skipDialog: {
      title: 'Skip Setup?',
      message: 'You can always complete your profile later in settings.',
      skipAction: 'Skip for now',
      continueSetup: 'Continue Setup',
    },
  },
};

export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', flag: '🇬🇭' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦' },
];

// Create "Coming Soon" translation for all non-English languages
const createBasicTranslation = (langCode) => {
  return {
    appName: 'Coming Soon',
    tagline: 'Coming Soon',
    tasks: 'Coming Soon',
    profile: 'Coming Soon',
    tasksHeader: 'Coming Soon',
    tasksSubheader: 'Coming Soon',
    yourJourney: 'Coming Soon',
    tasksDone: 'Coming Soon',
    savedVerses: 'Coming Soon',
    prayers: 'Coming Soon',
    dayStreak: 'Coming Soon',
    todaysPrayers: 'Coming Soon',
    beforeSunrise: 'Coming Soon',
    afterSunrise: 'Coming Soon',
    midday: 'Coming Soon',
    beforeSunset: 'Coming Soon',
    afterSunset: 'Coming Soon',
    completed: 'Coming Soon',
    tooEarly: 'Coming Soon',
    missed: 'Coming Soon',
    holyBible: 'Coming Soon',
    oldTestament: 'Coming Soon',
    newTestament: 'Coming Soon',
    books: 'Coming Soon',
    bibleVersion: 'Coming Soon',
    comingSoon: 'Coming Soon',
    addTask: 'Coming Soon',
    low: 'Coming Soon',
    mid: 'Coming Soon',
    high: 'Coming Soon',
    smart: 'Coming Soon',
    estTime: 'Coming Soon',
    save: 'Coming Soon',
    cancel: 'Coming Soon',
    done: 'Coming Soon',
    settings: 'Coming Soon',
    editProfile: 'Coming Soon',
    discuss: 'Coming Soon',
    simple: 'Coming Soon',
    darkMode: 'Coming Soon',
    lightMode: 'Coming Soon',
    language: 'Coming Soon',
    notifications: 'Coming Soon',
    deleteAccount: 'Coming Soon',
    loading: 'Coming Soon',
    error: 'Coming Soon',
    success: 'Coming Soon',
    pleaseWait: 'Coming Soon',
    changingLanguage: 'Coming Soon',
    pullToRefresh: 'Coming Soon',
    achievements: 'Coming Soon',
    level: 'Coming Soon',
    points: 'Coming Soon',
    believer: 'Coming Soon',
    firstPrayer: 'Coming Soon',
    bibleReader: 'Coming Soon',
    savedVersesTitle: 'Coming Soon',
    noSavedVerses: 'Coming Soon',
    tapToSave: 'Coming Soon',
    remove: 'Coming Soon',
    nameRequired: 'Coming Soon',
    enterNameMessage: 'Coming Soon',
  };
};

// Initialize translations for languages without full translations
translations.es = createBasicTranslation('es');
translations.fr = createBasicTranslation('fr');
translations.de = createBasicTranslation('de');
translations.it = createBasicTranslation('it');
translations.pt = createBasicTranslation('pt');
translations.ru = createBasicTranslation('ru');
translations.zh = createBasicTranslation('zh');
translations.ja = createBasicTranslation('ja');
translations.ko = createBasicTranslation('ko');
translations.ar = createBasicTranslation('ar');
translations.hi = createBasicTranslation('hi');
translations.sw = createBasicTranslation('sw');
translations.tw = createBasicTranslation('tw');
translations.yo = createBasicTranslation('yo');
translations.am = createBasicTranslation('am');
translations.zu = createBasicTranslation('zu');

export const getTranslation = (language = 'en') => {
  return translations[language] || translations.en;
};