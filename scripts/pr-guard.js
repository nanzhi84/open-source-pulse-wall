#!/usr/bin/env node

const {
  listProfileFiles,
  listCheerFiles,
  validateProfile,
  validateCheerEntry,
  validateGithubHandle,
  validateJsonFormatting,
  CHEERS_MAX_PER_PROFILE
} = require('./validate-contributors');
const {
  DEFAULT_MAINTAINERS,
  parseMaintainers,
  validatePrDiff
} = require('./validate-pr-diff');

const COMMENT_MARKER = '<!-- open-source-pulse-wall:pr-guard -->';
const NOTICE_MARKER_PREFIX = '<!-- open-source-pulse-wall:auto-merge-notice:';
const HOLD_LABELS = ['hold', 'do-not-merge', 'wip'];
const AUTO_MERGE_DELAY_MS = 10 * 60 * 1000;
const VALIDATE_MISSING_GRACE_MS = 90 * 1000;

function mapGithubStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'added':
      return 'A';
    case 'modified':
    case 'changed':
      return 'M';
    case 'removed':
      return 'D';
    case 'renamed':
      return 'R';
    case 'copied':
      return 'C';
    default:
      return 'M';
  }
}

function normalizeGithubPrFiles(apiFiles = []) {
  return apiFiles.map((file) => {
    const mapped = {
      status: mapGithubStatus(file.status),
      path: String(file.filename || '').replace(/\\/g, '/').replace(/^\/+/, ''),
      sha: String(file.sha || '')
    };
    if (file.previous_filename) {
      mapped.previousPath = String(file.previous_filename).replace(/\\/g, '/').replace(/^\/+/, '');
    }
    if (file.raw_url) {
      mapped.rawUrl = String(file.raw_url);
    }
    return mapped;
  });
}

function formatMaintainerMentions(maintainers = DEFAULT_MAINTAINERS) {
  const list = (Array.isArray(maintainers) ? maintainers : DEFAULT_MAINTAINERS)
    .map((handle) => String(handle || '').trim().replace(/^@/, ''))
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const handle of list) {
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(`@${handle}`);
  }
  return unique.join(' ');
}

function buildNoticeMarker(reason, headSha = '') {
  const shortSha = String(headSha || '').trim().slice(0, 7) || 'unknown';
  return `${NOTICE_MARKER_PREFIX}${reason}:${shortSha} -->`;
}

function evaluatePrGuard({
  prAuthor,
  changedFiles = [],
  fileContents = {},
  existingProfileFiles = [],
  existingCheerFiles = [],
  maintainers = DEFAULT_MAINTAINERS
} = {}) {
  const diffResult = validatePrDiff({ prAuthor, changedFiles, maintainers });

  if (diffResult.skipped) {
    return {
      ok: true,
      skipped: true,
      prAuthor: String(prAuthor || '').trim(),
      pathErrors: [],
      contentErrors: [],
      errors: []
    };
  }

  const pathErrors = [...diffResult.errors];
  const contentErrors = [];

  const existingProfileMap = new Map();
  for (const file of existingProfileFiles) {
    const stem = String(file || '').replace(/\.json$/i, '').trim();
    if (stem) {
      existingProfileMap.set(stem.toLowerCase(), file);
    }
  }

  const seenCheerTargetDirs = new Map();
  const seenCheerFilesByTarget = new Map();
  const cheerFilesSetByTarget = new Map();
  const reportedCheerLimitTargets = new Set();

  for (const entry of existingCheerFiles) {
    const target = String(entry?.target || '').trim();
    const file = String(entry?.file || '').trim();
    if (!target || !file) continue;

    const targetKey = target.toLowerCase();
    const fileKey = file.toLowerCase();

    if (!seenCheerTargetDirs.has(targetKey)) {
      seenCheerTargetDirs.set(targetKey, target);
    }
    if (!seenCheerFilesByTarget.has(targetKey)) {
      seenCheerFilesByTarget.set(targetKey, new Map());
    }
    if (!seenCheerFilesByTarget.get(targetKey).has(fileKey)) {
      seenCheerFilesByTarget.get(targetKey).set(fileKey, file);
    }
    if (!cheerFilesSetByTarget.has(targetKey)) {
      cheerFilesSetByTarget.set(targetKey, new Set());
    }
    cheerFilesSetByTarget.get(targetKey).add(fileKey);
  }

  const prAddedProfileTargets = new Set();
  for (const item of changedFiles) {
    if (item.status === 'D') continue;
    const p = String(item.path || '');
    if (p.startsWith('data/profiles/') && p.endsWith('.json') && !p.startsWith('data/profiles/_')) {
      const rest = p.slice('data/profiles/'.length);
      if (!rest.includes('/')) {
        prAddedProfileTargets.add(rest.slice(0, -'.json'.length).toLowerCase());
      }
    }
  }

  const validTargets = new Set([...existingProfileMap.keys(), ...prAddedProfileTargets]);

  for (const item of changedFiles) {
    if (item.status === 'D') continue;
    const filePath = String(item.path || '');

    const isProfile =
      filePath.startsWith('data/profiles/') &&
      !filePath.slice('data/profiles/'.length).includes('/') &&
      filePath.endsWith('.json') &&
      !filePath.startsWith('data/profiles/_');

    const isCheer = (() => {
      if (!filePath.startsWith('data/cheers/')) return false;
      const segments = filePath.slice('data/cheers/'.length).split('/');
      return (
        segments.length === 2 &&
        segments[0] &&
        !segments[0].startsWith('_') &&
        segments[1] &&
        !segments[1].startsWith('_') &&
        segments[1].endsWith('.json')
      );
    })();

    if (!isProfile && !isCheer) {
      continue;
    }

    const raw = fileContents[filePath];
    if (typeof raw !== 'string') {
      contentErrors.push(`${filePath}: 无法读取文件内容，请检查文件是否已正确提交`);
      continue;
    }

    if (isProfile) {
      const filename = filePath.slice('data/profiles/'.length);
      const stem = filename.slice(0, -'.json'.length);
      const stemKey = stem.toLowerCase();
      const handleProblem = validateGithubHandle(stem);
      if (handleProblem) {
        contentErrors.push(`${filePath}: 文件名 "${stem}" 不是合法的 GitHub 用户名（${handleProblem}）`);
      }

      const existing = existingProfileMap.get(stemKey);
      if (existing && existing !== filename) {
        contentErrors.push(
          `${filePath}: 与已有文件 data/profiles/${existing} 用户名重复（不区分大小写），请直接修改原文件`
        );
      } else if (!existing) {
        existingProfileMap.set(stemKey, filename);
      }

      const hasBom = raw.charCodeAt(0) === 0xfeff;
      const parseTarget = hasBom ? raw.slice(1) : raw;
      let parsed;
      try {
        parsed = JSON.parse(parseTarget);
      } catch (error) {
        if (hasBom) {
          contentErrors.push(`${filePath}: JSON 文件不能包含 UTF-8 BOM`);
        }
        contentErrors.push(`${filePath}: JSON 解析失败，${error.message}`);
        continue;
      }

      contentErrors.push(...validateJsonFormatting(raw, parsed, filePath));
      const profileCheck = validateProfile(parsed, filename);
      contentErrors.push(...profileCheck.errors);
      continue;
    }

    if (isCheer) {
      const [target, cheerFilename] = filePath.slice('data/cheers/'.length).split('/');
      const targetKey = target.toLowerCase();
      const cheerStem = cheerFilename.slice(0, -'.json'.length);
      const fileKey = cheerFilename.toLowerCase();

      const targetHandleProblem = validateGithubHandle(target);
      if (targetHandleProblem) {
        contentErrors.push(`${filePath}: 目标目录名 "${target}" 不是合法的 GitHub 用户名（${targetHandleProblem}）`);
      }

      const fileHandleProblem = validateGithubHandle(cheerStem);
      if (fileHandleProblem) {
        contentErrors.push(`${filePath}: 寄语文件名 "${cheerStem}" 不是合法的 GitHub 用户名（${fileHandleProblem}）`);
      }

      if (!validTargets.has(targetKey)) {
        contentErrors.push(
          `${filePath}: 未找到目标贡献者 "${target}" 对应的 data/profiles/${target}.json`
        );
      }

      const existingTargetDir = seenCheerTargetDirs.get(targetKey);
      if (existingTargetDir && existingTargetDir !== target) {
        contentErrors.push(
          `data/cheers/${target}: 与已有目录 data/cheers/${existingTargetDir} 重复（不区分大小写），请使用相同的目录名大小写`
        );
      } else if (!existingTargetDir) {
        seenCheerTargetDirs.set(targetKey, target);
      }

      if (!seenCheerFilesByTarget.has(targetKey)) {
        seenCheerFilesByTarget.set(targetKey, new Map());
      }
      const targetFileMap = seenCheerFilesByTarget.get(targetKey);
      const existingCheerFile = targetFileMap.get(fileKey);
      if (existingCheerFile && existingCheerFile !== cheerFilename) {
        contentErrors.push(
          `${filePath}: 与已有文件 data/cheers/${existingTargetDir || target}/${existingCheerFile} 文件名重复（不区分大小写）`
        );
      } else if (!existingCheerFile) {
        targetFileMap.set(fileKey, cheerFilename);
      }

      if (!cheerFilesSetByTarget.has(targetKey)) {
        cheerFilesSetByTarget.set(targetKey, new Set());
      }
      const targetCheerSet = cheerFilesSetByTarget.get(targetKey);
      targetCheerSet.add(fileKey);
      if (targetCheerSet.size > CHEERS_MAX_PER_PROFILE && !reportedCheerLimitTargets.has(targetKey)) {
        reportedCheerLimitTargets.add(targetKey);
        contentErrors.push(`data/cheers/${target}: 寄语最多 ${CHEERS_MAX_PER_PROFILE} 条，请删减`);
      }

      const hasBom = raw.charCodeAt(0) === 0xfeff;
      const parseTarget = hasBom ? raw.slice(1) : raw;
      let parsed;
      try {
        parsed = JSON.parse(parseTarget);
      } catch (error) {
        if (hasBom) {
          contentErrors.push(`${filePath}: JSON 文件不能包含 UTF-8 BOM`);
        }
        contentErrors.push(`${filePath}: JSON 解析失败，${error.message}`);
        continue;
      }

      contentErrors.push(...validateJsonFormatting(raw, parsed, filePath));
      const cheerCheck = validateCheerEntry(parsed, filePath);
      contentErrors.push(...cheerCheck.errors);
    }
  }

  const errors = [...pathErrors, ...contentErrors];
  return {
    ok: errors.length === 0,
    skipped: false,
    prAuthor: String(prAuthor || '').trim(),
    pathErrors,
    contentErrors,
    errors
  };
}

function hasHoldLabel(labels = []) {
  const holdSet = new Set(HOLD_LABELS.map((item) => item.toLowerCase()));
  const matched = [];
  for (const label of Array.isArray(labels) ? labels : []) {
    const name = String(typeof label === 'string' ? label : (label?.name || '')).trim();
    if (!name) continue;
    if (holdSet.has(name.toLowerCase())) {
      matched.push(name);
    }
  }
  return matched;
}

function hasBlockingReview(reviews = []) {
  const latestByReviewer = new Map();
  for (const review of Array.isArray(reviews) ? reviews : []) {
    const login = String(review?.user?.login || '').trim();
    const state = String(review?.state || '').trim().toUpperCase();
    if (!login || !state) continue;
    if (state === 'COMMENTED' || state === 'PENDING') continue;
    latestByReviewer.set(login.toLowerCase(), { login, state });
  }

  const blockers = [];
  for (const entry of latestByReviewer.values()) {
    if (entry.state === 'CHANGES_REQUESTED') {
      blockers.push(entry.login);
    }
  }

  return {
    blocked: blockers.length > 0,
    reviewers: blockers
  };
}

function pickLatestById(items = []) {
  return [...items].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))[0] || null;
}

function isPendingStatus(status) {
  return ['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(
    String(status || '').trim().toLowerCase()
  );
}

function inspectValidationState({ checkRuns = [], workflowRuns = [] } = {}) {
  const runs = Array.isArray(checkRuns) ? checkRuns : [];
  const wfRuns = Array.isArray(workflowRuns) ? workflowRuns : [];

  const latestGuard = pickLatestById(runs.filter((run) => run?.name === 'pr-guard'));
  let prGuardState = 'missing';
  if (latestGuard) {
    if (latestGuard.status === 'completed') {
      prGuardState = latestGuard.conclusion === 'success' ? 'success' : 'failed';
    } else if (isPendingStatus(latestGuard.status)) {
      prGuardState = 'pending';
    }
  }

  const latestValidateCheck = pickLatestById(runs.filter((run) => run?.name === 'validate'));
  const latestValidateWf = pickLatestById(
    wfRuns.filter((run) => {
      const event = String(run?.event || '').toLowerCase();
      if (event && event !== 'pull_request') return false;
      const name = String(run?.name || '');
      const wfPath = String(run?.path || '');
      return name === 'Validate contributors' || wfPath.endsWith('/validate.yml') || wfPath === '.github/workflows/validate.yml';
    })
  );

  let validateState = 'missing';
  const workflowRunUrl = String(latestValidateWf?.html_url || latestValidateCheck?.html_url || '');

  const wfStatus = String(latestValidateWf?.status || '').toLowerCase();
  const wfConclusion = String(latestValidateWf?.conclusion || '').toLowerCase();
  const checkStatus = String(latestValidateCheck?.status || '').toLowerCase();
  const checkConclusion = String(latestValidateCheck?.conclusion || '').toLowerCase();

  if (checkStatus === 'completed' && checkConclusion === 'success') {
    validateState = 'success';
  } else if (
    wfStatus === 'action_required' ||
    wfConclusion === 'action_required' ||
    checkStatus === 'action_required' ||
    checkConclusion === 'action_required'
  ) {
    validateState = 'approval_required';
  } else if (isPendingStatus(checkStatus) || isPendingStatus(wfStatus)) {
    validateState = 'pending';
  } else if (
    (checkStatus === 'completed' && checkConclusion && checkConclusion !== 'success') ||
    (wfStatus === 'completed' && wfConclusion && wfConclusion !== 'success')
  ) {
    validateState = 'failed';
  }

  return {
    prGuardState,
    prGuardCompletedAt: String(latestGuard?.completed_at || ''),
    validateState,
    workflowRunUrl
  };
}

function evaluateAutoMergeCandidate({
  pr,
  reviews = [],
  labels = [],
  checkRuns = [],
  workflowRuns = [],
  maintainers = DEFAULT_MAINTAINERS,
  nowMs = Date.now(),
  waitMs = AUTO_MERGE_DELAY_MS,
  validateGraceMs = VALIDATE_MISSING_GRACE_MS
} = {}) {
  if (!pr || pr.state !== 'open' || pr.merged) {
    return { action: 'skip', reason: 'not_open' };
  }

  if (String(pr.base?.ref || '') !== 'main') {
    return { action: 'skip', reason: 'non_main_base' };
  }

  if (pr.draft) {
    return { action: 'skip', reason: 'draft' };
  }

  const prAuthor = String(pr.user?.login || '').trim();
  const maintainerSet = new Set(
    (Array.isArray(maintainers) ? maintainers : DEFAULT_MAINTAINERS)
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if (prAuthor && maintainerSet.has(prAuthor.toLowerCase())) {
    return { action: 'skip', reason: 'maintainer' };
  }

  const effectiveLabels = Array.isArray(labels) && labels.length ? labels : (pr.labels || []);
  const holdLabels = hasHoldLabel(effectiveLabels);
  if (holdLabels.length > 0) {
    return { action: 'skip', reason: 'hold_label', holdLabels };
  }

  const reviewState = hasBlockingReview(reviews);
  if (reviewState.blocked) {
    return { action: 'skip', reason: 'changes_requested', reviewers: reviewState.reviewers };
  }

  const headSha = String(pr.head?.sha || '').trim();
  const status = inspectValidationState({ checkRuns, workflowRuns });

  if (status.prGuardState === 'pending') {
    return { action: 'wait', reason: 'pr_guard_pending', retryAfterMs: 20_000, headSha };
  }

  if (status.prGuardState !== 'success') {
    return { action: 'skip', reason: `pr_guard_${status.prGuardState}`, headSha };
  }

  if (status.validateState === 'approval_required') {
    return {
      action: 'needs_maintainer',
      reason: 'validate_approval_required',
      headSha,
      workflowRunUrl: status.workflowRunUrl
    };
  }

  if (status.validateState === 'failed') {
    return { action: 'skip', reason: 'validate_failed', headSha };
  }

  if (status.validateState === 'pending') {
    return { action: 'wait', reason: 'validate_pending', retryAfterMs: 20_000, headSha };
  }

  const guardCompletedMs = Date.parse(status.prGuardCompletedAt || '') || 0;
  const createdMs = Date.parse(pr.created_at || '') || 0;
  const anchorMs = Math.max(guardCompletedMs, createdMs);

  if (status.validateState === 'missing') {
    const elapsedSinceGuard = guardCompletedMs > 0 ? Math.max(0, nowMs - guardCompletedMs) : 0;
    if (elapsedSinceGuard < validateGraceMs) {
      return {
        action: 'wait',
        reason: 'validate_missing_grace',
        retryAfterMs: Math.min(20_000, Math.max(5_000, validateGraceMs - elapsedSinceGuard)),
        headSha
      };
    }
    return {
      action: 'needs_maintainer',
      reason: 'validate_missing',
      headSha,
      workflowRunUrl: status.workflowRunUrl
    };
  }

  const remainingMs = anchorMs + waitMs - nowMs;
  if (remainingMs > 0) {
    return {
      action: 'wait',
      reason: 'cooling_down',
      remainingMs,
      retryAfterMs: Math.min(remainingMs, 60_000),
      headSha
    };
  }

  return {
    action: 'merge',
    reason: 'ready',
    headSha
  };
}

function formatGuardComment(
  result,
  {
    headSha = '',
    isDraft = false,
    approvalRequired = false,
    workflowRunUrl = '',
    maintainers = DEFAULT_MAINTAINERS
  } = {}
) {
  const authorMention = result.prAuthor ? `@${result.prAuthor} ` : '';
  const shortSha = String(headSha || '').trim().slice(0, 7);
  const shaBadge = shortSha ? `（提交 \`${shortSha}\`）` : '';

  if (result.ok) {
    let statusLine =
      '当 `validate` 检查全部通过、没有未解除的 `Request changes` 审查意见且未添加暂缓合并标签（`hold` / `do-not-merge`）时，自动合并队列将在约 10 分钟后将此 PR 合入 `main`（若期间推送了新修改，将重新审查并重新计时）。';

    if (isDraft) {
      statusLine =
        '当前为 **Draft PR**，不会自动合并。当你准备好后请点击 **Ready for review**，检查通过后约 10 分钟会自动合入 `main`。';
    } else if (approvalRequired) {
      const mentions = formatMaintainerMentions(maintainers);
      const runLink = workflowRunUrl ? `（[查看等待审批的检查](${workflowRunUrl})）` : '';
      const approvalMarker = buildNoticeMarker('validate_approval_required', headSha);
      statusLine = [
        approvalMarker,
        `> ⚠️ **需要老师协助处理**：${mentions}`,
        `> 检测到该 PR 的 \`validate\` 检查正等待维护者手动批准运行${runLink}（通常是新注册 GitHub 账号触发了平台安全限制）。`,
        '> 请老师点击下方的 **Approve and run**（通过后将自动合入），或确认无误后直接手动合并。'
      ].join('\n');
    }

    return [
      COMMENT_MARKER,
      `### ✅ 自动格式与路径审查通过${shaBadge}`,
      '',
      `${authorMention}这个 PR 的变更范围、文件命名和 JSON 格式均符合仓库规范。`,
      '',
      statusLine
    ].join('\n');
  }

  const lines = [
    COMMENT_MARKER,
    `### ❌ 自动格式与路径审查未通过${shaBadge}`,
    '',
    `${authorMention}请根据以下提示修改后重新 push（推送后机器人会自动回复新的审查结果）：`,
    ''
  ];

  if (result.pathErrors.length > 0) {
    lines.push('#### 1. 变更范围与路径问题');
    for (const err of result.pathErrors) {
      lines.push(`- ${err}`);
    }
    lines.push('');
  }

  if (result.contentErrors.length > 0) {
    lines.push(result.pathErrors.length > 0 ? '#### 2. 文件内容与格式问题' : '#### 文件内容与格式问题');
    for (const err of result.contentErrors) {
      lines.push(`- ${err}`);
    }
    lines.push('');
  }

  lines.push(
    '> 💡 提示：本地修改完成后可先运行 `npm run validate` 自检，确认无误后再 `git commit && git push`。'
  );

  return lines.join('\n');
}

function formatMaintainerNoticeComment({
  reason,
  prAuthor = '',
  headSha = '',
  maintainers = DEFAULT_MAINTAINERS,
  workflowRunUrl = '',
  errors = [],
  mergeError = ''
} = {}) {
  const marker = buildNoticeMarker(reason, headSha);
  const shortSha = String(headSha || '').trim().slice(0, 7);
  const shaBadge = shortSha ? `（提交 \`${shortSha}\`）` : '';
  const mentions = formatMaintainerMentions(maintainers);
  const authorMention = prAuthor ? `@${prAuthor}` : '同学';

  if (reason === 'validate_approval_required' || reason === 'validate_missing') {
    const runLink = workflowRunUrl ? `（[查看检查运行](${workflowRunUrl})）` : '';
    const detail =
      reason === 'validate_approval_required'
        ? `检测到 ${authorMention} 的 \`validate\` 检查正处于等待批准状态${runLink}（通常是新注册 GitHub 账号触发了平台安全策略，无法自动触发运行）。`
        : `超过等待窗口仍未检测到 \`validate\` 检查状态${runLink}，无法执行全自动合并。`;

    return [
      marker,
      `### 🧑‍🏫 需要老师手动处理${shaBadge}`,
      '',
      `${mentions}：此 PR 已通过 \`pr-guard\` 格式与路径审查，但${detail}`,
      '',
      '请老师进行以下任一操作：',
      '1. 点击下方 Checks 区域的 **Approve and run** 让 `validate` 运行（通过后机器人会自动完成合并，或老师直接点击 **Squash and merge**）；',
      '2. 核对改动无误后由有权限的维护者手动合并。'
    ].join('\n');
  }

  if (reason === 'main_recheck_failed') {
    const lines = [
      marker,
      `### ⚠️ 自动合并前复检未通过${shaBadge}`,
      '',
      `${authorMention} 在等待自动合并期间，主分支 \`main\` 已产生新变化，重新校验发现以下冲突或规范问题（已暂停自动合并）：`,
      ''
    ];
    for (const err of errors) {
      lines.push(`- ${err}`);
    }
    lines.push(
      '',
      '> 请先同步主仓库最新 `main`（`git fetch upstream && git merge upstream/main`），修复后运行 `npm run validate` 再重新 push。'
    );
    return lines.join('\n');
  }

  const lines = [
    marker,
    `### ⚠️ 自动合并未能完成${shaBadge}`,
    '',
    `${authorMention}（抄送 ${mentions}）：自动合并队列尝试合入此 PR 时被 GitHub 拒绝，原因为：`,
    '',
    `> ${String(mergeError || '未知错误').replace(/\r?\n/g, ' ')}`,
    '',
    '- 若提示存在 **Merge conflict / not mergeable**：请先执行 `git fetch upstream && git merge upstream/main` 解决冲突后再 push。',
    '- 若提示受分支保护规则或检查项拦截：请老师确认检查状态后手动合并。'
  ];

  return lines.join('\n');
}

module.exports = {
  COMMENT_MARKER,
  NOTICE_MARKER_PREFIX,
  HOLD_LABELS,
  AUTO_MERGE_DELAY_MS,
  VALIDATE_MISSING_GRACE_MS,
  mapGithubStatus,
  normalizeGithubPrFiles,
  formatMaintainerMentions,
  buildNoticeMarker,
  evaluatePrGuard,
  hasHoldLabel,
  hasBlockingReview,
  inspectValidationState,
  evaluateAutoMergeCandidate,
  formatGuardComment,
  formatMaintainerNoticeComment,
  listProfileFiles,
  listCheerFiles,
  parseMaintainers
};
