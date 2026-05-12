const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public', 'index.html');
const GUIDE_PATH = path.join(ROOT, 'public', 'guide.html');
const GUIDE_ASSETS_DIR = path.join(ROOT, 'public', 'guide-assets');
const GUIDE_CHAPTERS = [
  ['guide-level-0.html', /1\. GitHub 协作地图/, /Repository/],
  ['guide-level-1.html', /2\. GitHub 网页端贡献/, /Fork/],
  ['guide-level-2.html', /3\. VS Code 全流程/, /Clone Repository/],
  ['guide-level-3.html', /4\. 命令行路径/, /git push origin add-your-profile/],
  ['guide-level-4.html', /5\. PR Review 与修错/, /Pull Request/],
  ['guide-profile-lab.html', /6\. Profile 字段实验/, /`cheers`/]
];

test('home page routes contribution teaching to the standalone guide', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  assert.match(html, /href="guide\.html"/);
  assert.doesNotMatch(html, /href="#contribute"[\s>]/);
});

test('guide page is a chapter index without display-page navigation', () => {
  const html = fs.readFileSync(GUIDE_PATH, 'utf8');

  assert.match(html, /GitHub 分级教学目录/);
  assert.match(html, /class="guide-doc-layout"/);
  assert.match(html, /class="guide-sidebar"/);
  assert.match(html, /class="guide-doc-main"/);
  assert.match(html, /guide-level-0\.html/);
  assert.match(html, /guide-level-1\.html/);
  assert.match(html, /guide-level-2\.html/);
  assert.match(html, /guide-level-3\.html/);
  assert.match(html, /guide-level-4\.html/);
  assert.match(html, /guide-profile-lab\.html/);
  assert.doesNotMatch(html, />\s*Level\s*\d/i);
  assert.doesNotMatch(html, /class="edge-plant/);
  assert.doesNotMatch(html, /class="paper-plane/);
  assert.doesNotMatch(html, /贡献者大厅/);
  assert.doesNotMatch(html, /PR 与讨论/);
});

test('guide chapters teach the profile and pull request flow with video slots', () => {
  GUIDE_CHAPTERS.forEach(([filename, titlePattern, contentPattern]) => {
    const chapterPath = path.join(ROOT, 'public', filename);
    const html = fs.readFileSync(chapterPath, 'utf8');

    assert.match(html, titlePattern);
    assert.match(html, contentPattern);
    assert.match(html, /视频占位/);
    assert.match(html, /class="guide-doc-layout"/);
    assert.match(html, /class="guide-sidebar"/);
    assert.match(html, /class="guide-doc-main"/);
    assert.match(html, /class="guide-video-placeholder"/);
    assert.match(html, /返回目录/);
    assert.ok(
      html.indexOf('class="guide-video-placeholder"') < html.indexOf('<h1'),
      `${filename} should place the video placeholder before the chapter title`
    );
    assert.doesNotMatch(html, /class="edge-plant/);
    assert.doesNotMatch(html, /class="paper-plane/);
    assert.doesNotMatch(html, />\s*Level\s*\d/i);
    assert.doesNotMatch(html, /贡献者大厅/);
    assert.doesNotMatch(html, /PR 与讨论/);
  });

  const commandHtml = fs.readFileSync(path.join(ROOT, 'public', 'guide-level-3.html'), 'utf8');
  const profileHtml = fs.readFileSync(path.join(ROOT, 'public', 'guide-profile-lab.html'), 'utf8');

  assert.match(commandHtml, /cp data\/profiles\/_template\.json data\/profiles\/your-github-id\.json/);
  assert.match(commandHtml, /npm run validate/);
  assert.match(profileHtml, /`cheers`/);
});

test('guide pages keep existing screenshot references available', () => {
  const html = [
    fs.readFileSync(GUIDE_PATH, 'utf8'),
    ...GUIDE_CHAPTERS.map(([filename]) => fs.readFileSync(path.join(ROOT, 'public', filename), 'utf8'))
  ].join('\n');

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
