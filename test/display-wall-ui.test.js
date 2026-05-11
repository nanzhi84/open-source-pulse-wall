const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public', 'index.html');
const APP_PATH = path.join(ROOT, 'public', 'app.js');

test('home page is a display-first collaboration wall with bounded detail entry points', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');

  assert.match(html, /GitHub 协作展示墙/);
  assert.match(html, /class="[^"]*pulse-dashboard[^"]*"/);
  assert.match(html, /class="[^"]*dashboard-main[^"]*"/);
  assert.match(html, /全部贡献者/);
  assert.match(html, /查看全部 PR/);
  assert.match(html, /完整时间线/);
  assert.match(html, /Bug 反馈/);
  assert.doesNotMatch(html, /如何在本地跑通整套开发环境|支持插件化架构|Awesome Pulse Wall 插件集|作品展示/);
});

test('display wall keeps expanding data surfaces bounded by default', () => {
  const script = fs.readFileSync(APP_PATH, 'utf8');

  assert.doesNotMatch(script, /const WALL_PREVIEW_LIMIT = 12;/);
  assert.match(script, /const WALL_PREVIEW_LIMIT = 6;/);
  assert.match(script, /const VISIBLE_FEED_ITEMS = 6;/);
  assert.match(script, /const HISTORY_PREVIEW_LIMIT = 6;/);
  assert.match(script, /cardMarkup\(profile, \{ compact: true \}\)/);
  assert.match(script, /options\.compact \? '' : cheersMarkup\(profile, options\)/);
  assert.match(script, /function profileSourceUrl\(file\)/);
  assert.match(script, /\/data\/profiles\/\$\{encodeURIComponent\(filename\)\}/);
});
