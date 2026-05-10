const assert = require('node:assert/strict');
const test = require('node:test');

const { validateProfile } = require('../scripts/validate-contributors');

function validProfile(overrides = {}) {
  return {
    name: 'Safe User',
    github: 'safe-user',
    role: 'Contributor',
    motto: 'Ship carefully',
    stack: ['Git'],
    ...overrides
  };
}

test('rejects non-http homepage URLs', () => {
  const scriptResult = validateProfile(
    validProfile({ homepage: 'javascript:alert(1)' }),
    'safe-user.json'
  );
  const dataResult = validateProfile(
    validProfile({ homepage: 'data:text/html,<script>alert(1)</script>' }),
    'safe-user.json'
  );

  assert.match(scriptResult.errors.join('\n'), /homepage/);
  assert.match(dataResult.errors.join('\n'), /homepage/);
});

test('accepts http and https homepage URLs', () => {
  assert.equal(
    validateProfile(validProfile({ homepage: 'https://example.com/me' }), 'safe-user.json').errors.length,
    0
  );
  assert.equal(
    validateProfile(validProfile({ homepage: 'http://example.com/me' }), 'safe-user.json').errors.length,
    0
  );
});

test('accepts preset avatars and https avatar URLs', () => {
  assert.equal(
    validateProfile(validProfile({ avatar: 'avatars/avatar-01.png' }), 'safe-user.json').errors.length,
    0
  );
  assert.equal(
    validateProfile(validProfile({ avatar: 'https://example.com/avatar.png' }), 'safe-user.json').errors.length,
    0
  );
});

test('rejects unsafe avatar URLs', () => {
  const httpResult = validateProfile(
    validProfile({ avatar: 'http://example.com/avatar.png' }),
    'safe-user.json'
  );
  const scriptResult = validateProfile(
    validProfile({ avatar: 'javascript:alert(1)' }),
    'safe-user.json'
  );
  const dataResult = validateProfile(
    validProfile({ avatar: 'data:image/svg+xml,<svg></svg>' }),
    'safe-user.json'
  );

  assert.match(httpResult.errors.join('\n'), /avatar/);
  assert.match(scriptResult.errors.join('\n'), /avatar/);
  assert.match(dataResult.errors.join('\n'), /avatar/);
});
