// Bible Versions Data
// Based on popular Bible apps and user preferences

export const bibleVersions = [
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    description: '',
    language: 'English',
    isFree: true,
    isDefault: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Public Domain',
    copyright: 'Public Domain'
  },
  {
    id: 'niv',
    name: 'New International Version',
    abbreviation: 'NIV',
    description: 'Coming Soon',
    language: 'English',
    isFree: true,
    isAvailable: false,
    category: 'Modern',
    publisher: 'Biblica, Inc.',
    copyright: '© 1973, 1978, 1984, 2011 by Biblica, Inc.'
  },
  {
    id: 'nkjv',
    name: 'New King James Version',
    abbreviation: 'NKJV',
    description: 'Coming Soon',
    language: 'English',
    isFree: true,
    isAvailable: false,
    category: 'Traditional',
    publisher: 'Thomas Nelson',
    copyright: '© 1982 by Thomas Nelson'
  },
  {
    id: 'esv',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    description: 'Coming Soon',
    language: 'English',
    isFree: true,
    isAvailable: false,
    category: 'Study',
    publisher: 'Crossway',
    copyright: '© 2001 by Crossway'
  },
  {
    id: 'nlt',
    name: 'New Living Translation',
    abbreviation: 'NLT',
    description: 'Coming Soon',
    language: 'English',
    isFree: true,
    isAvailable: false,
    category: 'Contemporary',
    publisher: 'Tyndale House Publishers',
    copyright: '© 1996, 2004, 2015 by Tyndale House Foundation'
  },
  {
    id: 'msg',
    name: 'The Message',
    abbreviation: 'MSG',
    description: 'Coming Soon',
    language: 'English',
    isFree: true,
    isAvailable: false,
    category: 'Paraphrase',
    publisher: 'NavPress',
    copyright: '© 2002 Eugene H. Peterson'
  }
];

export const getVersionById = (id) => {
  return bibleVersions.find(version => version.id === id) || bibleVersions.find(v => v.isDefault);
};

export const getFreeVersions = () => {
  return bibleVersions.filter(version => version.isFree);
};

export const getPremiumVersions = () => {
  return bibleVersions.filter(version => !version.isFree);
};

export const getVersionsByCategory = (category) => {
  return bibleVersions.filter(version => version.category === category);
};

export const getVersionsByLanguage = (language) => {
  return bibleVersions.filter(version => version.language === language);
};
