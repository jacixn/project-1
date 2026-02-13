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
- The loading animation is configurable in Customisation (default spinner, Run Hamster, Running Cat). Stored in `fivefold_loading_animation` via userStorage.

## Readability pattern (preferred)
When text sits on gradients/glass:
- Add a **dark scrim/backdrop** behind the text block.
- Increase font weight slightly.
- Add subtle text shadow (used sparingly) for edge definition.
- Ensure buttons use a darker fill (not just low-opacity white) when over pastel backgrounds.

