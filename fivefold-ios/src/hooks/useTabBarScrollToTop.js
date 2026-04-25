/**
 * useTabBarScrollToTop
 *
 * Drop-in replacement for React Navigation's `useScrollToTop` that works with
 * `@bottom-tabs/react-navigation` (native iOS UIKit tab bar).
 *
 * Why this exists:
 *   The built-in `useScrollToTop` relies on `navigation.isFocused()` returning
 *   `false` when a tab is pressed while inactive — i.e. tabPress must fire
 *   BEFORE focus changes. That's true for the JS bottom-tab navigator, but the
 *   native-tab implementation switches focus synchronously before emitting
 *   tabPress, so isFocused() is already true. Result: the hook scrolls to top
 *   every time the tab is tapped, even on the switch-from-another-tab press.
 *
 * This hook tracks focus state via `focus`/`blur` listeners and only scrolls
 * when the tab was ALREADY focused before the press (i.e. a re-tap).
 */

import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

const getScrollable = (refCurrent) => {
  if (!refCurrent) return null;
  // Animated components expose `getNode()` in older RN versions; direct method
  // access works on newer versions. FlatList exposes scrollToOffset.
  const node = typeof refCurrent.getNode === 'function' ? refCurrent.getNode() : refCurrent;
  return node || null;
};

const useTabBarScrollToTop = (ref) => {
  const navigation = useNavigation();
  const wasFocusedRef = useRef(Boolean(navigation?.isFocused?.()));

  useEffect(() => {
    if (!navigation) return undefined;

    const onFocus = () => { wasFocusedRef.current = true; };
    const onBlur = () => { wasFocusedRef.current = false; };

    const onTabPress = () => {
      // Snapshot the focus state BEFORE the event loop lets the native tab bar
      // update focus. If we were already focused, this is a re-tap → scroll to
      // top. Otherwise the user is switching to this tab and we do nothing.
      const wasFocused = wasFocusedRef.current;
      if (!wasFocused) return;
      requestAnimationFrame(() => {
        const node = getScrollable(ref.current);
        if (!node) return;
        if (typeof node.scrollTo === 'function') {
          node.scrollTo({ y: 0, animated: true });
        } else if (typeof node.scrollToOffset === 'function') {
          node.scrollToOffset({ offset: 0, animated: true });
        } else if (typeof node.scrollToLocation === 'function') {
          try {
            node.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewOffset: 0, animated: true });
          } catch {}
        }
      });
    };

    const unsubFocus = navigation.addListener('focus', onFocus);
    const unsubBlur = navigation.addListener('blur', onBlur);
    const unsubPress = navigation.addListener('tabPress', onTabPress);

    return () => {
      unsubFocus();
      unsubBlur();
      unsubPress();
    };
  }, [navigation, ref]);
};

export default useTabBarScrollToTop;
