const assert = require('node:assert/strict');
const test = require('node:test');

const { fetchGithubState } = require('../scripts/state-builder');

function jsonResponse(body, headers = {}) {
  return {
    ok: true,
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] || null;
      }
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    }
  };
}

test('uses paginated GitHub collections instead of treating the first page as totals', async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed.pathname + parsed.search);

    if (parsed.pathname === '/repos/acme/wall') {
      return jsonResponse({
        full_name: 'acme/wall',
        stargazers_count: 3,
        clone_url: 'https://github.com/acme/wall.git',
        html_url: 'https://github.com/acme/wall',
        default_branch: 'trunk',
        pushed_at: '2026-05-09T00:00:00Z'
      });
    }

    if (parsed.pathname === '/repos/acme/wall/contributors') {
      return jsonResponse([{ login: 'a' }]);
    }

    if (parsed.pathname === '/repos/acme/wall/commits') {
      return jsonResponse([]);
    }

    if (parsed.pathname === '/repos/acme/wall/issues') {
      const page = Number(parsed.searchParams.get('page') || '1');
      const issue = (number) => ({
        number,
        title: `Issue ${number}`,
        state: number % 2 ? 'open' : 'closed',
        user: { login: 'student' },
        created_at: '2026-05-09T00:00:00Z',
        updated_at: '2026-05-09T00:00:00Z',
        closed_at: number % 2 ? null : '2026-05-09T01:00:00Z',
        comments: 0,
        labels: []
      });

      if (page === 1) {
        return jsonResponse([issue(1), issue(2)], {
          link: '<https://api.github.com/repos/acme/wall/issues?state=all&page=2>; rel="next"'
        });
      }
      return jsonResponse([issue(3)]);
    }

    if (parsed.pathname === '/repos/acme/wall/pulls') {
      const page = Number(parsed.searchParams.get('page') || '1');
      const pr = (number) => ({
        number,
        title: `PR ${number}`,
        state: 'open',
        user: { login: 'student' },
        created_at: '2026-05-09T00:00:00Z',
        updated_at: '2026-05-09T00:00:00Z',
        requested_reviewers: [],
        requested_teams: []
      });

      if (page === 1) {
        return jsonResponse([pr(1)], {
          link: '<https://api.github.com/repos/acme/wall/pulls?state=open&page=2>; rel="next"'
        });
      }
      return jsonResponse([pr(2)]);
    }

    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const state = await fetchGithubState({ repository: 'acme/wall' });

    assert.equal(state.issuesTotal, 3);
    assert.equal(state.openIssuesTotal, 2);
    assert.equal(state.pullRequestsTotal, 2);
    assert.equal(state.defaultBranch, 'trunk');
    assert.ok(calls.some((call) => call.includes('/issues') && call.includes('page=2')));
    assert.ok(calls.some((call) => call.includes('/pulls') && call.includes('page=2')));
  } finally {
    global.fetch = originalFetch;
  }
});

test('builds community lanes from real GitHub issues instead of placeholders', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname === '/repos/acme/wall') {
      return jsonResponse({
        full_name: 'acme/wall',
        stargazers_count: 3,
        clone_url: 'https://github.com/acme/wall.git',
        html_url: 'https://github.com/acme/wall',
        pushed_at: '2026-05-09T00:00:00Z'
      });
    }

    if (parsed.pathname === '/repos/acme/wall/contributors') {
      return jsonResponse([]);
    }

    if (parsed.pathname === '/repos/acme/wall/commits') {
      return jsonResponse([]);
    }

    if (parsed.pathname === '/repos/acme/wall/pulls') {
      return jsonResponse([]);
    }

    if (parsed.pathname === '/repos/acme/wall/issues') {
      return jsonResponse([
        {
          number: 11,
          title: '[Question] Windows 下 npm start 失败',
          state: 'open',
          user: { login: 'alice', avatar_url: '', html_url: '' },
          html_url: 'https://github.com/acme/wall/issues/11',
          created_at: '2026-05-09T00:00:00Z',
          updated_at: '2026-05-09T03:00:00Z',
          closed_at: null,
          comments: 2,
          labels: [{ name: 'question', color: 'd876e3' }]
        },
        {
          number: 12,
          title: '[Idea] 支持头像裁剪',
          state: 'open',
          user: { login: 'bob', avatar_url: '', html_url: '' },
          html_url: 'https://github.com/acme/wall/issues/12',
          created_at: '2026-05-09T00:00:00Z',
          updated_at: '2026-05-09T04:00:00Z',
          closed_at: null,
          comments: 5,
          labels: [{ name: 'enhancement', color: 'a2eeef' }]
        },
        {
          number: 13,
          title: '[Bug] 提交后页面没有更新',
          state: 'open',
          user: { login: 'carol', avatar_url: '', html_url: '' },
          html_url: 'https://github.com/acme/wall/issues/13',
          created_at: '2026-05-09T00:00:00Z',
          updated_at: '2026-05-09T02:00:00Z',
          closed_at: null,
          comments: 1,
          labels: [{ name: 'bug', color: 'd73a4a' }]
        },
        {
          number: 14,
          title: '[Idea] 减少新手路径及格式错误',
          state: 'open',
          user: { login: 'dana', avatar_url: '', html_url: '' },
          html_url: 'https://github.com/acme/wall/issues/14',
          created_at: '2026-05-09T00:00:00Z',
          updated_at: '2026-05-09T01:00:00Z',
          closed_at: null,
          comments: 0,
          labels: [{ name: 'enhancement', color: 'a2eeef' }]
        }
      ]);
    }

    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const state = await fetchGithubState({ repository: 'acme/wall' });

    assert.equal(state.communityLanes.questions[0].title, '[Question] Windows 下 npm start 失败');
    assert.equal(state.communityLanes.ideas[0].title, '[Idea] 支持头像裁剪');
    assert.equal(state.communityLanes.bugs[0].title, '[Bug] 提交后页面没有更新');
    assert.equal(state.communityLanes.bugs.length, 1);
    assert.equal(state.communityLanes.questions[0].source, 'issue');
    assert.equal(Object.hasOwn(state.communityLanes, 'showcases'), false);
  } finally {
    global.fetch = originalFetch;
  }
});
