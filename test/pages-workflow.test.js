const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'pages.yml');

function readWorkflow() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('GitHub Pages workflow deploys the static build from main', () => {
  assert.ok(fs.existsSync(WORKFLOW_PATH), 'pages.yml should exist');

  const workflow = readWorkflow();

  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run validate/);
  assert.match(workflow, /run: npm run build:pages/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /path: dist/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /uses: actions\/deploy-pages@[a-f0-9]{40}/);
});
