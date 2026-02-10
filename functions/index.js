/**
 * Cloud Functions for Biblely
 *
 * sendVerificationCode – generates a 6-digit OTP, stores its SHA-256
 *   hash in Firestore, and emails the code via Resend.
 *
 * verifyEmailCode – checks the user-supplied code against the stored
 *   hash, and on success marks the account as verified in both
 *   Firebase Auth and the Firestore users collection.
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#E67E22,#D35400);padding:32px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:1px;">Biblely</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">Email Verification</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:16px;color:#2C3E50;margin:0 0 16px;">Hey ${name},</p>
              <p style="font-size:15px;color:#555;margin:0 0 28px;line-height:1.5;">
                Use this code to verify your email address. It expires in <strong>10 minutes</strong>.
              </p>
              <!-- Code box -->
              <div style="background:#F8F9FA;border:2px dashed #E67E22;border-radius:14px;padding:20px;text-align:center;margin:0 0 28px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#2C3E50;font-family:'Courier New',monospace;">
                  ${code}
                </div>
              </div>
              <p style="font-size:13px;color:#888;margin:0 0 8px;line-height:1.4;">
                If you didn't create a Biblely account, you can safely ignore this email.
              </p>
              <p style="font-size:13px;color:#888;margin:0;line-height:1.4;">
                Do not share this code with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #F0F0F0;text-align:center;">
              <p style="font-size:12px;color:#BBB;margin:0;">
                Biblely &mdash; Faith. Fitness. Focus.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      from: 'Biblely <onboarding@resend.dev>',
      to: [email],
      subject: `${code} is your Biblely verification code`,
      html: buildEmailHTML(code, displayName),
    });
  } catch (emailError) {
    console.error('[sendVerificationCode] Email send failed:', emailError);
    throw new HttpsError('internal', 'Failed to send verification email. Please try again.');
  }

  // Return masked email for display
  const [local, domain] = email.split('@');
  const masked = local.length <= 2
    ? local + '***@' + domain
    : local[0] + '***' + local[local.length - 1] + '@' + domain;

  return { success: true, maskedEmail: masked };
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
