# Open Source Pulse Wall

一个一节课就能跑通完整开源闭环的 Git 协作实践项目。从 **Fork** 出发，亲手走完 **Clone → Branch → Validate → Commit → Push → Pull Request → Review → Merge** 全流程；每一次合并与互动都会实时点亮课堂展示墙。

- **在线协作展示墙**：<https://pulse-wall.yoryon.com/>
- **进阶积分玩法**：[SCORING.md](./SCORING.md)
- **拓展阅读 · 从零理解 Git 底层原理**：<https://yoryon.com/c/git-from-scratch/>

## 课堂三项任务

1. **上墙个人卡片**：在 `data/profiles/` 下创建自己的 JSON 卡片，完成第一个开源 PR。
2. **给同学写寄语**：在 `data/cheers/<同学用户名全小写>/` 下留下一句鼓励，互相点亮寄语角标。
3. **提一个 Issue**：遇到真实问题、Bug 或有改进想法时，用仓库内置模板提交 Issue。

> **可选趣味玩法**：完成以上三项即可跑通完整 Git 协作流程。如果还想解锁专属卡片皮肤、破框动画与 Top 5 排行榜，可以给本仓库点一下 **Star**，并在现场互相帮助时和同学一起用 `Co-authored-by` 结对提交攒分，详见 [SCORING.md](./SCORING.md)。

## 贡献步骤指南

### 省流版：直接复制给 AI Agent

不想一步步手动敲命令，可以把下面这段 Prompt 直接发给你的 AI 编程助手，由它带你完成第零步到第三步：

```text
请帮我完成开源项目 nanzhi84/open-source-pulse-wall 的第零步到第三步贡献流程，严格遵循仓库 README.md 的最新规范：

1. 环境与鉴权：检查本机是否已安装 git、gh 和 Node.js 18+。未安装则按当前系统用纯命令行安装 git 与 gh；检查 `gh auth status`，未登录则运行 `gh auth login -h github.com -p https -w` 并在需要浏览器确认时暂停等我完成，随后执行 `gh auth setup-git` 并配置 git user.name 与 user.email。
2. Fork 与个人卡片：使用 `gh repo fork nanzhi84/open-source-pulse-wall --clone` 克隆仓库。在创建卡片前先向我询问 name、motto、city，不要替我编造。随后新建分支，在 data/profiles/<我的GitHub用户名>.json 写入 2 空格缩进的合法 JSON，运行 `npm run validate` 通过后提交并发起 PR，把 PR 链接和 `gh pr checks` 结果发给我。
3. 给同学写寄语：列出 data/profiles/ 下已上墙的同学名单，询问我想给哪位同学写什么寄语，再从最新 upstream/main 切出新分支，创建 data/cheers/<目标用户名全小写>/<我的GitHub用户名>.json（仅含 message 字段且不超过 80 字），运行 `npm run validate` 通过后提交并发起 PR。
4. 严格边界：不要修改其他文件或模板文件；不要替我自动创建 Issue；不要擅自对任何人的 PR 发表 Review 评论或点击 Request changes。如果第四步提 Issue 需要你协助，仅在我明确给出真实问题或想法后帮我起草内容并等我确认。
```

### 第零步：安装 Git 与 GitHub CLI 并完成鉴权

`git` 负责本地版本管理，`gh` 是 GitHub 官方命令行工具，把 Fork、PR、Issue、Review 与 CI 检查全部搬进终端。两者装好并完成鉴权后，你和 AI Agent 都可以直接在命令行驱动完整协作流程。

**Windows**

```powershell
winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
winget install --id GitHub.cli -e --source winget --silent --accept-package-agreements --accept-source-agreements
```

安装完成后重开终端生效。

**macOS**

```bash
# 未安装 Homebrew 先执行此句，装完按终端末尾 Next steps 提示配置 PATH
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git gh
```

**Linux**

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y git
sudo snap install gh --classic

# Fedora / RHEL
sudo dnf install -y git gh
```

**配置 Git 身份**

```bash
git --version && gh --version
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub绑定邮箱"
```

**获取可信凭据并授权给命令行与 Agent**

首选通过官方 OAuth 登录，凭据会安全写入系统钥匙串，同时自动接管 `git push` 鉴权，本地不留明文密钥：

```bash
gh auth login -h github.com -p https -w
gh auth setup-git
gh auth status
```

按终端提示复制一次性设备码并在浏览器确认即可。此后本机的 `git`、`gh` 以及调用它们的 AI Agent 都会自动复用这份可信凭据。

如果在无浏览器环境运行，或需要给特定 Agent 分配严格收敛的最小权限，可生成 **Fine-grained Personal Access Token**：

1. 打开 <https://github.com/settings/personal-access-tokens/new>
2. 仅选择目标仓库，按需勾选 **Contents**、**Pull requests**、**Issues** 的 Read and write 权限，并设置较短有效期。
3. 通过环境变量 `GH_TOKEN` 注入会话，切勿把 Token 写入任何代码、配置文件或 `git commit`：

```bash
# macOS / Linux
export GH_TOKEN="<你的Token>"
gh auth status

# Windows PowerShell
$env:GH_TOKEN="<你的Token>"
gh auth status
```

鉴权完成后，可直接用命令行或交给 Agent 跑通协作流程：

```bash
gh repo fork nanzhi84/open-source-pulse-wall --clone   # 自动 Fork、Clone 并配置 upstream
gh pr create --fill                                    # 直接发起 Pull Request
gh pr checks                                           # 查看自动审查与校验状态
gh issue create                                        # 命令行提交 Issue
```

### 第一步：Fork & Clone

1. 点击本仓库右上角的 **Fork**，复制一份仓库到你自己的 GitHub 账号下。
2. 将你自己的 Fork 克隆到本地，并把主仓库添加为 `upstream`：

```bash
git clone https://github.com/<你的GitHub用户名>/open-source-pulse-wall.git
cd open-source-pulse-wall
git remote add upstream https://github.com/nanzhi84/open-source-pulse-wall.git
```

### 第二步：提交你的个人卡片（Profile）

切出新分支，复制模板文件（文件名**必须使用你自己的 GitHub 用户名**，支持保留原大小写或小写）：

```bash
git checkout -b add-my-profile
cp data/profiles/_template.json data/profiles/<你的GitHub用户名>.json
```

> **为什么用 GitHub 用户名做文件名不会和同学冲突？**
> 在 GitHub 上，`alice` 和 `Alice` 不可能是两个人——GitHub 用户名全局不区分大小写，只要有人注册了 `Alice`，别人就不可能再注册 `alice`，访问 `github.com/alice` 和 `github.com/Alice` 都是同一个账号，因此以你的 GitHub 用户名命名文件绝对不会和他人重合（CI 也会自动校验文件名与你提交 PR 的 GitHub 账号一致，且不允许大小写重复文件）。

打开 `data/profiles/<你的GitHub用户名>.json`，只需填写 3 个字段：

```json
{
  "name": "你的名字",
  "motto": "今天完成我的第一个开源 PR",
  "city": "Beijing"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 填什么都可以，建议填真名让大家认识你（最多 40 个字符，请勿保留默认值「你的名字」） |
| `motto` | 是 | 一句话介绍或座右铭（最多 120 个字符） |
| `city` | 否 | 所在城市或课堂位置（最多 40 个字符） |

本地运行校验（仅需 Node.js 18+，无需 `npm install`），通过后推送并发起 PR：

```bash
npm run validate
git add data/profiles/<你的GitHub用户名>.json
git commit -m "feat: add my contributor profile"
git push origin add-my-profile
```

回到 GitHub 页面点击 **Compare & pull request**，目标仓库确认是 `nanzhi84/open-source-pulse-wall` 的 `main` 分支。

### 第三步：给同学写寄语（Cheers）

等你的卡片合并后，给至少一位已经上墙的同学留一句寄语。每条寄语是一个独立 JSON 小文件：
- **目标目录名**：必须全小写，例如给 `Divine-Ashes` 写寄语时目录为 `data/cheers/divine-ashes/`。
- **文件名**：必须使用你自己的 GitHub 用户名 `data/cheers/<目标用户名>/<你的GitHub用户名>.json`。多人同时给同一位同学写寄语不会冲突，后续也可以直接修改同名文件更新寄语：

```bash
git fetch upstream
git checkout main
git merge upstream/main
git checkout -b cheer/octocat

mkdir -p data/cheers/octocat   # PowerShell 去掉 -p
cp data/cheers/_template.json data/cheers/octocat/<你的GitHub用户名>.json
```

打开该文件，**只允许填写 `message` 这一个字段**（80 字以内，不允许添加其他任何字段）：

```json
{
  "message": "你的 commit message 写得很清楚，赞！"
}
```

校验、提交并推送开 PR：

```bash
npm run validate
git add data/cheers/octocat/<你的GitHub用户名>.json
git commit -m "feat: cheer @octocat"
git push origin cheer/octocat
```

### 第四步：提一个 Issue 与等待自动合并

- **提一个 Issue**：打开仓库 [Issues 页面](https://github.com/nanzhi84/open-source-pulse-wall/issues/new/choose)，选择对应模板提交你真实遇到的卡点、发现的 Bug 或具体改进想法。提交前先在 Issues 列表搜索确认不重复；可以让 Agent 帮你整理复现步骤或草稿，但必须由本人核对后再发，不要让 Agent 凭空编造问题。
- **自动审查与合并**：PR 提交后会自动运行 `pr-guard` 与 `validate`，老师 `@nanzhi84` 与 `@YJLEC` 会由 `CODEOWNERS` 自动收到审阅通知。两项检查通过、无人提出 `Request changes` 且未标记 `hold` / `do-not-merge` 标签时，自动合并队列会在约 **10 分钟后合入 `main`** 并触发展示墙更新；刚注册的 GitHub 账号若触发平台安全限制，机器人会自动 `@` 老师协助处理。

### 第五步：现场互助与积分玩法（可选）

这一步完全可选，不影响培训完成。完成主线后可以点一下仓库右上角的 **Star** 开启专属皮肤与排行榜，并在现场互相帮助还没有跑通流程的同学——和同学一起用 `Co-authored-by` 结对提交，就能攒分升级卡片动画。详细规则和命令示例见 [SCORING.md](./SCORING.md)。

## 遇到分支落后或冲突怎么办？

当主仓库 `main` 已经合入了新提交、你需要同步最新代码（或 PR 提示 `This branch has conflicts that must be resolved`）时，推荐使用最稳妥的 `merge` 流程：

```bash
git fetch upstream
git checkout <你的当前分支名>
git merge upstream/main
```

如果出现冲突标记（`<<<<<<<`、`=======`、`>>>>>>>`）：

1. 打开冲突文件，删掉冲突标记行，保留正确的 JSON 内容。
2. 运行 `npm run validate` 确认格式无误。
3. 执行 `git add <文件> && git commit && git push origin <你的当前分支名>`，PR 会自动更新。

## 常用命令速查

```bash
npm run validate                              # 本地校验所有 profile 与 cheers JSON
gh auth status                                # 检查 GitHub CLI 当前登录与权限状态
gh repo fork nanzhi84/open-source-pulse-wall --clone  # Fork、Clone 并自动配置 upstream
gh pr create --fill                           # 命令行直接发起 PR
gh pr checks                                  # 查看当前分支 PR 的自动检查结果
git remote -v                                 # 检查 origin 与 upstream 地址
git fetch upstream                            # 拉取主仓库最新提交
git merge upstream/main                       # 将主仓库最新主干合并到当前分支
git rebase upstream/main                      # 进阶：线性变基，配合 --force-with-lease 推送
git push --force-with-lease origin <branch>   # rebase 后的安全推送命令
```

## 拓展阅读：从零看懂 Git 底层原理

跑通一遍 `clone → branch → commit → push → merge` 之后，你可能会好奇：

- `.git` 隐藏文件夹里到底存了什么？为什么 Git 不是在存「文件差异（diff）」，而是在存快照？
- `blob`、`tree`、`commit` 三种核心对象是怎么靠 SHA-1 哈希串成一棵不可篡改的有向无环图（DAG）的？
- 为什么新建一个分支在底层其实只是写了一个几十字节的文本文件？

推荐阅读我的个人博客专栏 👉 **[Git From Scratch — 从零理解 Git 底层原理](https://yoryon.com/c/git-from-scratch/)**。把黑盒命令背后的对象模型和指针看透之后，以后无论遇到多复杂的分支、变基还是冲突现场，你都能在脑海里直接画出它的拓扑图。

## 目录结构

```text
open-source-pulse-wall/
├── README.md                       # 课堂入门与标准 PR 贡献指南
├── SCORING.md                      # 可选的进阶积分与卡片皮肤玩法说明
├── .github/
│   ├── CODEOWNERS                  # 自动指派老师与维护者 Review（@nanzhi84 @YJLEC）
│   ├── ISSUE_TEMPLATE/             # 提问求助 / Bug / 改进想法 模板
│   ├── PULL_REQUEST_TEMPLATE.md    # PR 自检清单
│   └── workflows/
│       ├── validate.yml            # PR 与主干自动运行测试与数据校验
│       ├── pr-guard.yml            # 防篡改路径锁 + 自动格式审查评论 Bot
│       ├── review-wakeup.yml       # Review 提交/解除时唤醒自动合并队列
│       ├── auto-merge-queue.yml    # 串行自动合并队列（10 分钟静置 + 复检 + 触发部署 + 新号提醒老师）
│       └── pages.yml               # 合并 main / 收到 Star 时自动构建并发布展示墙
├── cloudflare/
│   └── worker.mjs                  # 3 分钟快照缓存 API + 积分聚合 + Star 自动同步
├── data/
│   ├── profiles/                   # 每位贡献者的个人卡片 data/profiles/<GitHub用户名>.json
│   │   └── _template.json
│   ├── cheers/                     # 独立寄语 data/cheers/<目标用户名全小写>/<你的GitHub用户名>.json
│   │   └── _template.json
├── public/
│   ├── index.html                  # 展示墙主页面（含 Top 5 排行榜）
│   ├── styles.css                  # 页面样式与星标卡片皮肤
│   ├── app.js                      # 展示墙渲染、筛选排序与交互逻辑
│   └── vfx-engine.js               # 卡片动画与特效渲染引擎
├── scripts/                        # 校验脚本、积分引擎、静态构建与部署工具
└── test/                           # 自动化测试套件
```

## 许可证

MIT

<!-- e2e-invalid-touch -->
