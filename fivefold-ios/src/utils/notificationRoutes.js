// Where a notification tap or widget deep link should land, resolved against
// the app's navigator shape. Pure: no React, no navigation import.
//
// The four tabs (route names BiblePrayer / Todos / Gym / Profile, titled
// Faith / Focus / Fitness / Profile) live inside the root stack's 'Main'
// route. Navigating to a tab by bare name only works once the tab navigator
// has rendered that screen, and it renders nothing until the saved tab
// layout has loaded, and never renders a tab the user hid. So:
//   - tab routes go through the host: navigate('Main', { screen: tab }, { pop: true }),
//     which React Navigation applies as the child's initial route even when
//     the child has not rendered yet. `pop` matters: without it the v7 stack
//     router only reuses Main when Main is already the top screen, so a tap
//     while My Week or a settings sheet is open would PUSH a second Main
//     (a second set of tabs) instead of returning to the existing one;
//   - a hidden tab falls back to 'Main' (whatever tab is visible) instead of
//     an unhandled NAVIGATE;
//   - anything else (MyWeek, Vision, Nutrition, ...) is a root-stack route
//     and navigates by name.
// Consequence, chosen on purpose: a notification tap dismisses whatever
// root-stack screen is open (a running workout keeps going in its mini bar).
export const TAB_ROUTES = ['BiblePrayer', 'Todos', 'Gym', 'Profile'];
export const TAB_HOST = 'Main';

export const resolveNavTarget = (tab, hiddenTabs) => {
  if (!tab || typeof tab !== 'string') return null;
  if (!TAB_ROUTES.includes(tab)) return { route: tab, params: undefined, options: undefined, hidden: false };
  const hidden = new Set(Array.isArray(hiddenTabs) ? hiddenTabs : []);
  hidden.delete('Profile'); // Profile can never be hidden (TabNavigator enforces it)
  if (hidden.has(tab)) return { route: TAB_HOST, params: undefined, options: { pop: true }, hidden: true };
  return { route: TAB_HOST, params: { screen: tab }, options: { pop: true }, hidden: false };
};
