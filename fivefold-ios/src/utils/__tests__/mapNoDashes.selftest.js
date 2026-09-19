// The interactive map must never show an em dash, in the data or on screen.
// Run: node src/utils/__tests__/mapNoDashes.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const rawMaps = fs.readFileSync(path.join(root, 'bible-maps.json'), 'utf8');
const maps = JSON.parse(rawMaps);
const component = fs.readFileSync(path.join(root, 'src', 'components', 'InteractiveBibleMaps.js'), 'utf8');

const DASH = /[—–―]/g;

// ── The copy itself ──────────────────────────────────────────────────
const found = [];
const walk = (n, p) => {
  if (typeof n === 'string') { if (DASH.test(n)) found.push(p.join('.')); DASH.lastIndex = 0; return; }
  if (Array.isArray(n)) return n.forEach((v, i) => walk(v, [...p, String(i)]));
  if (n && typeof n === 'object') return Object.entries(n).forEach(([k, v]) => walk(v, [...p, k]));
};
walk(maps, []);
ok(found.length === 0, `no map copy contains a dash${found.length ? ` (${found.length}, e.g. ${found[0]})` : ''}`);
ok(maps.biblicalLocations.length === 88 && maps.biblicalJourneys.length === 15,
  `the rewrite kept every location and journey (${maps.biblicalLocations.length} and ${maps.biblicalJourneys.length})`);
ok(maps.biblicalLocations.every((l) => l.name && l.description && l.coordinate),
  'and every location still has its name, description and position');

// ── The screen ───────────────────────────────────────────────────────
ok(!DASH.test(component), 'the map component itself has none either');
DASH.lastIndex = 0;

// The data is fetched from GitHub and cached on the device for a day, so a
// corrected file does not correct a phone that already has the old one.
ok(/import \{ deDash \} from '\.\.\/utils\/noDashes'/.test(component), 'the screen imports the dash guard');
ok(/\{deDash\(location\.description\)\}/.test(component) && /\{deDash\(location\.significance\)\}/.test(component),
  'and both blocks of POI text pass through it, so a cached copy with dashes still displays clean');
ok(/deDash\(journey\.description\)/.test(component), 'journeys too');

// ── British spellings the rewrite had to preserve ─────────────────────
for (const word of ['judgement', 'civilisation', 'sulphur', 'baptised']) {
  ok(rawMaps.includes(word), `British spelling kept: ${word}`);
}

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll map dash checks passed');
