// Self-healing Liquid Glass (ported from EyeCandy). The native glass effect
// is created once at mount and never recovers from a bad mount (sub-pixel
// ancestor scale, transform timing); the native module re-runs its setup
// whenever tintColor changes, so this wrapper nudges the tint alpha
// imperceptibly after mount — a healthy panel doesn't visibly change, a dead
// one is rebuilt at full size. Gates on module PRESENCE only (the
// isLiquidGlassSupported flag is unreliable across builds) and falls back to
// BlurView when the module is absent. Passes every other prop through.
import React, { useState, useEffect } from 'react';
import { BlurView } from 'expo-blur';

let LiquidGlassView = null;
try { LiquidGlassView = require('@callstack/liquid-glass').LiquidGlassView; } catch { LiquidGlassView = null; }

const seqFor = (tint) => {
  if (!tint) return ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.015)'];
  const m = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(String(tint));
  if (!m) return [tint, 'rgba(255,255,255,0.011)', tint];
  const a = parseFloat(m[4]);
  const mk = (al) => `rgba(${m[1]},${m[2]},${m[3]},${Math.max(0, Math.min(1, al)).toFixed(3)})`;
  return [tint, mk(a + 0.01), mk(a + 0.005)];
};

const HealingGlass = ({ children, style, effect = 'clear', tintColor, fallbackIntensity = 50, fallbackTint = 'dark', ...rest }) => {
  const seq = seqFor(tintColor);
  const [tint, setTint] = useState(seq[0]);
  useEffect(() => {
    const t1 = setTimeout(() => setTint(seq[1]), 600);
    const t2 = setTimeout(() => setTint(seq[2]), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!LiquidGlassView) {
    return <BlurView intensity={fallbackIntensity} tint={fallbackTint} style={style}>{children}</BlurView>;
  }
  return (
    <LiquidGlassView effect={effect} tintColor={tint} style={style} {...rest}>
      {children}
    </LiquidGlassView>
  );
};

export default HealingGlass;
