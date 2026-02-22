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
    comingSoon: 'Not Available',
    
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
        description: 'Smart task suggestions tailored to your spiritual journey',
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

// Only English has full translations. Other languages will be added in future updates.
// Listing only English prevents users from selecting a broken "Coming Soon" experience.
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

// Planned languages for future release (translations not yet complete):
// es (Spanish), fr (French), de (German), it (Italian), pt (Portuguese),
// ru (Russian), zh (Chinese), ja (Japanese), ko (Korean), ar (Arabic),
// hi (Hindi), sw (Swahili), tw (Twi), yo (Yoruba), am (Amharic), zu (Zulu)

// Fallback to English strings for all non-English languages (not yet translated)
const createBasicTranslation = (langCode) => {
  return { ...translations.en };
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