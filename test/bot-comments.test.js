const assert = require('node:assert/strict');
const test = require('node:test');

const {
  COMMENT_MARKER,
  buildNoticeMarker,
  formatMaintainerMentions,
  evaluatePrGuard,
  formatGuardComment,
  formatMaintainerNoticeComment
} = require('../scripts/pr-guard');
const {
  postGuardComment,
  postCommentOnceByMarker,
  processAutoMergeQueue
} = require('../scripts/auto-merge-queue');

function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

test('formatMaintainerMentions strips @, trims whitespace, and deduplicates case-insensitively', () => {
  assert.equal(
    formatMaintainerMentions(['@nanzhi84', ' NANZHI84 ', 'YJLEC', '@yjlec', '']),
    '@nanzhi84 @YJLEC'
  );
  assert.equal(formatMaintainerMentions(), '@nanzhi84 @YJLEC');
});

test('buildNoticeMarker normalizes short SHA and handles empty SHA', () => {
  assert.equal(
    buildNoticeMarker('validate_approval_required', 'abcdef1234567890'),
    '<!-- open-source-pulse-wall:auto-merge-notice:validate_approval_required:abcdef1 -->'
  );
  assert.equal(
    buildNoticeMarker('merge_failed', ''),
    '<!-- open-source-pulse-wall:auto-merge-notice:merge_failed:unknown -->'
  );
});

test('formatGuardComment covers normal success, Draft PR, approval_required (with & without URL), and empty SHA/author edge cases', () => {
  const okResult = { ok: true, skipped: false, prAuthor: 'alice', pathErrors: [], contentErrors: [], errors: [] };

  // 1. Standard ready PR
  const normal = formatGuardComment(okResult, { headSha: '1234567890abcdef' });
  assert.ok(normal.includes(COMMENT_MARKER));
  assert.match(normal, /### ✅ 自动格式与路径审查通过（提交 `1234567`）/);
  assert.match(normal, /@alice 这个 PR 的变更范围/);
  assert.match(normal, /约 10 分钟后将此 PR 合入 `main`/);

  // 2. Empty headSha and empty prAuthor edge case
  const minimal = formatGuardComment({ ...okResult, prAuthor: '' }, { headSha: '' });
  assert.match(minimal, /### ✅ 自动格式与路径审查通过\n/);
  assert.doesNotMatch(minimal, /（提交/);
  assert.match(minimal, /\n这个 PR 的变更范围/);

  // 3. Draft PR takes precedence even if approvalRequired is true (no premature teacher ping)
  const draft = formatGuardComment(okResult, {
    headSha: 'aaaaaaa1111',
    isDraft: true,
    approvalRequired: true,
    workflowRunUrl: 'https://github.com/nanzhi84/open-source-pulse-wall/actions/runs/99'
  });
  assert.match(draft, /当前为 \*\*Draft PR\*\*，不会自动合并/);
  assert.doesNotMatch(draft, /需要老师协助处理/);
  assert.doesNotMatch(draft, /@nanzhi84/);

  // 4. New account approval_required with workflowRunUrl and embedded dedupe marker
  const approvalWithUrl = formatGuardComment(okResult, {
    headSha: 'bbbbbbb2222',
    isDraft: false,
    approvalRequired: true,
    workflowRunUrl: 'https://github.com/nanzhi84/open-source-pulse-wall/actions/runs/100',
    maintainers: ['nanzhi84', 'YJLEC']
  });
  assert.ok(approvalWithUrl.includes(buildNoticeMarker('validate_approval_required', 'bbbbbbb2222')));
  assert.match(approvalWithUrl, /需要老师协助处理.*@nanzhi84 @YJLEC/);
  assert.match(approvalWithUrl, /\[查看等待审批的检查\]\(https:\/\/github\.com\/nanzhi84\/open-source-pulse-wall\/actions\/runs\/100\)/);
  assert.match(approvalWithUrl, /Approve and run/);

  // 5. New account approval_required without workflowRunUrl
  const approvalNoUrl = formatGuardComment(okResult, {
    headSha: 'ccccccc3333',
    isDraft: false,
    approvalRequired: true,
    workflowRunUrl: ''
  });
  assert.match(approvalNoUrl, /需要老师协助处理/);
  assert.doesNotMatch(approvalNoUrl, /查看等待审批的检查/);
});

test('formatGuardComment formats path-only, content-only, and combined path+content failure sections accurately', () => {
  // 1. Path errors ONLY -> section 1 only, no section 2
  const pathOnly = formatGuardComment(
    {
      ok: false,
      skipped: false,
      prAuthor: 'alice',
      pathErrors: ['README.md: 普通 PR 仅允许修改 data/profiles/ 和 data/cheers/ 下的贡献者数据文件'],
      contentErrors: [],
      errors: ['README.md: 普通 PR 仅允许修改 data/profiles/ 和 data/cheers/ 下的贡献者数据文件']
    },
    { headSha: '1111111aaaa' }
  );
  assert.match(pathOnly, /### ❌ 自动格式与路径审查未通过（提交 `1111111`）/);
  assert.match(pathOnly, /#### 1\. 变更范围与路径问题/);
  assert.doesNotMatch(pathOnly, /文件内容与格式问题/);
  assert.match(pathOnly, /npm run validate/);

  // 2. Content errors ONLY -> unnumbered heading "#### 文件内容与格式问题"
  const contentOnly = formatGuardComment(
    {
      ok: false,
      skipped: false,
      prAuthor: 'alice',
      pathErrors: [],
      contentErrors: ['data/profiles/alice.json: JSON 文件请使用 LF（\\n）换行符，不要使用 CRLF'],
      errors: ['data/profiles/alice.json: JSON 文件请使用 LF（\\n）换行符，不要使用 CRLF']
    },
    { headSha: '2222222bbbb' }
  );
  assert.doesNotMatch(contentOnly, /#### 1\./);
  assert.doesNotMatch(contentOnly, /#### 2\./);
  assert.match(contentOnly, /#### 文件内容与格式问题/);

  // 3. BOTH path and content errors -> numbered sections 1 & 2
  const both = formatGuardComment(
    {
      ok: false,
      skipped: false,
      prAuthor: 'alice',
      pathErrors: ['data/profiles/_template.json: 不能修改模板文件，请复制模板后再创建你的文件'],
      contentErrors: ['data/profiles/alice.json: name 必须填写'],
      errors: [
        'data/profiles/_template.json: 不能修改模板文件，请复制模板后再创建你的文件',
        'data/profiles/alice.json: name 必须填写'
      ]
    },
    { headSha: '3333333cccc' }
  );
  assert.match(both, /#### 1\. 变更范围与路径问题/);
  assert.match(both, /#### 2\. 文件内容与格式问题/);
});

test('evaluatePrGuard covers all content and path edge cases (BOM, CRLF, 4-space indent, invalid JSON, missing content, template name, inline cheers, auto-resolved cheer keys, overlength, ghost target, rename/delete)', () => {
  // Edge case 1: BOM + CRLF + invalid JSON + missing file content
  const formatResult = evaluatePrGuard({
    prAuthor: 'alice',
    changedFiles: [
      { status: 'A', path: 'data/profiles/alice.json' },
      { status: 'A', path: 'data/cheers/bob/alice.json' },
      { status: 'A', path: 'data/cheers/charlie/alice.json' },
      { status: 'A', path: 'data/cheers/dave/alice.json' }
    ],
    fileContents: {
      'data/profiles/alice.json': '\uFEFF{\n  "name": "Alice",\n  "motto": "Hi"\n}\n',
      'data/cheers/bob/alice.json': '{\r\n  "message": "CRLF cheer"\r\n}\r\n',
      'data/cheers/charlie/alice.json': '{ invalid json'
      // data/cheers/dave/alice.json intentionally omitted -> unreadable content error
    },
    existingProfileFiles: ['bob.json', 'charlie.json', 'dave.json']
  });
  assert.equal(formatResult.ok, false);
  assert.equal(formatResult.pathErrors.length, 0);
  assert.ok(formatResult.contentErrors.some((e) => e.includes('UTF-8 BOM')));
  assert.ok(formatResult.contentErrors.some((e) => e.includes('CRLF')));
  assert.ok(formatResult.contentErrors.some((e) => e.includes('JSON 解析失败')));
  assert.ok(formatResult.contentErrors.some((e) => e.includes('无法读取文件内容')));

  // Edge case 2: Unedited template name, inline cheers, unknown key, overlength cheer, auto-resolved from/ts, ghost target
  const semanticResult = evaluatePrGuard({
    prAuthor: 'alice',
    changedFiles: [
      { status: 'A', path: 'data/profiles/alice.json' },
      { status: 'A', path: 'data/cheers/ghost/alice.json' }
    ],
    fileContents: {
      'data/profiles/alice.json': `${JSON.stringify(
        {
          name: '你的名字',
          motto: 'A'.repeat(121),
          city: 123,
          cheers: [],
          relic: 'removed'
        },
        null,
        2
      )}\n`,
      'data/cheers/ghost/alice.json': `${JSON.stringify(
        {
          from: 'alice',
          ts: '2026-11-20T00:00:00Z',
          extra: true,
          message: 'B'.repeat(81)
        },
        null,
        2
      )}\n`
    },
    existingProfileFiles: ['bob.json']
  });
  assert.equal(semanticResult.ok, false);
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('模板默认值「你的名字」')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('motto 过长')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('city 必须是 40 个字符以内的字符串')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('请删除 cheers 字段')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('包含未允许的字段 relic')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('未找到目标贡献者 "ghost"')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('无需填写 from、ts')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('包含未允许的字段 extra')));
  assert.ok(semanticResult.contentErrors.some((e) => e.includes('message 过长')));

  // Edge case 3: Rename + delete + empty PR + modifying someone else's cheer
  const renameResult = evaluatePrGuard({
    prAuthor: 'alice',
    changedFiles: [
      { status: 'R', previousPath: 'data/profiles/alice.json', path: 'data/profiles/Alice.json' },
      { status: 'M', path: 'data/cheers/bob/charlie.json' }
    ],
    fileContents: {
      'data/profiles/Alice.json': `${JSON.stringify({ name: 'Alice', motto: 'Hi' }, null, 2)}\n`,
      'data/cheers/bob/charlie.json': `${JSON.stringify({ message: 'hijack' }, null, 2)}\n`
    },
    existingProfileFiles: ['alice.json', 'bob.json']
  });
  assert.equal(renameResult.ok, false);
  assert.ok(renameResult.pathErrors.some((e) => e.includes('不允许删除文件')));
  assert.ok(renameResult.pathErrors.some((e) => e.includes('不能修改他人已有的寄语文件')));
  assert.ok(renameResult.contentErrors.some((e) => e.includes('用户名重复（不区分大小写）')));

  const emptyResult = evaluatePrGuard({ prAuthor: 'alice', changedFiles: [] });
  assert.equal(emptyResult.ok, false);
  assert.ok(emptyResult.pathErrors.some((e) => e.includes('PR 未包含任何文件变更')));
});

test('formatMaintainerNoticeComment covers all 4 notice reasons and sanitizes multiline merge errors', () => {
  // 1. validate_approval_required
  const approval = formatMaintainerNoticeComment({
    reason: 'validate_approval_required',
    prAuthor: 'newbie',
    headSha: 'abc1234567',
    maintainers: ['nanzhi84', 'YJLEC'],
    workflowRunUrl: 'https://github.com/nanzhi84/open-source-pulse-wall/actions/runs/555'
  });
  assert.ok(approval.includes(buildNoticeMarker('validate_approval_required', 'abc1234567')));
  assert.match(approval, /### 🧑‍🏫 需要老师手动处理（提交 `abc1234`）/);
  assert.match(approval, /@nanzhi84 @YJLEC/);
  assert.match(approval, /@newbie/);
  assert.match(approval, /Approve and run/);

  // 2. validate_missing (grace period expired)
  const missing = formatMaintainerNoticeComment({
    reason: 'validate_missing',
    prAuthor: '',
    headSha: 'def5678901',
    maintainers: ['nanzhi84', 'YJLEC']
  });
  assert.ok(missing.includes(buildNoticeMarker('validate_missing', 'def5678901')));
  assert.match(missing, /超过等待窗口仍未检测到 `validate` 检查状态/);
  assert.match(missing, /@nanzhi84 @YJLEC/);

  // 3. main_recheck_failed (only pings student, lists all errors + sync command)
  const recheck = formatMaintainerNoticeComment({
    reason: 'main_recheck_failed',
    prAuthor: 'alice',
    headSha: 'fedcba9876',
    errors: ['err-one', 'err-two']
  });
  assert.ok(recheck.includes(buildNoticeMarker('main_recheck_failed', 'fedcba9876')));
  assert.match(recheck, /### ⚠️ 自动合并前复检未通过（提交 `fedcba9`）/);
  assert.match(recheck, /@alice/);
  assert.match(recheck, /- err-one\n- err-two/);
  assert.match(recheck, /git fetch upstream && git merge upstream\/main/);
  assert.doesNotMatch(recheck, /@nanzhi84/);

  // 4. merge_failed (sanitizes multiline error message so Markdown blockquote stays intact)
  const mergeFailed = formatMaintainerNoticeComment({
    reason: 'merge_failed',
    prAuthor: 'bob',
    headSha: '9999999aaa',
    maintainers: ['nanzhi84', 'YJLEC'],
    mergeError: 'Pull Request is not mergeable\nLine 2 detail\r\nLine 3 detail'
  });
  assert.ok(mergeFailed.includes(buildNoticeMarker('merge_failed', '9999999aaa')));
  assert.match(mergeFailed, /### ⚠️ 自动合并未能完成（提交 `9999999`）/);
  assert.match(mergeFailed, /@bob（抄送 @nanzhi84 @YJLEC）/);
  assert.match(mergeFailed, /> Pull Request is not mergeable Line 2 detail Line 3 detail/);
});

test('postCommentOnceByMarker prevents duplicate teacher notice when pr-guard already embedded approval marker, but posts again on new headSha', async () => {
  const comments = [
    {
      id: 1,
      body: formatGuardComment(
        { ok: true, skipped: false, prAuthor: 'newbie', pathErrors: [], contentErrors: [], errors: [] },
        { headSha: 'aaaaaaa1111', approvalRequired: true }
      )
    }
  ];

  const github = {
    async paginate(fn, params) {
      return fn(params);
    },
    rest: {
      issues: {
        async listComments() {
          return comments;
        },
        async createComment({ body }) {
          const entry = { id: comments.length + 1, body };
          comments.push(entry);
          return { data: entry };
        }
      }
    }
  };

  // Same SHA -> already covered by pr-guard's embedded marker -> MUST NOT post duplicate!
  const dup = await postCommentOnceByMarker({
    github,
    owner: 'nanzhi84',
    repo: 'open-source-pulse-wall',
    issueNumber: 42,
    marker: buildNoticeMarker('validate_approval_required', 'aaaaaaa1111'),
    body: formatMaintainerNoticeComment({
      reason: 'validate_approval_required',
      prAuthor: 'newbie',
      headSha: 'aaaaaaa1111'
    })
  });
  assert.equal(dup.posted, false);
  assert.equal(dup.reason, 'already_exists');
  assert.equal(comments.length, 1);

  // New SHA after student pushes -> MUST post a new notice!
  const fresh = await postCommentOnceByMarker({
    github,
    owner: 'nanzhi84',
    repo: 'open-source-pulse-wall',
    issueNumber: 42,
    marker: buildNoticeMarker('validate_approval_required', 'bbbbbbb2222'),
    body: formatMaintainerNoticeComment({
      reason: 'validate_approval_required',
      prAuthor: 'newbie',
      headSha: 'bbbbbbb2222'
    })
  });
  assert.equal(fresh.posted, true);
  assert.equal(comments.length, 2);
});

test('postGuardComment and postCommentOnceByMarker degrade gracefully on GitHub API errors without throwing', async () => {
  const warnings = [];
  const core = { warning: (msg) => warnings.push(msg) };
  const brokenGithub = {
    async paginate() {
      throw new Error('503 Service Unavailable');
    },
    rest: {
      issues: {
        async createComment() {
          throw new Error('403 Forbidden');
        }
      }
    }
  };

  const guardRes = await postGuardComment({
    github: brokenGithub,
    owner: 'nanzhi84',
    repo: 'open-source-pulse-wall',
    issueNumber: 1,
    body: 'test',
    core
  });
  assert.equal(guardRes.action, 'error');
  assert.match(guardRes.error, /403 Forbidden/);

  const noticeRes = await postCommentOnceByMarker({
    github: brokenGithub,
    owner: 'nanzhi84',
    repo: 'open-source-pulse-wall',
    issueNumber: 1,
    marker: '<!-- m -->',
    body: 'test',
    core
  });
  assert.equal(noticeRes.posted, false);
  assert.match(noticeRes.error, /503 Service Unavailable/);
  assert.equal(warnings.length, 2);
});

test('processAutoMergeQueue posts merge_failed notice on mergeable=false conflict and validate_missing after grace window', async () => {
  const createdComments = [];
  const prList = [
    {
      number: 301,
      state: 'open',
      merged: false,
      draft: false,
      mergeable: false,
      created_at: '2026-11-20T10:00:00Z',
      user: { login: 'conflictuser' },
      base: { ref: 'main' },
      head: { sha: 'c0nf11c700000', repo: { owner: { login: 'conflictuser' }, name: 'open-source-pulse-wall' } },
      labels: []
    },
    {
      number: 302,
      state: 'open',
      merged: false,
      draft: false,
      mergeable: true,
      created_at: '2026-11-20T10:00:00Z',
      user: { login: 'missingval' },
      base: { ref: 'main' },
      head: { sha: 'a1b2c3d400000', repo: { owner: { login: 'missingval' }, name: 'open-source-pulse-wall' } },
      labels: []
    }
  ];

  const github = {
    async paginate(fn, params) {
      return fn(params);
    },
    rest: {
      pulls: {
        async list() {
          return prList;
        },
        async get({ pull_number }) {
          return { data: prList.find((p) => p.number === pull_number) };
        },
        async listReviews() {
          return [];
        },
        async listFiles() {
          return [{ status: 'added', filename: 'data/profiles/conflictuser.json', sha: 'b1' }];
        },
        async merge() {
          throw new Error('should not merge');
        }
      },
      checks: {
        async listForRef({ ref }) {
          if (ref === 'c0nf11c700000') {
            return {
              data: {
                check_runs: [
                  { id: 1, name: 'pr-guard', status: 'completed', conclusion: 'success', completed_at: '2026-11-20T10:00:10Z' },
                  { id: 2, name: 'validate', status: 'completed', conclusion: 'success', completed_at: '2026-11-20T10:00:15Z' }
                ]
              }
            };
          }
          // PR #302: pr-guard succeeded > 90s ago, validate never appeared
          return {
            data: {
              check_runs: [
                { id: 3, name: 'pr-guard', status: 'completed', conclusion: 'success', completed_at: '2026-11-20T10:00:10Z' }
              ]
            }
          };
        }
      },
      actions: {
        async listWorkflowRunsForRepo() {
          return { data: { workflow_runs: [] } };
        },
        async createWorkflowDispatch() {
          return { status: 204 };
        }
      },
      git: {
        async getBlob() {
          return { data: { content: encodeBase64('{\n  "name": "C",\n  "motto": "M"\n}\n') } };
        }
      },
      issues: {
        async listComments() {
          return [];
        },
        async createComment({ issue_number, body }) {
          createdComments.push({ issue_number, body });
          return { data: { id: createdComments.length, body } };
        }
      }
    }
  };

  const summary = await processAutoMergeQueue({
    github,
    owner: 'nanzhi84',
    repo: 'open-source-pulse-wall',
    workspace: '/tmp/fake-notices',
    nowFn: () => Date.parse('2026-11-20T10:15:00Z'),
    sleepFn: async () => {},
    refreshMainFn: () => {},
    listProfilesFn: () => [],
    listCheersFn: () => []
  });

  assert.equal(summary.merged.length, 0);
  const conflictComment = createdComments.find((c) => c.issue_number === 301);
  assert.ok(conflictComment);
  assert.match(conflictComment.body, /自动合并未能完成/);
  assert.match(conflictComment.body, /mergeable = false/);
  assert.match(conflictComment.body, /@conflictuser（抄送 @nanzhi84 @YJLEC）/);

  const missingComment = createdComments.find((c) => c.issue_number === 302);
  assert.ok(missingComment);
  assert.match(missingComment.body, /需要老师手动处理/);
  assert.match(missingComment.body, /超过等待窗口仍未检测到 `validate` 检查状态/);
});
