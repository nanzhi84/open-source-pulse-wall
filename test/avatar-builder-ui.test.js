const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public', 'index.html');
const APP_PATH = path.join(ROOT, 'public', 'app.js');
const WARNING_AVATAR_PATH = path.join(ROOT, 'public', 'avatars', 'avatar-warning.svg');

test('profile builder exposes a custom avatar URL field', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  assert.match(html, /id="inputAvatarUrl"/);
  assert.match(html, /name="avatarUrl"/);
  assert.match(html, /type="url"/);
});

test('profile cards fall back to a local warning avatar when avatar images fail', () => {
  const script = fs.readFileSync(APP_PATH, 'utf8');

  assert.ok(fs.existsSync(WARNING_AVATAR_PATH), 'warning avatar asset should exist');
  assert.match(script, /AVATAR_WARNING_FALLBACK/);
  assert.match(script, /data-fallback-src/);
  assert.match(script, /addEventListener\('error'/);
});
