#!/usr/bin/env node
/**
 * Tests for src/utils/sha256.js and src/config/admin.js.
 * Run from the repo root: node scripts/test-admin-access.js
 *
 * The owner passphrase is never written here. Only negative cases are asserted
 * for verifyAdminPassphrase; the hash itself is checked indirectly.
 */
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const Module = require('module');
const babel = require('@babel/core');

const ROOT = path.resolve(__dirname, '..');
const SHA_PATH = path.join(ROOT, 'src/utils/sha256.js');
const ADMIN_PATH = path.join(ROOT, 'src/config/admin.js');

const transform = (p) =>
  babel.transformFileSync(p, { presets: ['babel-preset-expo'], filename: p, babelrc: false, configFile: false }).code;

const load = (p, requireShim) => {
  const m = new Module(p, module);
  m.filename = p;
  m.paths = Module._nodeModulePaths(path.dirname(p));
  if (requireShim) m.require = requireShim;
  m._compile(transform(p), p);
  return m.exports;
};

const sha = load(SHA_PATH);
const admin = load(ADMIN_PATH, (id) => {
  if (id === '../utils/sha256') return sha;
  return require(id);
});

const { sha256Hex } = sha;
const { isAdminEmail, verifyAdminPassphrase, ADMIN_EMAILS } = admin;
const nodeSha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('ok', name); };

// sha256Hex vs Node crypto
const fixed = [
  '',
  'abc',
  'The quick brown fox jumps over the lazy dog',
  'Grüße 世界 ñ \u{1D11E}',
  'a'.repeat(55),
  'b'.repeat(56),
  'c'.repeat(64),
  'd'.repeat(65),
  'e'.repeat(3000),
  '\ud800',
  '\udc00',
  '\ud800x',
  'x\udfff',
];
check('sha256Hex fixed vectors', () => {
  for (const s of fixed) assert.strictEqual(sha256Hex(s), nodeSha(s), `mismatch for length ${s.length}`);
});
check('sha256Hex known abc digest', () => {
  assert.strictEqual(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
check('sha256Hex 25 random base64 strings', () => {
  for (let i = 0; i < 25; i++) {
    const n = 1 + Math.floor(Math.random() * 200);
    const s = crypto.randomBytes(n).toString('base64');
    assert.strictEqual(sha256Hex(s), nodeSha(s), `mismatch for random n=${n}`);
  }
});
check('sha256Hex output shape', () => {
  assert.match(sha256Hex('anything'), /^[0-9a-f]{64}$/);
});

// isAdminEmail
check('isAdminEmail true for admin emails (any case, padded)', () => {
  assert.deepStrictEqual(ADMIN_EMAILS, ['biblelyios@gmail.com', 'antwijason55@gmail.com']);
  for (const e of ADMIN_EMAILS) {
    assert.strictEqual(isAdminEmail(e), true);
    assert.strictEqual(isAdminEmail(e.toUpperCase()), true);
    assert.strictEqual(isAdminEmail(`  ${e}  `), true);
    assert.strictEqual(isAdminEmail(`\t${e.toUpperCase()}\n`), true);
  }
});
check('isAdminEmail false for non-admins', () => {
  for (const e of [null, undefined, '', 'someone@gmail.com', 'biblelyios@gmail.co']) {
    assert.strictEqual(isAdminEmail(e), false, `expected false for ${String(e)}`);
  }
});

// verifyAdminPassphrase (negative cases only; the real phrase is never written)
check('verifyAdminPassphrase false for bad inputs', () => {
  const bad = ['', null, undefined, 'wrong', 'not-the-passphrase?', 'f'.repeat(64), '7c832ad9765b31561e6833e0df62f3011ff3f253a9f8918d7252434672ee2787'];
  for (const b of bad) assert.strictEqual(verifyAdminPassphrase(b), false, `expected false for ${String(b)}`);
});
check('verifyAdminPassphrase returns a boolean and is deterministic', () => {
  assert.strictEqual(typeof verifyAdminPassphrase('x'), 'boolean');
  assert.strictEqual(verifyAdminPassphrase('x'), verifyAdminPassphrase(' x '));
});

console.log(`\nAll ${passed} checks passed.`);
