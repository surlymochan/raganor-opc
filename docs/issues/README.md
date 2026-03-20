# Issues 说明

本目录为 **离线 issue 清单**（尚未自动同步到 GitHub/GitLab）。

**两个 `*-v1-brief/` 子目录**：**不是重复**，对应 **两条 Epic** ——  
`personal-butler-v1-brief/` = **个人管家 v1**（晨晚简报 + 场景 A）；`platform-v1-brief/` = **Platform v1**（CEO 服务 + community-chat 四频道）。命名统一为 **`{主题}-v1-brief`**。

| 线 | 规格来源 |
|----|----------|
| 个人管家 v1 | `v0.1/personal-butler.md` |
| Platform v1 | `v0.1/community-chat-paradigm.md`、`v0.1/ceo-agent-architecture.md`、`v0.1/qa-role-and-e2e.md` |

架构与流程总览见 **[`../design/system-design.md`](../design/system-design.md)**。

## 用法

### 手动

复制各文件正文到新建 Issue 的标题/描述。

### GitHub CLI（示例）

```bash
cd /path/to/raganor-opc
gh issue create --title "标题" --body-file docs/issues/personal-butler-v1-brief/02-demo-data.md
gh issue create --title "标题" --body-file docs/issues/platform-v1-brief/02-ceo-service-runtime.md
```

（若仓库未接远程，先 `gh repo create` 或仅本地用 Markdown 跟踪。）

## 目录

| 路径 | 说明 |
|------|------|
| [personal-butler-v1-brief/](./personal-butler-v1-brief/) | **个人管家 v1 · 晨晚简报** 可执行 issues（12 条 + Epic） |
| [platform-v1-brief/](./platform-v1-brief/) | **Platform v1 · CEO 服务 + community-chat**（Epic + `02`–`06`；**非**个人管家 v2） |
| [roadmap-placeholder.md](./roadmap-placeholder.md) | R2–R8 占位（低优先级，一条 Issue 内 checklist） |

## 依赖关系（个人管家 v1）

```text
01-epic → 02 → 03 → 04+05 → 06 → 07 → 08 → 09 → 12（场景 A：接在 04+06 之后）→ 10（可选）→ 11（可选）
```

- `04` 晨间、`05` 晚间可 **并行**（不同文件），合并前需 `03` 加载器。  
- **#12 场景 A**：依赖晨间渲染与 CLI；OpenClaw 集成可 mock，不阻塞 #02–#09 主干自测。

## 依赖关系（Platform v1）

```text
platform 01-epic → 02 ∥ 可先行文档/脚手架
         02 → 03 → 04
         03 + personal-butler-v1 #12 → 05（可选：简报 A2A 走聊天室）
         03 → 06（有可执行功能并定契约后）
```

- **与个人管家 v1**：**可并行**；**05** 仅在要把场景 A 接到 **community-chat** 时依赖 **`personal-butler-v1-brief/12`**（及已雇 Fact/OpenClaw）。  
- **命名**：**Platform v1** = 编排与频道能力；**个人管家 v2** 仍预留给 `personal-butler` **R2+** 等功能演进（勿混用）。  
- **旧路径**：`docs/issues/v1-brief/` → **`personal-butler-v1-brief/`**；对照表见 [`../design/DOCUMENT-MAP.md`](../design/DOCUMENT-MAP.md) **§6**。
