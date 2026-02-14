# System Patterns

## App structure
- Main iOS app is in `fivefold-ios/`.
- Uses screen components under `fivefold-ios/src/screens/` and shared UI under `fivefold-ios/src/components/`.

## Navigation
- **Bottom tab bar uses the NATIVE iOS tab bar** via `@bottom-tabs/react-navigation` (`createNativeBottomTabNavigator`).
- **NEVER use `LiquidGlassTabBar` or `PerfectTabBar`** — these are deprecated custom tab bar components that must not be used. Always use the native bottom tabs navigator in `TabNavigator.js`.
- Profile tab icon shows the user's profile picture via `{ uri: profilePicture }`, falling back to `{ sfSymbol: 'person.fill' }` when no picture is set.

## State + configuration patterns
- Theme is provided via `ThemeContext` (`useTheme()`), with multiple named themes and an `isDark` flag.
- Language/i18n via `LanguageContext` and locale JSON files.
- Persistent settings and user data stored via UID-scoped `userStorage` wrapper (never raw AsyncStorage for user-specific data).

## UI patterns
- Heavily modal-driven UI (full-screen and sheet-style modals).
- Glass/blur effects via `expo-blur` and a Liquid Glass abstraction with fallback.
- Gradients via `expo-linear-gradient`.

## Loading Animations (CRITICAL — use user's selected animation everywhere)
- The user can select a loading animation in Customisation: **Default** (spinner), **Running Cat**, **Run Hamster**, or **Among Us**. Stored in `fivefold_loading_animation` via `userStorage`. Gated by referral count (`LOADING_ANIM_GATES = { default: null, cat: 1, hamster: 3, amongus: 5 }`).
- **EVERY full-screen or section loading state MUST use `<CustomLoadingIndicator />`** (from `src/components/CustomLoadingIndicator.js`) instead of a raw `<ActivityIndicator />`. This component auto-reads the user's selected animation and validates referral gates.
  - For screens that already track `selectedLoadingAnim` state, pass it: `<CustomLoadingIndicator color={theme.primary} selectedAnim={selectedLoadingAnim} />`
  - For screens that don't, just use: `<CustomLoadingIndicator color={theme.primary} />` — it will fetch the preference itself.
- **Exceptions** (keep as `<ActivityIndicator size="small" />`): inline button spinners (send, accept, decline, verify), username availability checks, sync status indicators, and other small contextual spinners.
- Bible-related components (BibleFastFacts, ThematicGuides, KeyVerses, InteractiveBibleMaps, BibleTimeline) use `<SimplePercentageLoader />` which already reads the user's animation preference internally.
- **NEVER add a new loading state with a raw `<ActivityIndicator size="large" />`** — always use `CustomLoadingIndicator` or `SimplePercentageLoader`.

## Pull-to-Refresh (CRITICAL — no native RefreshControl)
- **NEVER use `<RefreshControl>`** on the main Profile tab ScrollView. The native iOS `UIRefreshControl` renders a spinner that **cannot be fully hidden** — even with `tintColor="transparent"`, it still shows a visible spinner on many iOS versions.
- Instead, detect the pull gesture manually using `onScrollEndDrag`:
  ```jsx
  onScrollEndDrag={(e) => {
    if (e.nativeEvent.contentOffset.y < -70 && !refreshing) {
      onRefresh();
    }
  }}
  ```
- Use `bounces={true}` and `alwaysBounceVertical={true}` for the native rubber-band feel.
- Show a **custom absolutely-positioned indicator** (Lottie or ActivityIndicator in a frosted glass bubble) controlled by the `refreshing` state, animated with spring scale + opacity.
- The loading animation is configurable in Customisation (default spinner, Run Hamster, Running Cat, Among Us). Stored in `fivefold_loading_animation` via userStorage.

## Readability pattern (preferred)
When text sits on gradients/glass:
- Add a **dark scrim/backdrop** behind the text block.
- Increase font weight slightly.
- Add subtle text shadow (used sparingly) for edge definition.
- Ensure buttons use a darker fill (not just low-opacity white) when over pastel backgrounds.

