// How much clearance a screen's header needs at the top.
//
// My Week is pushed, not presented, so it is full screen when opened from a
// tab header and it needs the notch cleared itself. But the same screen is
// also reached from inside a sheet, and then it sits below the status bar
// already, with the previous screen visible above it. The safe-area inset
// reports the full window notch either way, so in the second case the
// clearance gets counted twice and leaves a dead band above the title as
// tall as the notch.
//
// Nothing in the navigator says which case it is, so the screen measures
// where it actually sits and asks this.

/**
 * @param insetTop the device's top safe-area inset
 * @param containerTopInWindow the screen's own top edge, measured against the
 *        window; null until it has been measured
 * @param base the gap wanted above the header in both cases
 */
export const headerTopPadding = (insetTop, containerTopInWindow, base = 8) => {
  const inset = Number(insetTop) || 0;
  // Anything already below the top of the window has had the notch cleared
  // for it by whatever is above, so it only wants the plain gap.
  if (typeof containerTopInWindow === 'number' && containerTopInWindow > 1) return base;
  // Not measured yet, or genuinely at the top: clear the notch. Erring this
  // way costs a blank strip for one frame; erring the other way puts the
  // title under the clock.
  return inset + base;
};
