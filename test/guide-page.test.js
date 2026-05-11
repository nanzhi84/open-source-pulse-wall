const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public', 'index.html');
const GUIDE_PATH = path.join(ROOT, 'public', 'guide.html');
const GUIDE_ASSETS_DIR = path.join(ROOT, 'public', 'guide-assets');

test('home page routes contribution teaching to the standalone guide', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  assert.match(html, /href="guide\.html"/);
  assert.doesNotMatch(html, /href="#contribute"[\s>]/);
});

test('guide page teaches the profile and pull request flow with screenshots', () => {
  const html = fs.readFileSync(GUIDE_PATH, 'utf8');

  assert.match(html, /添加你的 Profile/);
  assert.match(html, /cp data\/profiles\/_template\.json data\/profiles\/your-github-id\.json/);
  assert.match(html, /npm run validate/);
  assert.match(html, /git push origin add-your-profile/);
  assert.match(html, /Pull Request/);
  assert.match(html, /`cheers`/);
  assert.match(html, /guide-assets\/01-repo-home\.png/);
  assert.match(html, /guide-assets\/08-review-docs\.png/);
});

test('guide screenshot assets are present', () => {
  const expected = [
    '01-repo-home.png',
    '02-profile-directory.png',
    '03-profile-template.png',
    '04-contributing-docs.png',
    '05-add-file-docs.png',
    '06-compare-page.png',
    '07-pulls-page.png',
    '08-review-docs.png'
  ];

  expected.forEach((filename) => {
    const fullPath = path.join(GUIDE_ASSETS_DIR, filename);
    assert.ok(fs.existsSync(fullPath), `${filename} should exist`);
    assert.ok(fs.statSync(fullPath).size > 1000, `${filename} should not be empty`);
  });
});
