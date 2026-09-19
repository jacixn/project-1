// Notification / widget navigation targets: pure resolver rules, and a sweep
// that every target string in App.js and notificationService is a route that
// exists (a tab, or a root-stack screen in RootNavigator).
// Run: node src/__tests__/notificationRoutes.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('utils/notificationRoutes.js').replace(/^export /gm, '');
const { TAB_ROUTES, TAB_HOST, resolveNavTarget } = new Function(`${src}\nreturn { TAB_ROUTES, TAB_HOST, resolveNavTarget };`)();

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// Pure rules.
const t = resolveNavTarget('BiblePrayer', []);
check(t.route === 'Main' && t.params.screen === 'BiblePrayer' && !t.hidden, 'a tab goes through the Main host as a nested screen');
check(t.options && t.options.pop === true, 'tab targets pop back to the existing Main instead of pushing a second one');
const h = resolveNavTarget('BiblePrayer', ['BiblePrayer']);
check(h.route === 'Main' && h.params === undefined && h.hidden === true && h.options.pop === true, 'a hidden tab falls back to Main with no screen, still popping');
check(resolveNavTarget('MyWeek').options === undefined, 'root-stack routes carry no pop flag');
check(resolveNavTarget('Profile', ['Profile']).params.screen === 'Profile', 'Profile is never treated as hidden');
check(resolveNavTarget('MyWeek', ['BiblePrayer']).route === 'MyWeek' && resolveNavTarget('Vision').route === 'Vision', 'root-stack routes navigate by name');
check(resolveNavTarget(null) === null && resolveNavTarget('') === null && resolveNavTarget(42) === null, 'junk targets resolve to nothing');
check(resolveNavTarget('Todos', undefined).params.screen === 'Todos', 'missing hidden list is fine');

// Wiring sweep.
const app = read('../App.js');
const svc = read('services/notificationService.js');
const nav = read('navigation/RootNavigator.js');
const tabNav = read('navigation/TabNavigator.js');
const rootRoutes = new Set([...nav.matchAll(/name="([A-Za-z]+)"/g)].map((m) => m[1]));
const declaredTabs = [...tabNav.matchAll(/^  (BiblePrayer|Todos|Gym|Profile): \{/gm)].map((m) => m[1]);
check(declaredTabs.length === 4 && declaredTabs.every((n) => TAB_ROUTES.includes(n)), `TAB_ROUTES matches TabNavigator's definitions (${declaredTabs.join(', ')})`);
check(rootRoutes.has(TAB_HOST), 'the tab host route exists in RootNavigator');

const targets = new Set();
for (const m of app.matchAll(/\btab = '([A-Za-z]+)'/g)) targets.add(m[1]);
for (const m of app.matchAll(/pendingNavigationRef\.current = \{ tab: '([A-Za-z]+)' \}/g)) targets.add(m[1]);
for (const m of app.matchAll(/navigateToTarget\('([A-Za-z]+)'/g)) targets.add(m[1]);
for (const m of svc.matchAll(/targetTab = '([A-Za-z]+)'/g)) targets.add(m[1]);
const unknown = [...targets].filter((n) => !TAB_ROUTES.includes(n) && !rootRoutes.has(n));
check(targets.size >= 6, `found ${targets.size} navigation targets to check`);
check(unknown.length === 0, `every notification and widget target is a real route${unknown.length ? ` (unknown: ${unknown.join(', ')})` : ''}`);

// App.js never navigates to a tab by bare name any more, in any quoting or
// optional-chaining spelling, and never through a variable that could hide one.
const navCall = /navigationRef(?:\?\.|\.)current(?:\?\.|\.)navigate\(\s*([^,)]+?)\s*[,)]/g;
const navArgs = [...app.matchAll(navCall)].map((m) => m[1]);
const lit = /^['"]([A-Za-z0-9_]+)['"]$/;
const bareTabs = navArgs.filter((a) => { const m = a.match(lit); return m && TAB_ROUTES.includes(m[1]); });
check(navArgs.length >= 3, `found ${navArgs.length} navigate() calls in App.js`);
check(bareTabs.length === 0, `no bare tab navigate() in App.js in any quoting${bareTabs.length ? ` (${bareTabs.join(', ')})` : ''}`);
const opaque = navArgs.filter((a) => a !== 'target.route' && !lit.test(a));
check(opaque.length === 0, `navigate() first args are literals or target.route${opaque.length ? ` (opaque: ${opaque.join(', ')})` : ''}`);
check(/navigateToTarget\(tab\)/.test(app) && /resolveNavTarget\(tab,\s*config\?\.hidden\)/.test(app), 'notification navigation resolves through the helper with the hidden list, not the whole config');
check(/navigationRef\.current\.navigate\(target\.route,\s*target\.params,\s*target\.options\)/.test(app), 'navigateToTarget passes the nested-screen params and the pop option');
check(/getCachedTabConfig\(\)/.test(app), 'hidden-tab check reads the cached tab layout');
check(!/^preloadTabConfig\(\);/m.test(app), 'no module-load tab layout read (userStorage is uid-scoped and has no user at import time; caching null there would stop the tab navigator loading the real layout)');
check(/config = await userStorage\.get\('tabBarConfig'\)/.test(app), 'hidden-tab check falls back to storage when nothing is cached yet');
check(/const landed = await navigateToTarget\(tab\)/.test(app), 'notification handler awaits the resolver');
check(/export const getCachedTabConfig/.test(tabNav), 'TabNavigator exposes the cached layout');
check(!/[—]/.test(read('utils/notificationRoutes.js')), 'no em dashes');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
