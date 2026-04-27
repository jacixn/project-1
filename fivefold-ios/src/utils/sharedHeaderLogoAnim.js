import { Animated, AppState } from 'react-native';

// Shared singleton Animated.Values so all tab header logos animate in lock-step.
// Switching tabs does not restart the animation — these values keep ticking
// from app start. Native driver is used so animations survive JS thread blocks
// (Firebase sync, iCloud sync, notification scheduling, etc.).
export const logoSpin = new Animated.Value(0);
export const logoPulse = new Animated.Value(1);
export const logoFloat = new Animated.Value(0);

// Track running loop handles so we can stop + restart on app resume.
let runningLoops = [];

const stopAllLoops = () => {
  runningLoops.forEach((loop) => {
    try { loop.stop(); } catch (e) {}
  });
  runningLoops = [];
};

const startAllLoops = () => {
  stopAllLoops();

  // Reset values to a known starting state so iterations are seamless.
  logoSpin.setValue(0);
  logoPulse.setValue(1);
  logoFloat.setValue(0);

  // Continuous spin: 8s per rotation. resetBeforeIteration avoids the
  // duration-0 reset hack which was racy on the JS driver.
  const spin = Animated.loop(
    Animated.timing(logoSpin, {
      toValue: 1,
      duration: 8000,
      useNativeDriver: true,
    }),
    { resetBeforeIteration: true }
  );
  spin.start();
  runningLoops.push(spin);

  // Pulse: 1 → 1.15 → 1 over 3s
  const pulse = Animated.loop(
    Animated.sequence([
      Animated.timing(logoPulse, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
      Animated.timing(logoPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])
  );
  pulse.start();
  runningLoops.push(pulse);

  // Float: 0 → 1 → 0 over 4s (translateY interpolated to -6..0 in JSX)
  const float = Animated.loop(
    Animated.sequence([
      Animated.timing(logoFloat, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(logoFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])
  );
  float.start();
  runningLoops.push(float);
};

let installed = false;

export function startSharedHeaderLogoAnim() {
  if (installed) {
    // Already installed — re-arm the loops in case anything went stale
    // (defensive, e.g. if called from a tab mount after a long block).
    startAllLoops();
    return;
  }
  installed = true;

  startAllLoops();

  // Restart loops every time app returns to foreground. iOS halts JS execution
  // when the app is backgrounded; on resume the loop's internal state is stale
  // and won't tick on its own.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      startAllLoops();
    }
  });
}
