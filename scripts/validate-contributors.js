#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROFILES_DIR = path.join(ROOT, 'data', 'profiles');
const CHEERS_DIR = path.join(ROOT, 'data', 'cheers');

const CHEERS_MAX_PER_PROFILE = 50;
const CHEER_MESSAGE_MAX_LENGTH = 80;
const TEMPLATE_FILENAME = '_template.json';

const ALLOWED_PROFILE_KEYS = new Set(['name', 'motto', 'city']);
const ALLOWED_CHEER_KEYS = new Set(['message']);

function getDirs(rootDir = ROOT) {
  return {
    rootDir,
    profilesDir: path.join(rootDir, 'data', 'profiles'),
    cheersDir: path.join(rootDir, 'data', 'cheers')
  };
}

function listProfileFiles(rootDir = ROOT) {
  const { profilesDir } = getDirs(rootDir);
  if (!fs.existsSync(profilesDir)) {
    return [];
  }

  return fs.readdirSync(profilesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function listCheerFiles(rootDir = ROOT) {
  const { cheersDir } = getDirs(rootDir);
  if (!fs.existsSync(cheersDir)) {
    return [];
  }

  const items = [];
  const entries = fs.readdirSync(cheersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dirEntry of entries) {
    const target = dirEntry.name;
    const targetDir = path.join(cheersDir, target);
    const files = fs.readdirSync(targetDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      items.push({
        target,
        file,
        relPath: `data/cheers/${target}/${file}`
      });
    }
  }

  return items;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateGithubHandle(value) {
  if (typeof value !== 'string') return 'github 必须是字符串';
  const trimmed = value.trim();
  if (!trimmed) return 'github 不能为空';
  if (trimmed.length > 39) return 'github 不能超过 39 个字符';
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) return 'github 只能包含字母、数字和连字符';
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) return 'github 不能以连字符开头或结尾';
  if (trimmed.includes('--')) return 'github 不能包含连续连字符';
  return null;
}

function isHttpUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateJsonFormatting(rawText, parsed, label) {
  const errors = [];

  if (typeof rawText !== 'string') {
    return errors;
  }

  if (rawText.charCodeAt(0) === 0xfeff) {
    errors.push(`${label}: JSON 文件不能包含 UTF-8 BOM`);
    return errors;
  }

  if (rawText.includes('\r')) {
    errors.push(`${label}: JSON 文件请使用 LF（\\n）换行符，不要使用 CRLF`);
    return errors;
  }

  const expected = JSON.stringify(parsed, null, 2);
  if (rawText !== expected && rawText !== `${expected}\n`) {
    errors.push(`${label}: JSON 排版不符合规范，请使用 2 空格缩进的标准格式（不要包含多余空行或尾随空格）`);
  }

  return errors;
}

function requiredString(profile, key, label, errors, filename, maxLength = 80) {
  const value = profile[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${filename}: ${label} 必须填写`);
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push(`${filename}: ${label} 过长，最多 ${maxLength} 个字符`);
  }
}

function validateCheerEntry(entry, relPath) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(entry)) {
    return {
      errors: [`${relPath}: 文件内容必须是一个 JSON 对象，例如 { "message": "加油！" }`],
      warnings
    };
  }

  const autoResolvedKeys = Object.keys(entry).filter((key) => key === 'from' || key === 'ts');
  if (autoResolvedKeys.length > 0) {
    errors.push(
      `${relPath}: 无需填写 ${autoResolvedKeys.join('、')}，系统会根据提交该文件的 PR 自动识别寄语人与时间，请仅保留 message 字段`
    );
  }

  const unknownKeys = Object.keys(entry).filter(
    (key) => key !== 'from' && key !== 'ts' && !ALLOWED_CHEER_KEYS.has(key)
  );
  if (unknownKeys.length > 0) {
    errors.push(
      `${relPath}: 包含未允许的字段 ${unknownKeys.join(', ')}（仅允许 message）`
    );
  }

  if (typeof entry.message !== 'string' || entry.message.trim().length === 0) {
    errors.push(`${relPath}: message 必须填写`);
  } else if (entry.message.trim().length > CHEER_MESSAGE_MAX_LENGTH) {
    errors.push(`${relPath}: message 过长，最多 ${CHEER_MESSAGE_MAX_LENGTH} 个字符`);
  }

  return { errors, warnings };
}

function validateProfile(profile, filename) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(profile)) {
    return { errors: [`${filename}: 文件内容必须是一个 JSON 对象`], warnings };
  }

  if (profile.cheers !== undefined) {
    errors.push(
      `${filename}: 寄语已改为独立文件，请删除 cheers 字段，并创建 data/cheers/<目标用户名小写>/<你的GitHub用户名>.json（仅需填写 { "message": "..." }）`
    );
  }

  const unknownKeys = Object.keys(profile).filter(
    (key) => key !== 'cheers' && !ALLOWED_PROFILE_KEYS.has(key)
  );
  if (unknownKeys.length > 0) {
    errors.push(
      `${filename}: 包含未允许的字段 ${unknownKeys.join(', ')}（仅允许 name、motto、city）`
    );
  }

  requiredString(profile, 'name', 'name', errors, filename, 40);
  if (typeof profile.name === 'string' && profile.name.trim() === '你的名字' && !String(filename).startsWith('_')) {
    errors.push(`${filename}: 请将 name 从模板默认值「你的名字」改成你自己的名字或昵称`);
  }

  requiredString(profile, 'motto', 'motto', errors, filename, 120);

  if (profile.city !== undefined && (typeof profile.city !== 'string' || profile.city.trim().length > 40)) {
    errors.push(`${filename}: city 必须是 40 个字符以内的字符串`);
  }

  return { errors, warnings };
}

function readAndValidateAll({ rootDir = ROOT } = {}) {
  const { profilesDir, cheersDir } = getDirs(rootDir);
  const errors = [];
  const warnings = [];
  const contributors = [];
  const validTargets = new Set();
  const seenProfileStems = new Map();

  if (fs.existsSync(profilesDir)) {
    const profileEntries = fs.readdirSync(profilesDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of profileEntries) {
      const name = entry.name;
      const relPath = `data/profiles/${name}`;
      const fullPath = path.join(profilesDir, name);

      if (entry.isDirectory()) {
        errors.push(`${relPath}: 不允许在 data/profiles/ 下创建子目录`);
        continue;
      }

      if (!entry.isFile()) {
        errors.push(`${relPath}: 不允许非普通文件`);
        continue;
      }

      if (name === TEMPLATE_FILENAME) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          errors.push(...validateJsonFormatting(raw, parsed, relPath));
        } catch (error) {
          errors.push(`${relPath}: 模板 JSON 解析失败，${error.message}`);
        }
        continue;
      }

      if (name.startsWith('_')) {
        errors.push(`${relPath}: 文件名不能以 "_" 开头（除 ${TEMPLATE_FILENAME} 外）`);
        continue;
      }

      if (!name.endsWith('.json')) {
        errors.push(`${relPath}: 文件必须以 .json 结尾`);
        continue;
      }

      const stem = name.slice(0, -'.json'.length);
      const handleProblem = validateGithubHandle(stem);
      if (handleProblem) {
        errors.push(`${relPath}: 文件名 "${stem}" 不是合法的 GitHub 用户名（${handleProblem}）`);
      }

      const stemKey = stem.trim().toLowerCase();
      if (stemKey) {
        if (seenProfileStems.has(stemKey)) {
          errors.push(
            `${relPath}: 与 data/profiles/${seenProfileStems.get(stemKey)} 用户名重复（不区分大小写），请只保留一个`
          );
        } else {
          seenProfileStems.set(stemKey, name);
          validTargets.add(stemKey);
        }
      }

      let raw;
      let profile;
      try {
        raw = fs.readFileSync(fullPath, 'utf8');
        const hasBom = raw.charCodeAt(0) === 0xfeff;
        profile = JSON.parse(hasBom ? raw.slice(1) : raw);
      } catch (error) {
        if (typeof raw === 'string' && raw.charCodeAt(0) === 0xfeff) {
          errors.push(`${relPath}: JSON 文件不能包含 UTF-8 BOM`);
        }
        errors.push(`${name}: JSON 解析失败，${error.message}`);
        continue;
      }

      errors.push(...validateJsonFormatting(raw, profile, relPath));

      const result = validateProfile(profile, name);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      contributors.push({ ...profile, file: name });
    }
  }

  if (contributors.length === 0) {
    warnings.push('当前还没有贡献者文件。课堂上每位同学可以从 data/profiles/_template.json 复制一份。');
  }

  const cheerEntries = [];
  const cheersCountByTarget = new Map();
  const seenCheerTargetDirs = new Map();

  if (fs.existsSync(cheersDir)) {
    const topEntries = fs.readdirSync(cheersDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const dirEntry of topEntries) {
      const target = dirEntry.name;
      const topRelPath = `data/cheers/${target}`;
      const targetDir = path.join(cheersDir, target);

      if (dirEntry.isFile() && target === TEMPLATE_FILENAME) {
        try {
          const raw = fs.readFileSync(targetDir, 'utf8');
          const parsed = JSON.parse(raw);
          errors.push(...validateJsonFormatting(raw, parsed, topRelPath));
        } catch (error) {
          errors.push(`${topRelPath}: 模板 JSON 解析失败，${error.message}`);
        }
        continue;
      }

      if (!dirEntry.isDirectory()) {
        errors.push(
          `${topRelPath}: 寄语文件必须放在 data/cheers/<目标用户名小写>/<你的GitHub用户名>.json 子目录中，不能直接放在 data/cheers/ 下`
        );
        continue;
      }

      if (target.startsWith('_')) {
        errors.push(`${topRelPath}: 寄语目标目录名不能以 "_" 开头`);
        continue;
      }

      const targetHandleProblem = validateGithubHandle(target);
      if (targetHandleProblem) {
        errors.push(`${topRelPath}: 目标目录名 "${target}" 不是合法的 GitHub 用户名（${targetHandleProblem}）`);
      }

      if (target !== target.toLowerCase()) {
        errors.push(
          `${topRelPath}: 寄语目标目录名必须使用全小写（请改为 data/cheers/${target.toLowerCase()}）`
        );
      }

      const targetKey = target.trim().toLowerCase();
      if (seenCheerTargetDirs.has(targetKey)) {
        errors.push(
          `${topRelPath}: 与 data/cheers/${seenCheerTargetDirs.get(targetKey)} 目标目录重复（不区分大小写），请合并为同一个目录`
        );
      } else {
        seenCheerTargetDirs.set(targetKey, target);
      }

      const childEntries = fs.readdirSync(targetDir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));
      const seenCheerFiles = new Map();

      for (const child of childEntries) {
        const file = child.name;
        const relPath = `data/cheers/${target}/${file}`;
        const fullPath = path.join(targetDir, file);

        if (child.isDirectory()) {
          errors.push(`${relPath}: 不允许在寄语目录下嵌套子目录`);
          continue;
        }

        if (!child.isFile()) {
          errors.push(`${relPath}: 不允许非普通文件`);
          continue;
        }

        if (file.startsWith('_')) {
          errors.push(`${relPath}: 寄语文件名不能以 "_" 开头`);
          continue;
        }

        if (!file.endsWith('.json')) {
          errors.push(`${relPath}: 寄语文件必须以 .json 结尾`);
          continue;
        }

        const fileStem = file.slice(0, -'.json'.length);
        const fileHandleProblem = validateGithubHandle(fileStem);
        if (fileHandleProblem) {
          errors.push(`${relPath}: 寄语文件名 "${fileStem}" 必须是合法的 GitHub 用户名（${fileHandleProblem}）`);
        }

        const fileKey = file.toLowerCase();
        if (seenCheerFiles.has(fileKey)) {
          errors.push(
            `${relPath}: 与 data/cheers/${target}/${seenCheerFiles.get(fileKey)} 文件名重复（不区分大小写）`
          );
        } else {
          seenCheerFiles.set(fileKey, file);
        }

        if (!validTargets.has(targetKey)) {
          errors.push(`${relPath}: 未找到目标贡献者 "${target}" 对应的 data/profiles/${target}.json`);
        }

        const nextCount = (cheersCountByTarget.get(targetKey) || 0) + 1;
        cheersCountByTarget.set(targetKey, nextCount);
        if (nextCount === CHEERS_MAX_PER_PROFILE + 1) {
          errors.push(`data/cheers/${target}: 寄语最多 ${CHEERS_MAX_PER_PROFILE} 条，请删减`);
        }

        let raw;
        let parsed;
        try {
          raw = fs.readFileSync(fullPath, 'utf8');
          const hasBom = raw.charCodeAt(0) === 0xfeff;
          parsed = JSON.parse(hasBom ? raw.slice(1) : raw);
        } catch (error) {
          if (typeof raw === 'string' && raw.charCodeAt(0) === 0xfeff) {
            errors.push(`${relPath}: JSON 文件不能包含 UTF-8 BOM`);
          }
          errors.push(`${relPath}: JSON 解析失败，${error.message}`);
          continue;
        }

        errors.push(...validateJsonFormatting(raw, parsed, relPath));

        const result = validateCheerEntry(parsed, relPath);
        errors.push(...result.errors);
        warnings.push(...result.warnings);

        cheerEntries.push({
          target,
          file,
          relPath,
          message: typeof parsed?.message === 'string' ? parsed.message.trim() : ''
        });
      }
    }
  }

  return { contributors, cheerEntries, errors, warnings };
}

if (require.main === module) {
  const { contributors, cheerEntries, errors, warnings } = readAndValidateAll();

  console.log('\nOpen Source Pulse Wall validation');
  console.log(`Profiles: ${contributors.length}`);
  console.log(`Cheers: ${cheerEntries.length}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach((error) => console.log(`  ✗ ${error}`));
    console.log('\nValidation failed. Fix the file and run npm run validate again.\n');
    process.exit(1);
  }

  console.log('\nValidation passed. Ready to open a Pull Request.\n');
}

module.exports = {
  listProfileFiles,
  listCheerFiles,
  readAndValidateAll,
  validateProfile,
  validateCheerEntry,
  validateGithubHandle,
  validateJsonFormatting,
  isHttpUrl,
  isHttpsUrl,
  ALLOWED_PROFILE_KEYS,
  ALLOWED_CHEER_KEYS,
  CHEERS_MAX_PER_PROFILE,
  CHEER_MESSAGE_MAX_LENGTH
};
