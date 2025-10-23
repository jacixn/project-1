// Bible Versions Data
// Source: https://github.com/arron-taylor/bible-versions
// 35 complete English Bible translations in JSON format

export const bibleVersions = [
  // Popular Modern Translations
  {
    id: 'niv',
    name: 'New International Version',
    abbreviation: 'NIV',
    description: 'Most popular modern translation',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Biblica',
    copyright: 'Public Domain',
    githubFile: 'NEW INTERNATIONAL VERSION.json'
  },
  {
    id: 'nlt',
    name: 'New Living Translation',
    abbreviation: 'NLT',
    description: 'Thought-for-thought translation',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Contemporary',
    publisher: 'Tyndale House',
    copyright: 'Public Domain',
    githubFile: 'NEW LIVING TRANSLATION.json'
  },
  {
    id: 'esv',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    description: 'Literal yet readable',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Crossway',
    copyright: 'Public Domain',
    githubFile: 'ENGLISH STANDARD VERSION.json'
  },
  
  // Traditional Translations
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    description: 'Classic English translation',
    language: 'English',
    isFree: true,
    isDefault: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Public Domain',
    copyright: 'Public Domain',
    githubFile: 'KING JAMES BIBLE.json'
  },
  {
    id: 'nkjv',
    name: 'New King James Version',
    abbreviation: 'NKJV',
    description: 'Updated KJV language',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Thomas Nelson',
    copyright: 'Public Domain',
    githubFile: 'NEW KING JAMES VERSION.json'
  },
  
  // Study & Literal Translations
  {
    id: 'nasb',
    name: 'New American Standard Bible',
    abbreviation: 'NASB',
    description: 'Most literal translation',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Lockman Foundation',
    copyright: 'Public Domain',
    githubFile: 'NEW AMERICAN STANDARD BIBLE.json'
  },
  {
    id: 'csb',
    name: 'Christian Standard Bible',
    abbreviation: 'CSB',
    description: 'Optimal balance',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Holman Bible Publishers',
    copyright: 'Public Domain',
    githubFile: 'CHRISTIAN STANDARD BIBLE.json'
  },
  {
    id: 'amp',
    name: 'Amplified Bible',
    abbreviation: 'AMP',
    description: 'Expands meaning',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Zondervan',
    copyright: 'Public Domain',
    githubFile: 'AMPLIFIED BIBLE.json'
  },
  
  // Contemporary Versions
  {
    id: 'cev',
    name: 'Contemporary English Version',
    abbreviation: 'CEV',
    description: 'Simple modern English',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Contemporary',
    publisher: 'American Bible Society',
    copyright: 'Public Domain',
    githubFile: 'CONTEMPORARY ENGLISH VERSION.json'
  },
  {
    id: 'gnt',
    name: "Good News Translation",
    abbreviation: 'GNT',
    description: 'Common language',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Contemporary',
    publisher: 'American Bible Society',
    copyright: 'Public Domain',
    githubFile: "GOOD NEWS TRANSLATION.json"
  },
  {
    id: 'gwt',
    name: "God's Word Translation",
    abbreviation: 'GWT',
    description: 'Natural English',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Contemporary',
    publisher: "God's Word to the Nations",
    copyright: 'Public Domain',
    githubFile: "GOD'S WORD® TRANSLATION.json"
  },
  
  // Literal Translations
  {
    id: 'lsv',
    name: 'Literal Standard Version',
    abbreviation: 'LSV',
    description: 'Modern literal',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Covenant Press',
    copyright: 'Public Domain',
    githubFile: 'LITERAL STANDARD VERSION.json'
  },
  {
    id: 'ylt',
    name: "Young's Literal Translation",
    abbreviation: 'YLT',
    description: 'Word-for-word',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Robert Young',
    copyright: 'Public Domain',
    githubFile: "YOUNG'S LITERAL TRANSLATION.json"
  },
  {
    id: 'blb',
    name: 'Berean Literal Bible',
    abbreviation: 'BLB',
    description: 'Literal Greek/Hebrew',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Bible Hub',
    copyright: 'Public Domain',
    githubFile: 'BEREAN LITERAL BIBLE.json'
  },
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    description: 'Modern standard',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Bible Hub',
    copyright: 'Public Domain',
    githubFile: 'BEREAN STANDARD BIBLE.json'
  },
  
  // Historical Translations
  {
    id: 'asv',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    description: 'American revision of RV',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Thomas Nelson & Sons',
    copyright: 'Public Domain',
    githubFile: 'AMERICAN STANDARD VERSION.json'
  },
  {
    id: 'web',
    name: 'World English Bible',
    abbreviation: 'WEB',
    description: 'Public domain update',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Public Domain',
    copyright: 'Public Domain',
    githubFile: 'WORLD ENGLISH BIBLE.json'
  },
  {
    id: 'drb',
    name: 'Douay-Rheims Bible',
    abbreviation: 'DRB',
    description: 'Catholic translation',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Catholic Church',
    copyright: 'Public Domain',
    githubFile: 'DOUAY-RHEIMS BIBLE.json'
  },
  
  // Aramaic & Septuagint
  {
    id: 'abpe',
    name: 'Aramaic Bible in Plain English',
    abbreviation: 'ABPE',
    description: 'From Aramaic',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'David Bauscher',
    copyright: 'Public Domain',
    githubFile: 'ARAMAIC BIBLE IN PLAIN ENGLISH.json'
  },
  {
    id: 'lxx',
    name: 'Brenton Septuagint Translation',
    abbreviation: 'LXX',
    description: 'Greek Old Testament',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Samuel Bagster & Sons',
    copyright: 'Public Domain',
    githubFile: 'BRENTON SEPTUAGINT TRANSLATION.json'
  },
  {
    id: 'phbt',
    name: 'Peshitta Holy Bible Translated',
    abbreviation: 'PHBT',
    description: 'Aramaic Peshitta',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Janet M. Magiera',
    copyright: 'Public Domain',
    githubFile: 'PESHITTA HOLY BIBLE TRANSLATED.json'
  },
  
  // Catholic Versions
  {
    id: 'cpdv',
    name: 'Catholic Public Domain Version',
    abbreviation: 'CPDV',
    description: 'Modern Catholic',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Ronald L. Conte Jr.',
    copyright: 'Public Domain',
    githubFile: 'CATHOLIC PUBLIC DOMAIN VERSION.json'
  },
  {
    id: 'nab',
    name: 'New American Bible',
    abbreviation: 'NAB',
    description: 'Official US Catholic',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'USCCB',
    copyright: 'Public Domain',
    githubFile: 'NEW AMERICAN BIBLE.json'
  },
  
  // Other Modern Versions
  {
    id: 'nrsv',
    name: 'New Revised Standard Version',
    abbreviation: 'NRSV',
    description: 'Scholarly standard',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'National Council of Churches',
    copyright: 'Public Domain',
    githubFile: 'NEW REVISED STANDARD VERSION.json'
  },
  {
    id: 'nheb',
    name: 'New Heart English Bible',
    abbreviation: 'NHEB',
    description: 'Updated WEB',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Modern',
    publisher: 'Wayne A. Mitchell',
    copyright: 'Public Domain',
    githubFile: 'NEW HEART ENGLISH BIBLE.json'
  },
  
  // Classic Translations
  {
    id: 'wbt',
    name: "Webster's Bible Translation",
    abbreviation: 'WBT',
    description: 'Noah Webster revision',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Traditional',
    publisher: 'Noah Webster',
    copyright: 'Public Domain',
    githubFile: "WEBSTER'S BIBLE TRANSLATION.json"
  },
  {
    id: 'slt',
    name: "Smith's Literal Translation",
    abbreviation: 'SLT',
    description: 'Literal Hebrew/Greek',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'Julia E. Smith',
    copyright: 'Public Domain',
    githubFile: "SMITH'S LITERAL TRANSLATION.json"
  },
  
  // New Testament Only
  {
    id: 'ant',
    name: 'Anderson New Testament',
    abbreviation: 'ANT',
    description: 'NT only',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'H.T. Anderson',
    copyright: 'Public Domain',
    githubFile: 'ANDERSON NEW TESTAMENT.json'
  },
  {
    id: 'wnt',
    name: 'Weymouth New Testament',
    abbreviation: 'WNT',
    description: 'Modern speech NT',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Contemporary',
    publisher: 'Richard Francis Weymouth',
    copyright: 'Public Domain',
    githubFile: 'WEYMOUTH NEW TESTAMENT.json'
  },
  {
    id: 'worrell',
    name: 'Worrell New Testament',
    abbreviation: 'WORRELL',
    description: 'NT only',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'A.S. Worrell',
    copyright: 'Public Domain',
    githubFile: 'WORRELL NEW TESTAMENT.json'
  },
  {
    id: 'worsley',
    name: 'Worsley New Testament',
    abbreviation: 'WORSLEY',
    description: 'NT only',
    language: 'English',
    isFree: true,
    isAvailable: true,
    category: 'Study',
    publisher: 'John Worsley',
    copyright: 'Public Domain',
    githubFile: 'WORSLEY NEW TESTAMENT.json'
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
