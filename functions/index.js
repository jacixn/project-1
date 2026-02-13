/**
 * Cloud Functions for Biblely
 *
 * sendVerificationCode – generates a 6-digit OTP, stores its SHA-256
 *   hash in Firestore, and emails the code via Resend.
 *
 * verifyEmailCode – checks the user-supplied code against the stored
 *   hash, and on success marks the account as verified in both
 *   Firebase Auth and the Firestore users collection.
 *
 * sendPasswordResetCode – generates a 6-digit OTP for password reset
 *   (unauthenticated), stores hash in Firestore, emails via Resend.
 *
 * resetPasswordWithCode – verifies the OTP and resets the user's
 *   password server-side via Firebase Admin SDK.
 *
 * send2FASetupCode – (authenticated) sends a 6-digit code to confirm
 *   enabling two-factor authentication.
 *
 * confirm2FASetup – (authenticated) verifies the setup code and sets
 *   twoFactorEnabled: true on the user's Firestore doc.
 *
 * disable2FA – (authenticated) sets twoFactorEnabled: false.
 *
 * send2FALoginCode – (authenticated) sends a 2FA code during login
 *   for users with 2FA enabled.
 *
 * verify2FALoginCode – (unauthenticated) verifies the 2FA login code.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

initializeApp();
const db = getFirestore();
const authAdmin = getAuth();

// ─── Resend setup ────────────────────────────────────────────────
// API key is read from functions/.env  (RESEND_API_KEY=re_xxxx)
// Deploy with:  firebase deploy --only functions
let resend = null;

function getResend() {
  if (resend) return resend;
  const { Resend } = require('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Email service not configured');
  }
  resend = new Resend(apiKey);
  return resend;
}

// ─── Helpers ─────────────────────────────────────────────────────

function generateCode() {
  // Cryptographically random 6-digit code (100000–999999)
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 900000 + 100000;
  return String(num);
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function buildEmailHTML(code, displayName) {
  const name = displayName || 'there';
  // Minimal transactional HTML — avoids Gmail Promotions/Spam classification.
  // High text-to-HTML ratio, no images, no gradients, no marketing copy.
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
  <p>Hey ${name},</p>
  <p>Your Biblely verification code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;margin:24px 0;">${code}</p>
  <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  <p style="color:#999;font-size:13px;margin-top:24px;">If you didn't create a Biblely account, ignore this email.</p>
</body></html>`;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.length <= 2
    ? local + '***@' + domain
    : local[0] + '***' + local[local.length - 1] + '@' + domain;
  return masked;
}

function buildPasswordResetHTML(code, displayName) {
  const name = displayName || 'there';
  // Minimal transactional HTML — avoids Gmail Promotions/Spam classification.
  // High text-to-HTML ratio, no images, no gradients, no marketing copy.
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
  <p>Hey ${name},</p>
  <p>Your Biblely password reset code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;margin:24px 0;">${code}</p>
  <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  <p style="color:#999;font-size:13px;margin-top:24px;">If you didn't request this, ignore this email. Your password will not change.</p>
</body></html>`;
}

// ─── sendVerificationCode ────────────────────────────────────────

exports.sendVerificationCode = onCall({ maxInstances: 10 }, async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;

  if (!email) {
    throw new HttpsError('failed-precondition', 'No email address on this account.');
  }

  // Rate limit: one code per 60 seconds
  const codeRef = db.collection('verificationCodes').doc(uid);
  const existing = await codeRef.get();

  if (existing.exists) {
    const data = existing.data();
    const lastSent = data.sentAt?.toMillis?.() || 0;
    const elapsed = Date.now() - lastSent;
    if (elapsed < 60000) {
      const wait = Math.ceil((60000 - elapsed) / 1000);
      throw new HttpsError(
        'resource-exhausted',
        `Please wait ${wait} seconds before requesting another code.`
      );
    }
  }

  // Generate + hash
  const code = generateCode();
  const hash = hashCode(code);

  // Store in Firestore
  await codeRef.set({
    codeHash: hash,
    email: email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0,
    sentAt: FieldValue.serverTimestamp(),
  });

  // Get display name for the email
  let displayName = 'there';
  try {
    const userRecord = await authAdmin.getUser(uid);
    displayName = userRecord.displayName || 'there';
  } catch (_) {
    // ignore
  }

  // Send email via Resend
  try {
    const r = getResend();
    await r.emails.send({
      from: 'Biblely <noreply@biblely.uk>',
      reply_to: 'noreply@biblely.uk',
      to: [email],
      subject: `${code} is your Biblely verification code`,
      html: buildEmailHTML(code, displayName),
      text: `Hey ${displayName || 'there'},\n\nYour Biblely verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you didn't create a Biblely account, ignore this email.`,
    });
  } catch (emailError) {
    console.error('[sendVerificationCode] Email send failed:', emailError);
    throw new HttpsError('internal', 'Failed to send verification email. Please try again.');
  }

  // Return masked email for display
  return { success: true, maskedEmail: maskEmail(email) };
});

// ─── verifyEmailCode ─────────────────────────────────────────────

exports.verifyEmailCode = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;
  const code = String(request.data?.code || '').trim();

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid 6-digit code.');
  }

  const codeRef = db.collection('verificationCodes').doc(uid);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'No verification code found. Please request a new one.');
  }

  const data = codeDoc.data();

  // Check expiry
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (Date.now() > expiresAt) {
    await codeRef.delete();
    throw new HttpsError('deadline-exceeded', 'This code has expired. Please request a new one.');
  }

  // Check attempts
  if ((data.attempts || 0) >= 5) {
    await codeRef.delete();
    throw new HttpsError(
      'resource-exhausted',
      'Too many incorrect attempts. Please request a new code.'
    );
  }

  // Increment attempts
  await codeRef.update({ attempts: FieldValue.increment(1) });

  // Verify hash
  const inputHash = hashCode(code);
  if (inputHash !== data.codeHash) {
    const remaining = 4 - (data.attempts || 0);
    throw new HttpsError(
      'permission-denied',
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Please request a new one.'
    );
  }

  // Code is correct — mark email as verified
  try {
    // Update Firebase Auth (server-side, authoritative)
    await authAdmin.updateUser(uid, { emailVerified: true });

    // Update Firestore users collection
    await db.collection('users').doc(uid).set(
      { emailVerified: true },
      { merge: true }
    );

    // Clean up the verification code document
    await codeRef.delete();
  } catch (updateError) {
    console.error('[verifyEmailCode] Failed to update verification status:', updateError);
    throw new HttpsError('internal', 'Verification succeeded but status update failed. Please try again.');
  }

  return { success: true, emailVerified: true };
});

// ─── sendPasswordResetCode ───────────────────────────────────────
// Unauthenticated — user has forgotten their password.
// Generates a 6-digit OTP, stores its hash, and emails it via Resend.

exports.sendPasswordResetCode = onCall({ maxInstances: 10 }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  console.log('[sendPasswordResetCode] Called for email:', maskEmail(email));

  if (!email || !email.includes('@')) {
    console.log('[sendPasswordResetCode] Invalid email rejected');
    throw new HttpsError('invalid-argument', 'Please provide a valid email address.');
  }

  // Look up the user (don't reveal if they exist — prevent enumeration)
  let userRecord;
  try {
    userRecord = await authAdmin.getUserByEmail(email);
    console.log('[sendPasswordResetCode] User found, uid:', userRecord.uid);
  } catch (_) {
    // User doesn't exist — still return success so attackers can't probe emails
    console.log('[sendPasswordResetCode] User NOT found — returning silent success');
    return { success: true, maskedEmail: maskEmail(email) };
  }

  // Rate limit: one code per 60 seconds
  const emailKey = hashCode(email);
  const codeRef = db.collection('passwordResetCodes').doc(emailKey);
  const existing = await codeRef.get();

  if (existing.exists) {
    const data = existing.data();
    const lastSent = data.sentAt?.toMillis?.() || 0;
    const elapsed = Date.now() - lastSent;
    if (elapsed < 60000) {
      const wait = Math.ceil((60000 - elapsed) / 1000);
      console.log('[sendPasswordResetCode] Rate limited — wait', wait, 'seconds');
      throw new HttpsError(
        'resource-exhausted',
        `Please wait ${wait} seconds before requesting another code.`
      );
    }
  }

  // Generate + hash
  const code = generateCode();
  const hash = hashCode(code);

  // Store in Firestore
  await codeRef.set({
    codeHash: hash,
    uid: userRecord.uid,
    email: email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0,
    sentAt: FieldValue.serverTimestamp(),
  });
  console.log('[sendPasswordResetCode] Code stored in Firestore');

  // Send email via Resend
  const displayName = userRecord.displayName || 'there';

  try {
    const r = getResend();
    const sendResult = await r.emails.send({
      from: 'Biblely <noreply@biblely.uk>',
      reply_to: 'noreply@biblely.uk',
      to: [email],
      subject: `${code} is your Biblely password reset code`,
      html: buildPasswordResetHTML(code, displayName),
      text: `Hey ${displayName || 'there'},\n\nYour Biblely password reset code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you didn't request this, ignore this email. Your password will not change.`,
    });
    console.log('[sendPasswordResetCode] Email sent via Resend, id:', sendResult?.data?.id || sendResult?.id || 'unknown');
  } catch (emailError) {
    console.error('[sendPasswordResetCode] Email send failed:', emailError);
    throw new HttpsError('internal', 'Failed to send reset email. Please try again.');
  }

  console.log('[sendPasswordResetCode] Success — code sent to', maskEmail(email));
  return { success: true, maskedEmail: maskEmail(email) };
});

// ─── resetPasswordWithCode ───────────────────────────────────────
// Verifies the 6-digit code and resets the password in one step.
// Unauthenticated — user provides email, code, and new password.

exports.resetPasswordWithCode = onCall({ maxInstances: 10 }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const code = String(request.data?.code || '').trim();
  const newPassword = String(request.data?.newPassword || '');

  // Validate inputs
  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address.');
  }
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid 6-digit code.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  // Look up stored code
  const emailKey = hashCode(email);
  const codeRef = db.collection('passwordResetCodes').doc(emailKey);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'No reset code found. Please request a new one.');
  }

  const data = codeDoc.data();

  // Check expiry
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (Date.now() > expiresAt) {
    await codeRef.delete();
    throw new HttpsError('deadline-exceeded', 'This code has expired. Please request a new one.');
  }

  // Check attempts (max 5)
  if ((data.attempts || 0) >= 5) {
    await codeRef.delete();
    throw new HttpsError(
      'resource-exhausted',
      'Too many incorrect attempts. Please request a new code.'
    );
  }

  // Increment attempts
  await codeRef.update({ attempts: FieldValue.increment(1) });

  // Verify hash
  const inputHash = hashCode(code);
  if (inputHash !== data.codeHash) {
    const remaining = 4 - (data.attempts || 0);
    throw new HttpsError(
      'permission-denied',
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Please request a new one.'
    );
  }

  // Code is correct — reset the password
  try {
    await authAdmin.updateUser(data.uid, { password: newPassword });
    await codeRef.delete();
  } catch (updateError) {
    console.error('[resetPasswordWithCode] Failed to update password:', updateError);
    throw new HttpsError('internal', 'Failed to reset password. Please try again.');
  }

  return { success: true };
});

// ─── 2FA Email Templates ─────────────────────────────────────────

function build2FALoginHTML(code, displayName) {
  const name = displayName || 'there';
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
  <p>Hey ${name},</p>
  <p>Your Biblely login verification code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;margin:24px 0;">${code}</p>
  <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  <p style="color:#999;font-size:13px;margin-top:24px;">If you didn't try to sign in to Biblely, someone may be trying to access your account. Consider changing your password.</p>
</body></html>`;
}

function build2FASetupHTML(code, displayName) {
  const name = displayName || 'there';
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
  <p>Hey ${name},</p>
  <p>Your code to enable two-factor authentication is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;margin:24px 0;">${code}</p>
  <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  <p style="color:#999;font-size:13px;margin-top:24px;">If you didn't request this, ignore this email.</p>
</body></html>`;
}

// ─── send2FASetupCode ─────────────────────────────────────────────
// Authenticated — sends a code to confirm enabling 2FA.
// Requires email to be verified first.

exports.send2FASetupCode = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;

  if (!email) {
    throw new HttpsError('failed-precondition', 'No email address on this account.');
  }

  // Must have verified email
  if (!request.auth.token.email_verified) {
    throw new HttpsError('failed-precondition', 'You must verify your email before enabling two-factor authentication.');
  }

  // Check if already enabled
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data().twoFactorEnabled) {
    throw new HttpsError('already-exists', 'Two-factor authentication is already enabled.');
  }

  // Rate limit: one code per 60 seconds
  const codeRef = db.collection('twoFactorSetupCodes').doc(uid);
  const existing = await codeRef.get();

  if (existing.exists) {
    const data = existing.data();
    const lastSent = data.sentAt?.toMillis?.() || 0;
    const elapsed = Date.now() - lastSent;
    if (elapsed < 60000) {
      const wait = Math.ceil((60000 - elapsed) / 1000);
      throw new HttpsError(
        'resource-exhausted',
        `Please wait ${wait} seconds before requesting another code.`
      );
    }
  }

  // Generate + hash
  const code = generateCode();
  const hash = hashCode(code);

  // Store in Firestore
  await codeRef.set({
    codeHash: hash,
    email: email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    sentAt: FieldValue.serverTimestamp(),
  });

  // Get display name
  let displayName = 'there';
  try {
    const userRecord = await authAdmin.getUser(uid);
    displayName = userRecord.displayName || 'there';
  } catch (_) {}

  // Send email
  try {
    const r = getResend();
    await r.emails.send({
      from: 'Biblely <noreply@biblely.uk>',
      reply_to: 'noreply@biblely.uk',
      to: [email],
      subject: `${code} is your Biblely two-factor setup code`,
      html: build2FASetupHTML(code, displayName),
      text: `Hey ${displayName},\n\nYour code to enable two-factor authentication is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you didn't request this, ignore this email.`,
    });
  } catch (emailError) {
    console.error('[send2FASetupCode] Email send failed:', emailError);
    throw new HttpsError('internal', 'Failed to send verification email. Please try again.');
  }

  return { success: true, maskedEmail: maskEmail(email) };
});

// ─── confirm2FASetup ──────────────────────────────────────────────
// Authenticated — verifies the setup code and enables 2FA.

exports.confirm2FASetup = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;
  const code = String(request.data?.code || '').trim();

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid 6-digit code.');
  }

  const codeRef = db.collection('twoFactorSetupCodes').doc(uid);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'No setup code found. Please request a new one.');
  }

  const data = codeDoc.data();

  // Check expiry
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (Date.now() > expiresAt) {
    await codeRef.delete();
    throw new HttpsError('deadline-exceeded', 'This code has expired. Please request a new one.');
  }

  // Check attempts
  if ((data.attempts || 0) >= 5) {
    await codeRef.delete();
    throw new HttpsError('resource-exhausted', 'Too many incorrect attempts. Please request a new code.');
  }

  // Increment attempts
  await codeRef.update({ attempts: FieldValue.increment(1) });

  // Verify hash
  const inputHash = hashCode(code);
  if (inputHash !== data.codeHash) {
    const remaining = 4 - (data.attempts || 0);
    throw new HttpsError(
      'permission-denied',
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Please request a new one.'
    );
  }

  // Code correct — enable 2FA
  await db.collection('users').doc(uid).set(
    { twoFactorEnabled: true },
    { merge: true }
  );

  // Clean up
  await codeRef.delete();

  console.log('[confirm2FASetup] 2FA enabled for user:', uid);
  return { success: true, twoFactorEnabled: true };
});

// ─── disable2FA ───────────────────────────────────────────────────
// Authenticated — disables two-factor authentication.

exports.disable2FA = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;

  await db.collection('users').doc(uid).set(
    { twoFactorEnabled: false },
    { merge: true }
  );

  console.log('[disable2FA] 2FA disabled for user:', uid);
  return { success: true, twoFactorEnabled: false };
});

// ─── send2FALoginCode ─────────────────────────────────────────────
// Authenticated — sends a 2FA verification code during the login flow.
// Called right after signInWithEmailAndPassword when user has 2FA enabled.

exports.send2FALoginCode = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;

  if (!email) {
    throw new HttpsError('failed-precondition', 'No email address on this account.');
  }

  // Rate limit: one code per 60 seconds
  const emailKey = hashCode(email);
  const codeRef = db.collection('twoFactorLoginCodes').doc(emailKey);
  const existing = await codeRef.get();

  if (existing.exists) {
    const data = existing.data();
    const lastSent = data.sentAt?.toMillis?.() || 0;
    const elapsed = Date.now() - lastSent;
    if (elapsed < 60000) {
      const wait = Math.ceil((60000 - elapsed) / 1000);
      throw new HttpsError(
        'resource-exhausted',
        `Please wait ${wait} seconds before requesting another code.`
      );
    }
  }

  // Generate + hash
  const code = generateCode();
  const hash = hashCode(code);

  // Store in Firestore (keyed by email hash so verify2FALoginCode can look it up)
  await codeRef.set({
    codeHash: hash,
    uid: uid,
    email: email,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    sentAt: FieldValue.serverTimestamp(),
  });

  // Get display name
  let displayName = 'there';
  try {
    const userRecord = await authAdmin.getUser(uid);
    displayName = userRecord.displayName || 'there';
  } catch (_) {}

  // Send email
  try {
    const r = getResend();
    await r.emails.send({
      from: 'Biblely <noreply@biblely.uk>',
      reply_to: 'noreply@biblely.uk',
      to: [email],
      subject: `${code} is your Biblely login code`,
      html: build2FALoginHTML(code, displayName),
      text: `Hey ${displayName},\n\nYour Biblely login verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you didn't try to sign in to Biblely, someone may be trying to access your account. Consider changing your password.`,
    });
  } catch (emailError) {
    console.error('[send2FALoginCode] Email send failed:', emailError);
    throw new HttpsError('internal', 'Failed to send login code. Please try again.');
  }

  console.log('[send2FALoginCode] Code sent to', maskEmail(email));
  return { success: true, maskedEmail: maskEmail(email) };
});

// ─── verify2FALoginCode ──────────────────────────────────────────
// Unauthenticated — verifies the 2FA code during login.
// Called after the user signed out (2FA check signs them out), so
// this function is unauthenticated and uses email to look up the code.

exports.verify2FALoginCode = onCall({ maxInstances: 10 }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const code = String(request.data?.code || '').trim();

  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address.');
  }
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid 6-digit code.');
  }

  const emailKey = hashCode(email);
  const codeRef = db.collection('twoFactorLoginCodes').doc(emailKey);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'No login code found. Please try signing in again.');
  }

  const data = codeDoc.data();

  // Check expiry
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (Date.now() > expiresAt) {
    await codeRef.delete();
    throw new HttpsError('deadline-exceeded', 'This code has expired. Please try signing in again.');
  }

  // Check attempts
  if ((data.attempts || 0) >= 5) {
    await codeRef.delete();
    throw new HttpsError('resource-exhausted', 'Too many incorrect attempts. Please try signing in again.');
  }

  // Increment attempts
  await codeRef.update({ attempts: FieldValue.increment(1) });

  // Verify hash
  const inputHash = hashCode(code);
  if (inputHash !== data.codeHash) {
    const remaining = 4 - (data.attempts || 0);
    throw new HttpsError(
      'permission-denied',
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Please try signing in again.'
    );
  }

  // Code correct — clean up
  await codeRef.delete();

  console.log('[verify2FALoginCode] 2FA verified for', maskEmail(email));
  return { success: true };
});