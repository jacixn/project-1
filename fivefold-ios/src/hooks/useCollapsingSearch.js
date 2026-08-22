// Collapsing search bar driven entirely on the UI thread.
//
// The old pattern ran onScroll on the JS thread, decided the scroll direction
// there, then ran an Animated.timing with useNativeDriver:false that animated
// the HEIGHT of the search bar AND of a spacer inside the scroll content. Every
// frame of that 250 ms tween re-laid-out the list under the finger, and the
// whole thing stalled whenever JS was busy. That is the lag.
//
// This hook keeps direction detection and the tween in a reanimated worklet,
// animates only the header's search wrapper (height + opacity, one small
// subtree), and leaves the list's top spacer FIXED at the expanded height so
// the content never moves on its own.
//
// Usage:
//   const { onScroll, searchStyle } = useCollapsingSearch({ height: 58 });
//   <Reanimated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
//   <Reanimated.View style={[{ overflow: 'hidden' }, searchStyle]}> ...search bar... </Reanimated.View>
import { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export const SEARCH_BAR_H = 58;
const THRESHOLD = 10;
const DURATION = 220;

export const useCollapsingSearch = ({ height = SEARCH_BAR_H } = {}) => {
  const progress = useSharedValue(1); // 1 = open, 0 = collapsed
  const lastY = useSharedValue(0);
  const open = useSharedValue(1);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      if (y <= 0) {
        // At the very top the bar is always shown (bounce included).
        if (open.value !== 1) { open.value = 1; progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }); }
        lastY.value = 0;
        return;
      }
      const dy = y - lastY.value;
      if (Math.abs(dy) < THRESHOLD) return;
      const next = dy > 0 ? 0 : 1;
      if (next !== open.value) {
        open.value = next;
        progress.value = withTiming(next, { duration: DURATION, easing: Easing.out(Easing.cubic) });
      }
      lastY.value = y;
    },
  });

  const searchStyle = useAnimatedStyle(() => ({
    height: progress.value * height,
    opacity: progress.value,
  }));

  const reset = () => { progress.value = 1; open.value = 1; lastY.value = 0; };

  return { onScroll, searchStyle, progress, reset };
};

export default useCollapsingSearch;
