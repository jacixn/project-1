/**
 * Premium Background Images for Share Verse Card
 *
 * 68 curated images — requires 1 referral to unlock.
 * Images are hosted on GitHub and downloaded/cached on demand.
 * NOT bundled with the app binary.
 */

const PREMIUM_BACKGROUNDS = [
  { id: 'pb_42', filename: 'bg_8847.jpg', isLight: false },
  { id: 'pb_17', filename: 'bg_8822.jpg', isLight: false },
  { id: 'pb_55', filename: 'bg_8860.jpg', isLight: false },
  { id: 'pb_08', filename: 'bg_8781.jpg', isLight: false },
  { id: 'pb_30', filename: 'bg_8835.jpg', isLight: true },
  { id: 'pb_61', filename: 'bg_8866.jpg', isLight: false },
  { id: 'pb_03', filename: 'bg_8776.jpg', isLight: true },
  { id: 'pb_38', filename: 'bg_8843.jpg', isLight: false },
  { id: 'pb_22', filename: 'bg_8827.jpg', isLight: false },
  { id: 'pb_49', filename: 'bg_8854.jpg', isLight: false },
  { id: 'pb_11', filename: 'bg_8784.jpg', isLight: false },
  { id: 'pb_64', filename: 'bg_8869.jpg', isLight: false },
  { id: 'pb_33', filename: 'bg_8838.jpg', isLight: false },
  { id: 'pb_06', filename: 'bg_8779.jpg', isLight: false },
  { id: 'pb_45', filename: 'bg_8850.jpg', isLight: false },
  { id: 'pb_19', filename: 'bg_8824.jpg', isLight: false },
  { id: 'pb_57', filename: 'bg_8862.jpg', isLight: false },
  { id: 'pb_01', filename: 'bg_8774.jpg', isLight: true },
  { id: 'pb_36', filename: 'bg_8841.jpg', isLight: false },
  { id: 'pb_52', filename: 'bg_8857.jpg', isLight: false },
  { id: 'pb_14', filename: 'bg_8787.jpg', isLight: false },
  { id: 'pb_68', filename: 'bg_8873.jpg', isLight: false },
  { id: 'pb_26', filename: 'bg_8831.jpg', isLight: false },
  { id: 'pb_40', filename: 'bg_8845.jpg', isLight: false },
  { id: 'pb_09', filename: 'bg_8782.jpg', isLight: false },
  { id: 'pb_59', filename: 'bg_8864.jpg', isLight: false },
  { id: 'pb_24', filename: 'bg_8829.jpg', isLight: false },
  { id: 'pb_47', filename: 'bg_8852.jpg', isLight: false },
  { id: 'pb_15', filename: 'bg_8820.jpg', isLight: false },
  { id: 'pb_37', filename: 'bg_8842.jpg', isLight: true },
  { id: 'pb_54', filename: 'bg_8859.jpg', isLight: false },
  { id: 'pb_28', filename: 'bg_8833.jpg', isLight: false },
  { id: 'pb_66', filename: 'bg_8871.jpg', isLight: false },
  { id: 'pb_04', filename: 'bg_8777.jpg', isLight: true },
  { id: 'pb_43', filename: 'bg_8848.jpg', isLight: false },
  { id: 'pb_20', filename: 'bg_8825.jpg', isLight: false },
  { id: 'pb_62', filename: 'bg_8867.jpg', isLight: false },
  { id: 'pb_10', filename: 'bg_8783.jpg', isLight: false },
  { id: 'pb_35', filename: 'bg_8840.jpg', isLight: false },
  { id: 'pb_50', filename: 'bg_8855.jpg', isLight: false },
  { id: 'pb_16', filename: 'bg_8821.jpg', isLight: false },
  { id: 'pb_58', filename: 'bg_8863.jpg', isLight: false },
  { id: 'pb_31', filename: 'bg_8836.jpg', isLight: false },
  { id: 'pb_07', filename: 'bg_8780.jpg', isLight: false },
  { id: 'pb_46', filename: 'bg_8851.jpg', isLight: false },
  { id: 'pb_23', filename: 'bg_8828.jpg', isLight: false },
  { id: 'pb_63', filename: 'bg_8868.jpg', isLight: false },
  { id: 'pb_39', filename: 'bg_8844.jpg', isLight: false },
  { id: 'pb_12', filename: 'bg_8785.jpg', isLight: true },
  { id: 'pb_56', filename: 'bg_8861.jpg', isLight: false },
  { id: 'pb_27', filename: 'bg_8832.jpg', isLight: false },
  { id: 'pb_44', filename: 'bg_8849.jpg', isLight: false },
  { id: 'pb_18', filename: 'bg_8823.jpg', isLight: false },
  { id: 'pb_65', filename: 'bg_8870.jpg', isLight: false },
  { id: 'pb_02', filename: 'bg_8775.jpg', isLight: true },
  { id: 'pb_34', filename: 'bg_8839.jpg', isLight: false },
  { id: 'pb_51', filename: 'bg_8856.jpg', isLight: false },
  { id: 'pb_13', filename: 'bg_8786.jpg', isLight: false },
  { id: 'pb_60', filename: 'bg_8865.jpg', isLight: false },
  { id: 'pb_41', filename: 'bg_8846.jpg', isLight: false },
  { id: 'pb_25', filename: 'bg_8830.jpg', isLight: false },
  { id: 'pb_48', filename: 'bg_8853.jpg', isLight: false },
  { id: 'pb_05', filename: 'bg_8778.jpg', isLight: true },
  { id: 'pb_67', filename: 'bg_8872.jpg', isLight: false },
  { id: 'pb_32', filename: 'bg_8837.jpg', isLight: false },
  { id: 'pb_53', filename: 'bg_8858.jpg', isLight: false },
  { id: 'pb_21', filename: 'bg_8826.jpg', isLight: false },
  { id: 'pb_29', filename: 'bg_8834.jpg', isLight: false },
];

/** Referrals required to unlock premium backgrounds */
export const PREMIUM_BG_REFERRAL_REQUIRED = 1;

/** Default text color presets for the color picker */
export const TEXT_COLOR_PRESETS = [
  { id: 'white', color: '#FFFFFF', label: 'White' },
  { id: 'cream', color: '#FFF8E7', label: 'Cream' },
  { id: 'gold', color: '#FFD700', label: 'Gold' },
  { id: 'softPink', color: '#FFB6C1', label: 'Pink' },
  { id: 'lavender', color: '#E6E6FA', label: 'Lavender' },
  { id: 'mint', color: '#98FB98', label: 'Mint' },
  { id: 'skyBlue', color: '#87CEEB', label: 'Sky' },
  { id: 'peach', color: '#FFDAB9', label: 'Peach' },
  { id: 'black', color: '#1A1A1A', label: 'Black' },
  { id: 'charcoal', color: '#36454F', label: 'Charcoal' },
  { id: 'navy', color: '#1B2A4A', label: 'Navy' },
  { id: 'forest', color: '#2D5A27', label: 'Forest' },
];

export default PREMIUM_BACKGROUNDS;
