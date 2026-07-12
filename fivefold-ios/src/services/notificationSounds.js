/**
 * Notification sound library.
 *
 * iOS can only play notification sounds from the app bundle or from
 * Library/Sounds — the system ringtone library is not available to
 * third-party apps, and neither expo-file-system API can write to
 * Library/Sounds (both are scoped to Documents/Caches; verified on device).
 * So the chimes are embedded as Xcode RESOURCES (see project.pbxproj — the
 * five wav PBXFileReference/PBXBuildFile entries pointing at assets/sounds/),
 * and notifications reference them by bare filename. Adding a new sound =
 * drop the wav in assets/sounds, add it here AND to the Xcode project, then
 * rebuild.
 *
 * The `module` requires are used by the settings screen to PREVIEW a sound
 * through expo-av; delivery uses the bundled copy.
 *
 * The user's pick is stored as notificationSettings.soundName ('default' or a
 * filename from this catalog); scheduleNotif resolves every notification's
 * sound through resolveSoundName().
 */

export const SOUND_OPTIONS = [
  { id: 'default', label: 'Default', file: null, module: null },
  { id: 'biblely_bell.wav', label: 'Bell', file: 'biblely_bell.wav', module: require('../../assets/sounds/biblely_bell.wav') },
  { id: 'biblely_chime.wav', label: 'Chime', file: 'biblely_chime.wav', module: require('../../assets/sounds/biblely_chime.wav') },
  { id: 'biblely_ding.wav', label: 'Ding', file: 'biblely_ding.wav', module: require('../../assets/sounds/biblely_ding.wav') },
  { id: 'biblely_gong.wav', label: 'Gong', file: 'biblely_gong.wav', module: require('../../assets/sounds/biblely_gong.wav') },
  { id: 'biblely_pulse.wav', label: 'Pulse', file: 'biblely_pulse.wav', module: require('../../assets/sounds/biblely_pulse.wav') },
];

export const isValidSoundName = (name) =>
  SOUND_OPTIONS.some((o) => o.id === name);

// The sounds ship inside the app bundle (Xcode resources), so there is
// nothing to install at runtime. Kept as a no-op so call sites don't care
// which delivery mechanism is in use.
export const ensureSoundsInstalled = () => Promise.resolve(true);

// Map the user's stored pick to what expo-notifications' `sound` field needs:
// 'default' stays 'default'; a catalog file is referenced by bare filename.
// Unknown values (removed sounds, corrupt settings) fall back to 'default'.
export const resolveSoundName = (soundName) => {
  if (!soundName || soundName === 'default') return 'default';
  return isValidSoundName(soundName) ? soundName : 'default';
};

export default { SOUND_OPTIONS, ensureSoundsInstalled, resolveSoundName, isValidSoundName };
