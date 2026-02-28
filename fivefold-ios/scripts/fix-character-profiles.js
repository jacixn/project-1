'use strict';
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'bible-characters.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function isGeneric(char) {
  if (!char || !char.story) return false;
  return (
    char.story.includes('part of the rich tapestry') ||
    char.story.includes('This figure is') ||
    char.story.includes('appears in the biblical narrative')
  );
}

const updates = {};

updates['Sarah'] = {
  name: 'Sarah - Mother of Nations',
  imageUrl: 'https://raw.githubusercontent.com/jacixn/biblely-character-data/main/profileImage/sarah.png',
  story: 'Sarah was born Sarai in Ur of the Chaldeans, wife of Abraham and one of the most important women in all of Scripture. God changed her name to Sarah, meaning princess, as a sign of the covenant promise that she would become mother of nations and that kings would come from her line. She was beautiful enough that Abraham twice passed her off as his sister out of fear, and on both occasions God intervened to protect and restore her.

The great test of Sarah's life was her long barrenness. She waited decade after decade for the child God had promised, and in her impatience she gave Hagar to Abraham, producing Ishmael. But when three visitors came to Abraham's tent at Mamre and promised a son within a year, she laughed to herself behind the tent door. She was ninety years old. God heard her laugh and asked, Is anything too hard for the Lord? True to his word, Isaac was born, and her laughter turned from disbelief to pure joy: God has brought me laughter, and everyone who hears about this will laugh with me.

Sarah died at 127, the only woman in Scripture whose age at death is recorded, a detail that underlines her extraordinary significance. Abraham mourned deeply and bought the cave of Machpelah at Hebron to bury her, the first piece of the Promised Land the patriarchs owned outright. The New Testament holds her up as a model of faith, and Peter calls her mother to all women who follow her path of trust.',
  themes: [
    'Faith Through Waiting: Sarah's decades of barrenness and eventual miraculous birth of Isaac stand as one of Scripture's great testimonies to trusting God's promise when circumstances seem impossible',
    'Laughter Transformed: Her name became linked to laughter twice, first in disbelief at the impossible, then in overflowing joy when it came true, showing how God delights to surprise us',
    'Imperfect Faith Honoured: She made mistakes, giving Hagar to Abraham and treating her harshly, yet Hebrews 11 still counts her among the heroes of faith, showing God works through flawed people',
    'Covenant Partner: Unlike many ancient women who appear in the background, Sarah is personally included in God's covenant promise, her name change marking her as a participant, not merely a bystander'
  ],
  culturalImpact: 'Sarah is venerated in Judaism, Christianity, and Islam as a founding mother. In Islamic tradition she is the wife of Ibrahim and mother of Ishaq. Artists from Rembrandt to James Tissot depicted her at the moment the angels visited the tent. Medieval Christian writers interpreted her as a type of the church, her son Isaac as a type of Christ. Her name remains one of the most enduring in Western culture.',
  verses: ['Genesis 17:15-16', 'Genesis 18:12-14', 'Genesis 21:1-3', 'Romans 4:19', 'Hebrews 11:11', '1 Peter 3:6'],
  audioUrl: 'https://raw.githubusercontent.com/jacixn/project-1/main/audio-files/bible-characters/sarah.mp3'
};
