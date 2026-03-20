# 一人公司 Agent 平台（业务设计 + 实施清单）

**日期**: 2026-03-19（合并自原 `plans`）  
**状态**: 业务参考；编排/门禁原则见 `v0.1/orchestration.md`、`v0.1/governance.md`  
**一体总览（含泳道图）**: [`docs/design/system-design.md`](./design/system-design.md)  
**离线 Epic 拆分**: [`docs/issues/platform-v1-brief/`](./issues/platform-v1-brief/)（CEO+community-chat）；个人管家简报见 [`docs/issues/personal-butler-v1-brief/`](./issues/personal-butler-v1-brief/)（**原 `v1-brief` 目录已改名**）

---

## 1. 概述

通过多 Agent 协作解决：

1. **自媒体运营**（小红书）：选题 → 内容 → 审核 → 复盘闭环  
2. **企业 AI 转型咨询**：GitLab MR Review、PRD 重塑、研发管控（扩展）

---

## 2. 系统架构

### 2.1 组件

| 组件 | 技术 | 说明 |
|------|------|------|
| Agent 运行 | OpenClaw | 4 个 Agent 可跑在不同机器 |
| 通信 | community-chat | 反向 SSH 隧道连中央 chat 服务器 |
| 记忆 | OpenClaw 内置 + 共享知识库 | 每 Agent 独立记忆 + `~/raganor-company/` 共享 |
| 版本控制 | Git | 共享知识库 Git 管理 |
| Agent 管理 | 手动 + **频道 Hire/Fire** | 经 `raganor-web-ui` 发帖入册/解聘，见 `v0.1/community-chat-paradigm.md` **§6** |

### 2.2 Agent 角色

| Agent | 职责 | 核心任务 |
|-------|------|----------|
| **CEO** | 你 | 决策、审核最终输出 |
| **Topic** | 选题 | 分析数据、提出选题方向 |
| **Content** | 内容 | 生成小红书文案 |
| **Review** | 复盘 | 分析历史数据找规律 |
| **Consult** | 咨询 | GitLab MR Review、PRD 重塑 |

> **与人设文档的衔接**：业务上为 Topic/Content/Review/Consult；`agent-culture.md` 中老赵/小于/阿梅为 **Worker 人格**，映射关系需在实施时 **显式约定**（见 `v0.1` 架构中的能力注册表思路）。

### 2.3 共享知识库结构

```
~/raganor-company/
├── README.md
├── agents/                      # 角色定义 md
│   ├── ceo.md
│   ├── topic-researcher.md
│   ├── content-writer.md
│   ├── data-reviewer.md
│   └── enterprise-consultant.md
├── shared/                      # Git 管理
│   ├── content-rules.md
│   ├── topics/
│   │   ├── backlog.md
│   │   └── analyzed.md
│   ├── patterns/
│   │   ├── viral.md
│   │   └── flop.md
│   ├── enterprise/
│   │   ├── processes/
│   │   └── assessments/
│   └── drafts/
└── memory/                      # OpenClaw 内置个人记忆（示意）
```

### 2.4 数据流注意（实施时必填）

- Topic 写入 `shared/topics/backlog.md`；实施计划中 Content 从 `analyzed.md` 读选题。  
- **须约定**：backlog → analyzed 的 **推进责任**（CEO 审定、Topic 迁移等），避免流程断档。

---

## 3. 自媒体方向

```
选题Agent → backlog.md
    ↓
内容Agent → 选题 + content-rules.md + patterns/viral.md
    ↓
草稿 → drafts/YYYY-MM/xxx.md
    ↓
CEO → 审核 → 发布小红书
    ↓
复盘Agent → patterns/
    ↓
选题Agent → 新选题
```

**流程**：选题 → 内容 → 审核 → 复盘 → 迭代。

**缺口**：发布后数据如何进入复盘（API/导出/手工）需在实施时定义格式与入口。

---

## 4. 企业咨询方向

```
GitLab MR → Consult Review → MR 评论
PRD(Markdown) → Consult 重塑 → 标准化文档 → 钉钉知识库（未来）
```

| 能力 | 输入 | 输出 |
|------|------|------|
| GitLab MR Review | 私有 MR | MR 评论 |
| PRD 重塑 | Markdown | AI 友好标准文档 |
| 知识库同步 | 标准文档 | 钉钉（未来） |

**约束**：GitLab 私有；凭证 **每机独立**；PRD 测试用 Markdown，正式可在钉钉；CI 当前 Jenkins，未来 Hook。

---

## 5. 通信

- community-chat：群聊广播、私聊定点。  
- 协作：聊天传任务与结果；共享库 Git 同步；凭证每机隔离。

---

## 6. 实施清单（精简，原 Task 1–13）

详细 bash 步骤已压缩为下表；需要逐步命令时可从 Git 历史或备份恢复原 `implementation-plan`。

| 阶段 | 任务摘要 | 关键产出 |
|------|----------|----------|
| **P1 基础设施** | 初始化 `~/raganor-company` 目录与 Git；部署 community-chat（`raganor-web-ui`、`.env`、pnpm）；反向 SSH `ssh-tunnel.sh` | 共享库、隧道、chat 可访问 |
| **P2 Agent** | Topic / Content / Review / Consult：OpenClaw 记忆目录 `~/.openclaw/workspace/memory/{topic-researcher,content-writer,data-reviewer,enterprise-consultant}/core-memory.md`；角色 md 对应 `~/raganor-company/agents/*.md`；接入 community-chat（参见原 Task 4–7 的 prompt 结构） | 四角色可连 chat |
| **P3 自媒体闭环** | `workflows/content-workflow.md`；手跑：选题→文案→审核→模拟复盘 | 流程文档 + 验证记录 |
| **P4 企业咨询** | `~/.gitlab-token`（chmod 600）；`shared/enterprise/gitlab-config.md`；`scripts/review-mr.sh`、`reshape-prd.sh`；`prd-template.md` | MR/PRD 流水线雏形 |
| **P5 扩展** | 钉钉知识库、Jenkins Hook、Agent 自动化管理 | 待定 |

**安全**：勿将真实 token 写入文档；示例用占位符或环境变量。

**自媒体手测示例**（原 Phase 3）：Topic 出 3 选题 → Content 基于其一出文案 → 你审核 → Review 模拟数据。

---

## 7. 设计约束

- 预算：暂不考虑 Token 费用  
- 时间：每天约 2 小时投入  
- 规模：4C8G 云主机测试  
- 进度：**先跑通自媒体闭环**，再扩展企业方向  

---

## 附录 A：共享库基础文件示例

### shared/content-rules.md

```markdown
# 内容创作规范

## 风格
- 使用 emoji 增加亲和力
- 段落简短，每段不超过 3 行
- 结尾使用 Call-to-Action

## 标签
- #AI工具 #效率提升 #踩坑经验 等
```

### shared/patterns/viral.md

```markdown
# 爆款规律

## 待分析
- (复盘 Agent 会更新)
```

### shared/patterns/flop.md

```markdown
# 失败规律

## 待分析
- (复盘 Agent 会更新)
```

### PRD 重塑模板（节选）

```markdown
# [功能名称]

## 背景
[为什么需要这个功能]

## 目标
- [具体目标1]
- [具体目标2]

## 用户故事
作为 [用户类型]，我希望 [功能]，以便 [收益]。

## 技术方案
[AI 友好的技术描述]

## 验收标准
- [可验证的标准1]
- [可验证的标准2]
```

---

## 附录 B：目录一键创建（参考）

```bash
mkdir -p ~/raganor-company/{agents,shared/{topics,patterns,enterprise/{processes,assessments},drafts}}
cd ~/raganor-company && git init
```

community-chat 验证示例：`curl http://localhost:3001/api/community-chat/agents/integration`
