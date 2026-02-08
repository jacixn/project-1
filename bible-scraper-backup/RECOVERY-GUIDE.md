# Bible Data Recovery Guide

## What this is
Your Biblely app uses 44 Bible translations stored as JSON files in a private GitHub repo.
This guide tells you how to get ALL the Bible data back from scratch if you ever lose everything.

---

## WHERE YOUR BIBLE DATA LIVES

### Primary location (GitHub - private repo)
- Repo: https://github.com/jacixn/bible-versions
- Contains: 44 JSON files in `versions/en/` (one per translation)
- Also contains: The scraper scripts in `scraper-tools/`

### Backup location (GitHub - main app repo)
- Repo: https://github.com/jacixn/project-1
- Contains: The scraper scripts in `bible-scraper-backup/`

---

## SCENARIO 1: Bible-versions repo still exists (easiest)

Just clone it and you have everything:
```bash
git clone https://github.com/jacixn/bible-versions.git
```
All 44 translation files will be in `versions/en/`.

---

## SCENARIO 2: Bible-versions repo is gone, but project-1 repo exists

The scraper scripts are backed up in your main app repo.

### Step 1: Get a new Mac, install Python
Python 3 comes pre-installed on Mac. If not:
```bash
brew install python3
```

### Step 2: Clone your app repo to get the scraper scripts
```bash
git clone https://github.com/jacixn/project-1.git
cd project-1/bible-scraper-backup
```

### Step 3: Install Python dependencies
```bash
pip3 install beautifulsoup4 requests html5lib
```

### Step 4: Run the scraper (takes ~4-5 hours)
```bash
python3 bible_scraper.py --output bible_data.json
```
This scrapes every single verse from BibleHub.com (https://biblehub.com).

To check progress while it runs:
```bash
tail -f bible_scraper.log
```

If it crashes or you close your laptop, just resume:
```bash
python3 bible_scraper.py --resume --output bible_data.json
```

### Step 5: Split into individual translation files
```bash
python3 finish_and_deploy.py
```
This creates `versions/en/` with 44 JSON files (one per translation).

### Step 6: Create a new private GitHub repo and push
1. Go to https://github.com/new
2. Name it `bible-versions`
3. Set it to **Private**
4. Click "Create repository"
5. Then run:
```bash
git init
git config http.postBuffer 524288000
git add versions/
git commit -m "Add Bible translations"
git remote add origin https://github.com/jacixn/bible-versions.git
git branch -M main
git push -u origin main
```

### Step 7: Create a GitHub Personal Access Token (PAT)
1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Name: "Biblely Bible Access"
4. Expiration: pick something long (e.g. 1 year)
5. Under "Repository access", select "Only select repositories" > pick `bible-versions`
6. Under "Permissions" > "Repository permissions" > "Contents" > set to **Read-only**
7. Click "Generate token"
8. Copy the token (starts with `github_pat_...`)

### Step 8: Add the token to your app
Create the file `fivefold-ios/github.config.js` (this file is gitignored, so it won't be in the repo):
```javascript
export const GITHUB_CONFIG = {
  token: 'github_pat_PASTE_YOUR_TOKEN_HERE',
};
```

Done! The app will now fetch Bible translations from your private repo.

---

## SCENARIO 3: BOTH repos are gone (nuclear option)

Even if both GitHub repos are deleted, you can still recover because the scraper
scripts are saved in this very file below, and BibleHub.com has all the data.

### bible_scraper.py
This is the main script. It's saved in this same folder. If you somehow lose the
file but have this README, you can find the script at:
- https://github.com/jacixn/project-1 (in `bible-scraper-backup/`)
- https://github.com/jacixn/bible-versions (in `scraper-tools/`)

If both are gone, you'll need to write a new scraper for BibleHub.com, or ask
an AI assistant to help you scrape https://biblehub.com/{book}/{chapter}-{verse}.htm
The page contains a table with all translations for each verse.

### Key facts for re-building a scraper
- BibleHub URL format: `https://biblehub.com/{book}/{chapter}-{verse}.htm`
  - Example: `https://biblehub.com/genesis/1-1.htm`
- Each page has a table with every translation of that verse
- The Bible has 31,102 verses across 66 books
- The scraper found 44 English translations
- Add a delay between requests to be polite to the server
- Cache HTML locally so you don't re-download on resume

---

## LIST OF ALL 44 TRANSLATIONS

Full Bible (66 books):
1. American Standard Version (ASV)
2. Amplified Bible (AMP)
3. Berean Standard Bible (BSB)
4. Catholic Public Domain Version (CPDV)
5. Christian Standard Bible (CSB)
6. Contemporary English Version (CEV)
7. Douay-Rheims Bible (DRB)
8. English Revised Version (ERV)
9. English Standard Version (ESV)
10. God's Word Translation (GWT)
11. Good News Translation (GNT)
12. Holman Christian Standard Bible (HCSB)
13. International Standard Version (ISV)
14. King James Bible (KJV)
15. Lamsa Bible (LAMSA)
16. Legacy Standard Bible (LSB)
17. Literal Standard Version (LSV)
18. Majority Standard Bible (MSB)
19. NASB 1977 (NASB77)
20. NASB 1995 (NASB95)
21. NET Bible (NET)
22. New American Bible (NAB)
23. New American Standard Bible (NASB)
24. New Heart English Bible (NHEB)
25. New International Version (NIV)
26. New King James Version (NKJV)
27. New Living Translation (NLT)
28. New Revised Standard Version (NRSV)
29. Smith's Literal Translation (SLT)
30. Webster's Bible Translation (WBT)
31. World English Bible (WEB)
32. Young's Literal Translation (YLT)

Old Testament only:
33. Brenton Septuagint Translation (LXX) - 39 books
34. JPS Tanakh 1917 (JPS) - 39 books
35. Peshitta Holy Bible Translated (PHBT) - 39 books

New Testament only:
36. Anderson New Testament (ANT)
37. Aramaic Bible in Plain English (ABPE)
38. Berean Literal Bible (BLB)
39. Godbey New Testament (GODBEY)
40. Haweis New Testament (HAWEIS)
41. Mace New Testament (MACE)
42. Weymouth New Testament (WNT)
43. Worrell New Testament (WORRELL)
44. Worsley New Testament (WORSLEY)

---

## QUICK REFERENCE

| What | Where |
|------|-------|
| Bible JSON files | `jacixn/bible-versions` repo > `versions/en/` |
| Scraper scripts (backup 1) | `jacixn/bible-versions` repo > `scraper-tools/` |
| Scraper scripts (backup 2) | `jacixn/project-1` repo > `bible-scraper-backup/` |
| App config file (gitignored) | `fivefold-ios/github.config.js` |
| Source website | https://biblehub.com |
| Data format | JSON, one file per translation |
| Total verses | 31,102 |
| Total translations | 44 |
| Total data size | ~157 MB |
| Scrape time | ~4-5 hours |
| Last scraped | February 8, 2026 |
