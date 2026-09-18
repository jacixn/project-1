/**
 * Single source of truth for admin access.
 *
 * Admin accounts see the analytics/admin screens AND must pass an extra
 * owner passphrase step at sign-in (after the password and after 2FA, if the
 * account has 2FA). Someone who steals the password and the 2FA code still
 * cannot get into these accounts without the passphrase.
 *
 * The passphrase is stored here only as a SHA-256 hash. The plain text is
 * never written anywhere in the repo.
 */
import { sha256Hex } from '../utils/sha256';

export const ADMIN_EMAILS = ['biblelyios@gmail.com', 'antwijason55@gmail.com'];

export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.includes(String(email).trim().toLowerCase());

const ADMIN_PASSPHRASE_SHA256 = '7c832ad9765b31561e6833e0df62f3011ff3f253a9f8918d7252434672ee2787';

// Case-sensitive; surrounding whitespace is ignored.
export const verifyAdminPassphrase = (input) =>
  sha256Hex(String(input ?? '').trim()) === ADMIN_PASSPHRASE_SHA256;
