# System Patterns

## App structure
- Main iOS app is in `fivefold-ios/`.
- Uses screen components under `fivefold-ios/src/screens/` and shared UI under `fivefold-ios/src/components/`.

## State + configuration patterns
- Theme is provided via `ThemeContext` (`useTheme()`), with multiple named themes and an `isDark` flag.
- Language/i18n via `LanguageContext` and locale JSON files.
- Persistent settings and user data stored via `@react-native-async-storage/async-storage` and helper utilities.

## UI patterns
- Heavily modal-driven UI (full-screen and sheet-style modals).
- Glass/blur effects via `expo-blur` and a Liquid Glass abstraction with fallback.
- Gradients via `expo-linear-gradient`.

## Readability pattern (preferred)
When text sits on gradients/glass:
- Add a **dark scrim/backdrop** behind the text block.
- Increase font weight slightly.
- Add subtle text shadow (used sparingly) for edge definition.
- Ensure buttons use a darker fill (not just low-opacity white) when over pastel backgrounds.

