# Open Source Pulse Wall

一个一节课就能跑通完整开源闭环的 Git 协作实践项目。从 **Fork** 出发，亲手走完 **Clone → Branch → Validate → Commit → Push → Pull Request → Review → Merge** 全流程；每一次合并与互动都会实时点亮课堂展示墙。

- **在线协作展示墙**：<https://pulse-wall.yoryon.com/>
- **进阶积分玩法**：[SCORING.md](./SCORING.md)
- **拓展阅读 · 从零理解 Git 底层原理**：<https://yoryon.com/c/git-from-scratch/>

## 课堂四项任务

1. **上墙个人卡片**：在 `data/profiles/` 下创建自己的 JSON 卡片，完成人生第一个开源 PR。
2. **给同学写寄语**（Cheers）：在 `data/cheers/<同学用户名>/` 下留下一句鼓励，互相点亮寄语角标。
3. **提一个 Issue**：用仓库内置模板提问、报 Bug 或提改进想法。
4. **参与 PR Review**：邀请至少一位同学 Review 你的 PR，并给同学的 PR 留下一条 Review 评论。

> **可选趣味玩法**：以上四项就是本次培训的全部任务，不点 Star 也完全可以正常上墙、走完整个 Git 协作流程。如果你想给自己的卡片换上特殊皮肤、加上动画特效，或者冲一冲积分排行榜，可以顺手给本仓库点一下 **Star** 开启，具体玩法见 [SCORING.md](./SCORING.md)。

## 贡献步骤指南

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
| `relic` | 否 | 进阶玩法可选：填入通过 Git 考古挖出的暗号（字符串或最多 2 个元素的数组，详见 [SCORING.md](./SCORING.md)） |

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
- **目标目录名**（`<同学用户名全小写>`）：**必须全部小写**（例如给 `Divine-Ashes` 写寄语，目录为 `data/cheers/divine-ashes/`），防止并发提交产生大小写重复目录。
- **文件名**：**必须使用你自己的 GitHub 用户名**（`<你的GitHub用户名>.json`，CI 会校验文件名与你的 PR 提交账号一致）。因为每位同学的 GitHub 用户名全局唯一，多人同时给同一位同学写寄语完全不会发生 Git 冲突，后续你也可以直接修改自己的同名文件来更新寄语：

```bash
git fetch upstream
git checkout main
git merge upstream/main
git checkout -b cheer/octocat

mkdir -p data/cheers/octocat
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

### 第四步：参与 Issue 与 PR Review

- **提一个 Issue**：打开仓库 [Issues 页面](../../issues/new/choose)，选择对应模板（提问或求助 / 报 Bug / 改进想法）提交。
- **邀请同学 Review**：在你的 PR 页面右侧栏点击 `Reviewers` 齿轮图标，选择至少 1 位同学（也可在 PR 描述里 `@同学用户名` 请对方帮忙看）；老师 `@nanzhi84` 与 `@YJLEC` 会由 `CODEOWNERS` 自动指派。
- **给同学做 Review**：点进任意同学的开放 PR，切到 `Files changed` 查看改动，留下一条友好的评论或 `Approve`。
- **修改后重新通知 Reviewer**：如果你根据意见更新了代码，记得点右侧 Reviewer 头像旁的 **循环箭头**（Re-request review），对方才会再次收到通知。
- **自动审查与合并机制**：PR 提交后会自动运行 `pr-guard`（路径与格式检查）和 `validate`（测试与全量数据校验）。当两项检查全部通过、没有未解除的 `Request changes` 审查意见、且未标记 `hold` / `do-not-merge` 标签时，串行自动合并队列会在约 **10 分钟后自动合入 `main`** 并触发展示墙更新；如果是**刚注册的 GitHub 账号**触发了平台首次外部 PR 审批限制，机器人会自动 `@` 老师协助批准运行或手动合并。

### 第五步（可选）：体验皮肤与积分玩法

这一步完全可选，不影响培训完成。如果你有兴趣，可以给本仓库点一下 **Star**（约 30 秒后刷新展示墙生效），给自己的卡片换上专属皮肤并加入排行榜；之后通过给同学写寄语、和同学一起写 `Co-authored-by` 结对提交，或者翻一翻 Git 历史找彩蛋，就能继续攒分升级卡片动画。详细规则和命令示例见 [SCORING.md](./SCORING.md)。

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
git remote -v                                 # 检查 origin（自己）与 upstream（主仓库）地址
git fetch upstream                            # 拉取主仓库最新提交
git merge upstream/main                       # 将主仓库最新主干合并到当前分支
git rebase upstream/main                      # 进阶：线性变基（需配合 --force-with-lease 推送）
git push --force-with-lease origin <branch>   # rebase 后的安全推送命令
git log -S "<关键词>" -p                      # 进阶：Git 历史考古，检索曾经出现过的字符串变更
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
│       ├── auto-merge-queue.yml    # 串行自动合并队列（10 分钟静置 + 复检 + 触发部署 + 新号提醒老师）
│       └── pages.yml               # 合并 main / 收到 Star 时自动构建并发布展示墙
├── cloudflare/
│   └── worker.mjs                  # 3 分钟快照缓存 API + 积分聚合 + Star 自动同步
├── data/
│   ├── profiles/                   # 每位贡献者的个人卡片 data/profiles/<GitHub用户名>.json
│   │   └── _template.json
│   ├── cheers/                     # 独立寄语 data/cheers/<目标用户名全小写>/<你的GitHub用户名>.json
│   │   └── _template.json
│   └── relics.json                 # Git 考古彩蛋哈希配置（仅存 SHA-256，不存明文）
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

<!-- e2e test -->
