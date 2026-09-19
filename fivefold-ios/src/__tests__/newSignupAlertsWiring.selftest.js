// Only the owner accounts get told about new sign-ups, and only they can see
// the setting. Run: node src/__tests__/newSignupAlertsWiring.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readRoot = (p) => fs.readFileSync(path.join(root, '..', p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const svc = read('services/newSignupAlerts.js');
const ui = read('components/NotificationSettings.js');
const app = readRoot('App.js');
const admin = read('config/admin.js');

// ── Who it is for ────────────────────────────────────────────────────
ok(/export const ADMIN_EMAILS = \['biblelyios@gmail\.com', 'antwijason55@gmail\.com'\]/.test(admin),
  'the owner list is the existing one, not a second copy');
ok(/import \{ isAdminEmail \} from '\.\.\/config\/admin'/.test(svc)
  && /if \(!canSeeSignupAlerts\(email\)\) return/.test(svc),
  'the service refuses before it reads anything, so no ordinary account queries the user list');
ok(svc.indexOf('canSeeSignupAlerts(email)') < svc.indexOf('getDocs('),
  'and that check comes first, not after the read');
ok(/const isOwner = isAdminEmail\(user\?\.email\)/.test(ui) && /\{isOwner && \(/.test(ui),
  'only an owner is shown the setting');

// ── The setting ──────────────────────────────────────────────────────
ok(/newSignupAlerts: true/.test(ui), 'it is on by default for the accounts that have it');
ok(/settingKey="newSignupAlerts"/.test(ui), 'and it is a normal toggle, stored with the rest');
ok(/s\?\.\[SETTING_KEY\] !== false/.test(svc), 'turning it off stops the check');

// ── Not announcing the world on first run ────────────────────────────
ok(/if \(since == null\)/.test(svc) && /first look/.test(svc),
  'the first look records where we are and announces nobody');
ok(/writeLastSeen\(mark\)/.test(svc), 'and the mark is saved so nobody is announced twice');

// ── Cost ─────────────────────────────────────────────────────────────
ok(/orderBy\('createdAt', 'desc'\), limit\(FETCH_LIMIT\)/.test(svc),
  'it reads the newest few accounts, not the whole collection');
ok(/MIN_GAP_MS/.test(svc) && /checked recently/.test(svc), 'and not more than once every few minutes');

// ── When it runs ─────────────────────────────────────────────────────
ok(/checkForNewSignups\(email\)/.test(app) && /AppState\.addEventListener\('change'/.test(app),
  'it runs at sign-in and whenever the app comes back to the foreground');
ok(/type: 'admin_new_signup'/.test(svc), 'the notification is tagged, so it can be routed or filtered later');

// ── House style ──────────────────────────────────────────────────────
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(svc + read('utils/newSignups.js')), 'no emojis');
ok(!/—/.test(svc + read('utils/newSignups.js')), 'no em dashes');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll new-signup wiring checks passed');
