const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public', 'index.html');
const APP_PATH = path.join(ROOT, 'public', 'app.js');
const WARNING_AVATAR_PATH = path.join(ROOT, 'public', 'avatars', 'avatar-warning.svg');

test('profile builder is removed from the display page', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  assert.doesNotMatch(html, /构建你的个人卡片/);
  assert.doesNotMatch(html, /id="inputAvatarUrl"/);
  assert.doesNotMatch(html, /id="profilePreview"/);
  assert.doesNotMatch(html, /id="jsonPreview"/);
});

test('profile cards fall back to a local warning avatar when avatar images fail', () => {
  const script = fs.readFileSync(APP_PATH, 'utf8');

  assert.ok(fs.existsSync(WARNING_AVATAR_PATH), 'warning avatar asset should exist');
  assert.match(script, /AVATAR_WARNING_FALLBACK/);
  assert.match(script, /data-fallback-src/);
  assert.match(script, /addEventListener\('error'/);
});

test('avatar fallback is shared by card and drawer images', () => {
  const script = fs.readFileSync(APP_PATH, 'utf8');

  assert.match(script, /wall-drawer-row[\s\S]*data-fallback-src/);
  assert.doesNotMatch(script, /classList\.contains\('avatar-image'\)/);
});
