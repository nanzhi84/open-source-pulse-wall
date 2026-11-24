# Open Source Pulse Wall

一个一节课就能跑通完整开源闭环的 Git 协作实践项目。从 **Fork** 出发，亲手走完 **Clone → Branch → Validate → Commit → Push → Pull Request → Review → Merge** 全流程；每一次合并与互动都会实时点亮课堂展示墙。

- **在线协作展示墙**：<https://pulse-wall.yoryon.com/>
- **课堂贡献教程**：[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
- **进阶积分玩法**：[docs/SCORING.md](./docs/SCORING.md)
- **Git 课程课件**：[docs/git-course-slides.html](./docs/git-course-slides.html)
- **Git 课程视频讲解**：[docs/git-course-video.mp4](./docs/git-course-video.mp4)（配套字幕：[docs/git-course-video.srt](./docs/git-course-video.srt)）
- **拓展阅读 · 从零理解 Git 底层原理**：<https://yoryon.com/c/git-from-scratch/>

## 课堂三项任务

1. **上墙个人卡片**：在 `data/profiles/` 下创建自己的 JSON 卡片，完成第一个开源 PR。
2. **给同学写寄语**：在 `data/cheers/<同学用户名全小写>/` 下留下一句鼓励，互相点亮寄语角标。
3. **提一个 Issue**：遇到真实问题、Bug 或有改进想法时，用仓库内置模板提交 Issue。

## 贡献步骤指南

详细操作步骤（含环境安装与鉴权、AI Agent 省流 Prompt、个人卡片与寄语规范、冲突解决及常用命令速查）请阅读：

- 👉 **[完整贡献教程 · docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)**
- 👉 **[进阶积分与皮肤玩法 · docs/SCORING.md](./docs/SCORING.md)**

流程速览：

1. 安装 `git` / `gh` 并完成鉴权，Fork 并克隆仓库。
2. 新建分支，在 `data/profiles/<你的GitHub用户名>.json` 创建个人卡片，运行 `npm run validate` 后发起 PR。
3. 卡片合并后，在 `data/cheers/<目标用户名全小写>/<你的GitHub用户名>.json` 为同学写寄语并提交 PR。
4. 遇到真实问题或改进想法时，前往 [Issues 页面](https://github.com/nanzhi84/open-source-pulse-wall/issues/new/choose) 使用模板提交。

## 拓展阅读：从零看懂 Git 底层原理

跑通 `clone → branch → commit → push → merge` 后，如果你想看懂 `.git` 里的 `blob` / `tree` / `commit` 对象模型与分支指针原理，推荐阅读专栏 👉 **[Git From Scratch — 从零理解 Git 底层原理](https://yoryon.com/c/git-from-scratch/)**。

## 目录结构

```text
open-source-pulse-wall/
├── README.md                       # 项目概览与文档入口
├── docs/
│   ├── CONTRIBUTING.md             # 课堂贡献步骤指南与命令速查
│   ├── SCORING.md                  # 可选的进阶积分与卡片皮肤玩法说明
│   ├── git-course-slides.html      # Git 协作实战课程课件（HTML 幻灯片）
│   ├── git-course-video.mp4        # Git 课程动画视频讲解（1080p）
│   └── git-course-video.srt        # 视频讲解配套中文字幕
├── .github/
│   ├── CODEOWNERS                  # 自动指派老师与维护者 Review（@nanzhi84 @YJLEC）
│   ├── ISSUE_TEMPLATE/             # 提问求助 / Bug / 改进想法 模板
│   ├── PULL_REQUEST_TEMPLATE.md    # PR 自检清单
│   └── workflows/                  # 自动校验、防篡改守卫、自动合并队列与 Pages 部署
├── cloudflare/                     # 3 分钟快照缓存 API + 积分聚合 + Star 自动同步
├── data/
│   ├── profiles/                   # 每位贡献者的个人卡片 data/profiles/<GitHub用户名>.json
│   └── cheers/                     # 独立寄语 data/cheers/<目标用户名全小写>/<你的GitHub用户名>.json
├── public/                         # 3D 太阳系展示墙前端页面与特效引擎
├── scripts/                        # 校验脚本、积分引擎、静态构建与部署工具
└── test/                           # 自动化测试套件
```

## 许可证

MIT
