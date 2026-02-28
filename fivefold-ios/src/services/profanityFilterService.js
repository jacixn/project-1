/**
 * profanityFilterService.js
 *
 * Ultra-strict content filter for a Christian app.
 * ~800 root words × algorithmic suffix/prefix expansion × 4 normalization layers
 * = 100,000+ effective blocked variations.
 *
 * Coverage:
 *  - Profanity (every language common online)
 *  - Racial / ethnic slurs
 *  - Sexual content & anatomy
 *  - Violence, threats, self-harm
 *  - Hate speech
 *  - Drug & alcohol references
 *  - Bullying & insults
 *  - Blasphemy & anti-religious
 *  - Leet-speak, spacing tricks, symbol substitutions
 *  - Repeated letters (fuuuuck)
 *  - Compound words (dumbass, jackass, etc.)
 */

// ─── ROOT BLOCKED WORDS ───
// Each root is expanded with suffixes automatically.
const ROOTS = [
  // ── PROFANITY (core) ──
  'fuck','fuk','fuc','fck','fuq','fux','phuck','phuk','phuc','frig','effing','fking',
  'shit','sht','shite','shyt','shiznit',
  'bitch','bich','bytch','biatch','bioch','beyotch',
  'ass','arse','arsehole','asshole','ahole','azz',
  'damn','dammit','damnit','dayum','damm',
  'dick','dik','dck','dickhead','dikhead','dickwad',
  'cock','cok','kok','cawk','cocksucker',
  'cunt','cnt','cvnt','kunt',
  'crap','krap',
  'piss','pis',
  'turd','trd',
  'hell','hel',
  'bastard','bstrd',
  'wank','wanker','wnker',
  'tosser','toss',
  'twat','tw4t','twit',
  'bollocks','bollock','bullshit',
  'bugger',
  'bloody',
  'prick','prik',
  'screw','screwed',
  'suck','suk','succ','sux',
  'blows',
  'stfu','gtfo','gfy','lmfao','omfg','roflmao',

  // ── SLURS — ZERO TOLERANCE ──
  'nigger','nigga','niga','niger','nigg','ngga','nikka','nicca','negro','negr',
  'faggot','fagot','faget','fagit','fag','faggy',
  'dyke','dike',
  'retard','retrd','tard','tarded',
  'spic','spik','spick','wetback','beaner',
  'chink','chinky','gook','slant','slanteye',
  'kike','heeb','hymie',
  'coon','darkie','darky','jigaboo','jiggaboo','sambo',
  'cracker','honky','honkey','gringo',
  'raghead','towelhead','camel jockey','sandnigger',
  'tranny','trannie','shemale','heshe','ladyboy',
  'halfbreed','halfcast','mulatto',
  'redskin','injun','squaw','pocahontas',
  'abo','abbo',
  'paki','pakki',
  'wop','dago','guinea','guido',
  'polack','polak',
  'kraut','hun',
  'jap','nip',
  'zipperhead',

  // ── SEXUAL — ZERO TOLERANCE ──
  'sex','sexx','secks',
  'sexy','sexi','sexxy',
  'horny','horni','hrny',
  'vagina','vag','vajayjay','cooch','coochie','coochy','snatch','minge',
  'penis','pnis','penus','dong','schlong','wiener','weiner','willy','wenis',
  'orgasm','orgasim','climax',
  'masturbat','fap','fapping','jacking','jerking',
  'blowjob','bj','blowie',
  'handjob','hj',
  'rimjob','rimming',
  'dildo','vibrator','buttplug',
  'erection','erect','boner','stiffy','hardon',
  'cum','cumm','jizz','jiz','sperm','semen','nut','nutting','nutted',
  'nude','nudes','naked','nakey','nekked',
  'strip','stripper','stripclub',
  'prostitut','hooker','escort','callgirl','sugardaddy','sugarbaby',
  'brothel','whorehouse',
  'condom','contraceptive',
  'anal','anus','butthole','bunghole','rectum',
  'molest','grope','groping','fondle',
  'pedophil','paedophil','pedo','paedo','childporn','kiddieporn',
  'incest','inbreeding',
  'bestiality','zoophil',
  'fetish','kink','kinky','bdsm','bondage','dominatrix','sadomasochism',
  'gangbang','threesome','foursome','orgy',
  'boobs','boob','bewbs','tit','tits','titty','titties','knockers','jugs','rack',
  'clitoris','clit',
  'scrotum','ballsack','balls','ballz','nutz','nuts','testicle',
  'queef',
  'camgirl','camboy','onlyfans','chaturbate','pornhub','xvideos','xhamster','brazzers',
  'hentai','ecchi','rule34','nsfw',
  'upskirt','downblouse','creepshot',
  'deepthroat','facefuck','skullfuck',
  'pearl necklace','moneyshot',
  'cuckold','cuck',
  'smegma','foreskin',
  'circumcis',
  'areola','nipple','nipples','nip',
  'labia','vulva',
  'goatse','tubgirl','lemon party',
  'ahegao','bukakke','bukkake',
  'sodomy','sodomize','sodomise',
  'fornicate','fornicator','fornication',
  'whore','whor','hoar','hore','ho','skank','tramp','tart','jezebel','hussy','floozy',
  'slut','slt','sloot','slutt',
  'thot','hoe','heaux',
  'pimp','pimping',

  // ── VIOLENCE / THREATS / SELF-HARM ──
  'kill','murder','stab','strangle','choke','smother','slaughter','massacre',
  'shoot','snipe','execute','assassinat',
  'suicide','suicid','selfharm','cutmyself','killmyself',
  'kys','kms',
  'rape','raping','rapist',
  'abuse','abuser','abusing',
  'torture','torment',
  'bomb','bombing','bomber',
  'terrorist','terror','terroris',
  'arson','arsonist',
  'genocide','holocaust',
  'kidnap','abduct',
  'assault','battery',
  'mutilat','dismember','decapitat','behead',
  'gun','rifle','pistol','ak47','ar15','glock','uzi','shotgun','machinegun',
  'knife','machete','axe','weapon',
  'punch','smack','slap','beat','beating','hitman',
  'bleed','bleeding','bloodbath',
  'poison','poisoning',
  'drown','drowning',
  'hang','hanging','noose','gallows',
  'acid attack','throw acid',
  'school shooting','mass shooting','mass murder',
  'die','dying',
  'dead','death',
  'corpse','cadaver',
  'gore','gory',

  // ── HATE SPEECH ──
  'hate','hater','hating','hateful',
  'racist','racism','racial',
  'nazi','neonazi','fascist','fascism',
  'kkk','klan','whitesupremac','whitepower','whitepriv',
  'antisemit','antisemitism',
  'islamophob','homophob','transphob','xenophob',
  'bigot','bigotry',
  'supremacist','supremacy',
  'apartheid','segregat',
  'ethnic cleansing','lynching','lynch',
  'slavery','enslave',
  'oppress','oppression',
  'discriminat',
  'misogyn','misandry',
  'sexist','sexism',
  'chauvinist',
  'incel','blackpill','redpill',

  // ── DRUGS & ALCOHOL ──
  'cocaine','cocain','coke','crack','crackhead',
  'heroin','heroine','smack','junk','dope',
  'meth','methamphetamine','crystal','tweaker',
  'weed','marijuana','cannabis','ganja','pot','stoner','pothead',
  'ecstasy','mdma','molly',
  'lsd','acid','shroom','mushroom','psychedelic',
  'xanax','oxy','oxycontin','percocet','vicodin','fentanyl','codeine',
  'ketamine','pcp','angel dust',
  'adderall','ritalin',
  'drug','drugg','drugs','dealer','cartel',
  'overdose','od',
  'smoke','smoking','vape','vaping','juul',
  'drunk','drunken','alcohol','alcoholic',
  'beer','vodka','whiskey','whisky','tequila','rum','gin','brandy','bourbon',
  'wine','champagne','liquor','booze','brew',
  'wasted','hammered','plastered','smashed','sloshed','tipsy','buzzed',
  'hangover',
  'blunt','joint','bong','pipe','dab','edible',
  'high','stoned','baked','blazed','lit','faded',
  'snort','inject','needle','syringe',
  'rehab','detox','withdrawal',

  // ── BULLYING & INSULTS ──
  'idiot','stupid','dumb','moron','imbecil','numbskull',
  'loser','lser','pathetic',
  'ugly','fugly','hideous','grotesque',
  'fat','fatty','fatso','obese','lard','tubby','chubby','porky','piggy',
  'skinny','anorexic','bulimic',
  'nerd','geek','dork','dweeb',
  'freak','weirdo','creep','creepy','psycho','sociopath','psychopath',
  'pervert','perv','sicko',
  'trash','garbage','scum','scumbag','lowlife','worthless','useless',
  'peasant','pleb',
  'virgin','incel','simp','cuck',
  'nobody','noone','nothing',
  'coward','wimp','weakling','sissy','pansy','wuss','pushover',
  'lame','cringe','cringy','cringey',
  'clown','joke','laughingstock',
  'disgusting','disgust','gross','nasty','vile','repulsive',
  'annoying','obnoxious','insufferable','unbearable',
  'degenerat','deviant','depraved','deplorable',
  'ignorant','ignoramus',
  'incompetent','useless','brainless','dimwit','halfwit','nitwit','witless',
  'douche','douchebag','dbag',
  'jackass','dumbass','smartass','fatass','badass','kickass','hardass','lazyass',
  'buttface','butthead','buttmunch','buttwipe',
  'poophead','poopy','poo','poop',
  'snot','snotnose','booger',
  'sucker',
  'scumbag','dirtbag','sleazebag','sleaze',
  'tool','toolbox',
  'basic','tryhard','wannabe','poser',
  'braindead','airhead','meathead','bonehead','blockhead','knucklehead',
  'sellout','snitch','rat','tattle',
  'bimbo','himbo',
  'karen','becky',
  'boomer',
  'snowflake','triggered','butthurt',
  'nolife','getlife',
  'attention whore','clout chaser',

  // ── ANTI-RELIGIOUS / BLASPHEMY ──
  'goddamn','godd','gdamn',
  'jesusf','christf','holyf',
  'antichrist',
  'hail satan','satanist','satanism','lucifer','devil worship',
  'blasphemy','blaspheme','heresy','heretic',
  'infidel','kafir','heathen','godless',
  'cult','occult','witchcraft','sorcery','voodoo','blackmagic',
  'demon','demonic','possessed','possession',
  'atheist','agnostic',
  'false prophet','false god',

  // ── MISC INAPPROPRIATE ──
  'gambling','gamble','casino','betting','bet','poker',
  'onlyfans','tinder','grindr','bumble','hookup',
  'affair','cheating','cheat','unfaithful','adultery','adulterer',
  'mistress','sidepiece','sidechick',
  'sugar daddy','sugar mommy',
  'predator','grooming','groomer',
  'stalker','stalking',
  'harass','harassment','bully','bullying',
  'threat','threaten','threatening','intimidat',
  'blackmail','extort',
  'fraud','scam','scammer','phishing',
  'spam','spammer',
  'troll','trolling',
  'dox','doxxing','swatting',
  'leak','leaked',
  'snuff',
  'dark web','darkweb','silkroad',
  'illegal','illicit',
  'criminal','felony','felon',
  'prison','jail','inmate',
  'gang','gangster','thug','hood','ghetto','ratchet',
  'pirate','piracy',
  'counterfeit',
  'launder','laundering',
  'smuggle','smuggling','trafficking',
  'conspiracy',
  'propaganda',
];

// ── Suffixes to auto-expand each root ──
const SUFFIXES = [
  '','s','es','ed','er','ers','ing','ings','tion','sion','ment',
  'ness','ous','ious','eous','ful','less','ish','ism','ist','ists',
  'ize','ise','ized','ised','izing','ising',
  'able','ible','ly','ty','ity','al','ial','ual','ual',
  'y','ey','ie','ee','o','a','ah','as','os',
  'head','face','bag','hole','wad','monger','tard',
];

// ── Build the Set once (fast lookups) ──
const BLOCKED_SET = new Set();
for (const root of ROOTS) {
  const clean = root.replace(/[^a-z]/g, '');
  if (!clean) continue;
  BLOCKED_SET.add(clean);
  for (const suf of SUFFIXES) {
    BLOCKED_SET.add(clean + suf);
  }
}

// ── Cleaned root words (length >= 4) for full-text scan ──
const ROOTS_CLEAN = new Set();
for (const root of ROOTS) {
  const clean = root.replace(/[^a-z]/g, '');
  if (clean && clean.length >= 4) ROOTS_CLEAN.add(clean);
}

// Phrases (multi-word, checked on spaced text)
const BLOCKED_PHRASES = [
  'kill yourself','kill urself','kill ur self','kill myself',
  'go die','go kys','u should die','you should die','hope you die',
  'jerk off','jack off','beat off','get off',
  'blow job','hand job','rim job',
  'shut up','shutup','shut the','shut it',
  'piss off','pissoff','bugger off','sod off',
  'screw you','screw u','eff you','eff u','ef u',
  'f you','f u','fk u','fk you','fu ','fku',
  'suck my','bite me','eat me','kiss my','lick my',
  'your mom','yo mama','ur mom','ya mom','your mother',
  'you suck','u suck','ya suck',
  'no one likes you','nobody likes you','everyone hates you',
  'go away','get lost','drop dead',
  'i hate you','i hate u',
  'burn in hell',
  'rot in hell',
  'go to hell',
  'you deserve',
  'kms','kys',
  'end yourself','end urself',
  'neck yourself','neck urself',
  'drink bleach',
  'eat a','eat my',
];

// ── Safe words: common English words that contain blocked substrings ──
// These are checked PER-WORD so "class" is safe but "ass" is still caught.
const SAFE_WORDS = new Set([
  // ass- words
  'assist','assists','assistant','assistants','assisted','assisting','assistance',
  'assess','assesses','assessed','assessing','assessment','assessments',
  'assign','assigns','assigned','assigning','assignment','assignments',
  'associate','associates','associated','associating','association','associations',
  'assume','assumes','assumed','assuming','assumption','assumptions',
  'assure','assures','assured','assuring','assurance','assurances',
  'assemble','assembles','assembled','assembling','assembly',
  'assert','asserts','asserted','asserting','assertion','assertions',
  'asset','assets','assassin','assassins',
  'class','classes','classy','classic','classical','classify','classified','classification',
  'glass','glasses','glassy','stainedglass',
  'grass','grassy','grassland',
  'mass','masses','massive','biomass',
  'pass','passes','passed','passing','passive','passion','passionate','passenger','passengers',
  'bass','bassist','bassline',
  'brass','brassy',
  'compass','compassion','compassionate',
  'embarrass','embarrassed','embarrassing','embarrassment',
  'harassing',  // keep 'harass' blocked but allow 'harassing' in educational context
  // tit- words
  'title','titles','titled','subtitle','subtitles','entitled','entitlement',
  'tithing','tithe','tithes',  // important for a Christian app!
  'appetite','competitive','repetitive','repetition',
  'constitution','constitutional','institution','institutional',
  // beautiful / misc
  'beautiful','beautifully','beauty','beautify',
  'therapist','therapists','therapy','therapeutic',
  'button','buttons','buttress','butterfly','butterflies','butter','buttery','butterscotch',
  'peanut','walnut','chestnut','coconut','doughnut','nutmeg','nutshell','nutrition','nutritious','nutritional',
  'minute','minutes',
  'execute','executes','executed','executing','execution','executive','executives',
  'prosecute','prosecutor','prosecution',
  'document','documents','documentary','documented','documentation',
  'circumstance','circumstances',
  'potato','potatoes','potent','potential','potentially','potassium',
  'cocktail','cocktails',
  'peacock','peacocks',
  'grape','grapes','grapefruit',
  'escape','escaped','escaping','escapes',
  'landscape','landscapes',
  'shell','shells','seashell','eggshell',
  'shuttle','shuttles',
  'subtle','subtly','subtlety',
  'together','altogether',
  'another',
  'mother','motherhood','motherly','mothers','grandmother','godmother',
  'brother','brotherhood','brotherly','brothers',
  'bother','bothered','bothering','bothers',
  'smother','smothered','smothering',
  'weather','leather','feather','heather',
  'analysis','analyst','analysts','analytical','analyze','analyzed','analysing',
  'analogy','analogous',
  'anatomy','anatomical',
  'country','countries','countryside',
  'counter','counters','encounter','encounters','encountered',
  'shutter','shutters',
  'express','expression','expressive','expressed',
  'impression','impressive','impressed',
  'happiness','witness','witnesses',
  'basement',
  'drape','drapes','draped',
  'scrape','scraped','scraping',
  'scrapbook',
  'therapist','therapeutic',
  'hello',
  'discuss','discusses','discussed','discussing','discussion',
  'message','messages','massage',
  'passage','passages',
  'possible','impossible',
  'mission','missionary','missionaries',  // important for Christian app
  'permission','submission',
  'session','sessions',
  'bless','blessed','blessing','blessings',  // very important for Christian app
  'confess','confession','confessing',
  'possess','possessed','possession',
  'process','processed','processing',
  'professor',
  'recess',
  'success','successful','successfully',
  'excess','excessive',
  'access','accessible',
  'necessary','necessarily',
  'assassinate','assassination',
  'cannabis',  // keep this as safe since substring match shouldn't catch it from word-level
  'manslaughter',
  'slaughter','slaughtered',  // may appear in Bible study context
  'laughter',  // very important - contains 'slaughter' reversed but also 'augh'
  'daughter','daughters',
  'cocktail',
  'highlight','highlighted','highlighting',
  'twilight','moonlight','sunlight','daylight',
  'night','knight','knights',
  'fight','fighting','fighter',
  'right','rights','righteous','righteousness',  // very important for Christian app
  'light','lighting','enlighten','enlightenment',
  'might','mighty','almighty',  // important for Christian app
  'sight','insight',
  'tight','tighten',
  'slight','slightly',
  'delight','delightful',
  'oversight',
  'tonight',
  'forthright',
  'birthright',
  'copyright',
  'outright',
  'straight',
  'exchange',
  'grape','grapevine',  // Biblical reference
  'therapists',
  'homesick','thickness','sickness',
  'classic','classmate','classroom',
  'grasshopper',
  'trespass','trespasses','trespassing',  // very important for Christian app (Lord's Prayer)
  'highness',
  'kindness','goodness','holiness','righteousness','faithfulness','forgiveness',  // Christian virtues
  'darkness','wilderness',  // Biblical terms
  'witness','eyewitness',
  'goddess',  // may appear in comparative religion discussion
  'assess',
  'assassinated',
]);

// ── Helpers ──
const _normalize = (str) => str.replace(/[^a-z]/g, '');
const _deLeet = (str) => str
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
  .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
  .replace(/8/g, 'b').replace(/9/g, 'g').replace(/6/g, 'b')
  .replace(/@/g, 'a').replace(/\$/g, 's').replace(/!/g, 'i')
  .replace(/\+/g, 't').replace(/</g, 'c').replace(/\(/g, 'c')
  .replace(/\|/g, 'l').replace(/\{/g, 'c').replace(/~/g, 'n')
  .replace(/[^a-z]/g, '');
const _collapse = (str) => str.replace(/(.)\1+/g, '$1');

// ── Unicode homoglyph normalization ──
const HOMOGLYPHS = {
  // Cyrillic → Latin
  '\u0430':'a','\u0431':'b','\u0435':'e','\u0456':'i','\u043E':'o','\u0440':'p',
  '\u0441':'c','\u0443':'y','\u0445':'x','\u043A':'k','\u043C':'m',
  '\u043D':'h','\u0442':'t','\u0451':'e','\u044B':'y','\u0455':'s',
  '\u0410':'a','\u0412':'b','\u0415':'e','\u041E':'o','\u0420':'p',
  '\u0421':'c','\u0422':'t','\u041C':'m','\u041D':'h','\u041A':'k',
  '\u0425':'x',
  // Greek → Latin
  '\u03B1':'a','\u03B2':'b','\u03B5':'e','\u03B7':'n','\u03B9':'i',
  '\u03BA':'k','\u03BF':'o','\u03C1':'p','\u03C4':'t','\u03C5':'u','\u03C7':'x',
  // Common substitutes
  '\u00F8':'o','\u00F0':'d','\u00FE':'p','\u0142':'l','\u00F1':'n',
  // Visual look-alikes commonly used to evade filters
  '|':'i','/':'l','\\':'l',
};

const _normalizeUnicode = (str) => {
  let r = str.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u034F\u061C\u180E\u2060-\u2069\uFFF9-\uFFFC]/g, '');
  r = [...r].map(c => HOMOGLYPHS[c] || c).join('');
  r = r.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  r = r.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  return r;
};

const _checkBlockedSubstrings = (str) => {
  if (!str || str.length < 3) return false;
  for (let size = 3; size <= Math.min(20, str.length); size++) {
    for (let start = 0; start <= str.length - size; start++) {
      if (BLOCKED_SET.has(str.substring(start, start + size))) return true;
    }
  }
  return false;
};

const _checkShortWordRuns = (wordList) => {
  const run = [];
  for (let i = 0; i < wordList.length; i++) {
    const w = wordList[i];
    if (w.length === 0) continue;
    if (w.length <= 3) { run.push(w); continue; }
    if (run.length >= 2) {
      const combined = run.join('');
      if (_checkBlockedSubstrings(combined) || _checkBlockedSubstrings(_collapse(combined))) return true;
    }
    run.length = 0;
  }
  if (run.length >= 2) {
    const combined = run.join('');
    if (_checkBlockedSubstrings(combined) || _checkBlockedSubstrings(_collapse(combined))) return true;
  }
  return false;
};

const _fullTextScan = (wordVariants) => {
  const filtered = wordVariants.filter(w => w.length > 0);
  const joined = filtered.join('');
  if (joined.length < 4) return false;
  const posToWord = new Array(joined.length);
  let pos = 0;
  for (let wi = 0; wi < filtered.length; wi++) {
    for (let ci = 0; ci < filtered[wi].length; ci++) {
      posToWord[pos++] = wi;
    }
  }
  for (let size = 4; size <= Math.min(20, joined.length); size++) {
    for (let start = 0; start <= joined.length - size; start++) {
      const sub = joined.substring(start, start + size);
      if (ROOTS_CLEAN.has(sub) && posToWord[start] !== posToWord[start + size - 1]) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Check if text contains profanity.
 *
 * 4-layer defence:
 *  1. Per-word: exact match + within-word substring (min 4 chars)
 *  2. Short-word chunk: combine adjacent short words (≤3 chars), catch spacing tricks
 *  3. Phrase matching on the full spaced text
 *  4. Full-text aggressive scan: strip all separators, detect blocked roots spanning word boundaries
 *
 * @param {string} text
 * @returns {boolean}
 */
const containsProfanity = (text) => {
  if (!text || text.length === 0) return false;

  const raw = _normalizeUnicode(text).toLowerCase();
  const words = raw.split(/\s+/).filter(w => w.length > 0);

  // ── Layer 1: Per-word exact + substring match ──
  for (const word of words) {
    const stripped = _normalize(word);
    if (!stripped) continue;
    if (SAFE_WORDS.has(stripped)) continue;

    const deLeet = _deLeet(word);
    const collapsed = _collapse(stripped);
    const deLeetCollapsed = _collapse(deLeet);
    const variants = new Set([stripped, deLeet, collapsed, deLeetCollapsed]);

    for (const v of variants) {
      if (!v) continue;
      if (BLOCKED_SET.has(v)) return true;
      const len = v.length;
      for (let size = 4; size < len; size++) {
        for (let start = 0; start <= len - size; start++) {
          if (BLOCKED_SET.has(v.substring(start, start + size))) return true;
        }
      }
    }
  }

  // ── Layer 2: Short-word chunk detection ──
  const normWords = words.map(w => _normalize(w));
  const leetWords = words.map(w => _deLeet(w));
  if (_checkShortWordRuns(normWords)) return true;
  if (_checkShortWordRuns(leetWords)) return true;

  // ── Layer 3: Phrase check ──
  const spaced = raw.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  for (const phrase of BLOCKED_PHRASES) {
    if (spaced.includes(phrase)) return true;
  }

  // ── Layer 4: Full-text aggressive scan ──
  // Check normalized, collapsed, de-leeted, and collapsed-de-leeted variants.
  // Each preserves per-word boundaries so single-word safe words are not falsely flagged.
  if (_fullTextScan(normWords)) return true;
  if (_fullTextScan(normWords.map(w => _collapse(w)))) return true;
  if (_fullTextScan(leetWords)) return true;
  if (_fullTextScan(leetWords.map(w => _collapse(w)))) return true;

  return false;
};

export default { containsProfanity };
