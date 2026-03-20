# 知识库、数据库与长短期记忆（设计）

**目标**：分清 **三件事**——**运营数据库**（机读、事务）、**知识库**（人+Agent 可读、Git 版本化）、**记忆**（会话上下文 vs 可沉淀事实），避免「全塞进对话」导致幻觉与不可审计。

**相关**：SSOT 原则见 [orchestration.md](./orchestration.md)；共享目录见 `docs/company-agent-platform.md` **§2.3**；CEO 持久化见 [ceo-agent-architecture.md](./ceo-agent-architecture.md)。

---

## 1. 三层模型（必须先选层）

| 层 | 典型技术 | 存什么 | 谁写 | 信任级别 |
|----|----------|--------|------|----------|
| **A · 运营数据库** | CEO：**SQLite**（可升 Postgres） | `task_id`、FSM `(pluginId,state)`、Hire/Fire 审批记录、出站消息幂等键、**审计日志** | CEO 服务、经门禁的写入 | **高**（以库为准） |
| **B · 知识库（KB）** | **Git 仓库** `~/raganor-company/` 等 | 角色 md、规范、选题/规律、PRD 草稿、**归档契约**、花名册导出 | 人 + Agent（经 PR/约定路径） | **高**（可 diff、可回滚） |
| **C · Agent 记忆** | OpenClaw **workspace**、`core-memory.md`；可选向量库 | **长期偏好**、项目笔记、**从 KB 摘要的指针** | 各 Agent + 同步策略 | **中**（需与 KB/DB 对账） |

**原则**：**契约、验收、人事结论** → 至少落 **A 或 B** 之一；**聊天上下文** → **C 短期**；**可复用规范** → **B**。

---

## 2. 短期记忆（Short-term）

**定义**：**当前任务会话**内有效——最近意图、澄清轮次、等待中的 `RESULT`、线程 message id 等。

| 存放位置 | 内容 | TTL / 清理 |
|----------|------|------------|
| **CEO · DB** | `sessions` 或 `task_snapshots`：`task_id`、`plugin_id`、`state`、`last_event_at`、`pending_side_effects` | 任务 `DONE` 后归档或按天清理；**可配置保留天数** |
| **CEO · 可选 Redis** | 高并发下会话缓存；丢失可从 DB 重建 | 分钟～小时级 |
| **聊天室** | 消息流本身即「可见短期记忆」 | 依赖 web-ui 保留策略 |
| **OpenClaw / Worker** | 模型上下文窗口内的多轮对话 | 随会话结束丢弃；**不把**未落盘的结论当事实 |

**禁止**：把「仅存在于短期层」的句子当作 **已完成交付** 的凭据——**交付以 RESULT 落库/KB + Gate 为准**。

---

## 3. 长期记忆（Long-term）

**定义**：跨任务、跨天仍要用的 **事实与规范**。

| 类型 | 推荐载体 | 示例 |
|------|----------|------|
| **组织规范** | KB `shared/*.md` | `content-rules.md`、安全红线、命名约定 |
| **业务资产** | KB `shared/topics/`、`patterns/` | 选题库、爆款/踩坑规律 |
| **个人管家数据** | KB 或 **用户目录**（第一期） | `examples/demo-data/` 同结构的 `~/.../brief-data/` |
| **契约归档** | KB `shared/contracts/YYYY-MM/<task_id>.md` 或 CEO DB **blob 导出** | 隐性契约落盘，便于复盘 |
| **Agent 人设与技能** | KB `agents/*.md` + `docs/skills-library.md` | 少依赖模型即兴 |
| **每 Agent 私有长期笔记** | OpenClaw `memory/<agent>/core-memory.md` | 「我常犯的错」「用户偏好摘要（非敏感）」 |

**可选后期（Roadmap）**：**向量检索** / embedding，仅作为 **KB 的索引**，**不**替代 Git 原文；冲突时 **以 Git 为准**。

---

## 4. 数据库（CEO 侧）表级建议

以下为 **逻辑模型**，实现可用 Drizzle schema。

| 表 / 集合 | 用途 |
|-----------|------|
| `tasks` | `task_id`、`plugin_id`、`state`、`created_at`、`closed_at` |
| `events`（审计） | 入站摘要、`intent`、`from`、`channel`，**正文可哈希或截断**（隐私） |
| `hire_proposals` | `hire_ref`、`agent_id`、是否 `user_approved`、时间戳 |
| `fire_proposals` | `fire_ref`、`agent_id`、是否 `user_approved` |
| `roster_mirror` | 与花名册 YAML **同步**的快照，便于 SQL 查询；**权威源仍以 CEO 维护的 Git 花名册为准**（人事字段、`agent_id`、能力标签由 **Hire 流程**裁定） |
| `idempotency` | `(channel, client_msg_id)` → 防重复处理 Webhook |

**与 KB 关系**：人事、契约可在 **用户批准后** 由 CEO **写回** `raganor-company` 对应 md/yaml；DB 记 **指针**（路径 + commit）。

---

## 5. 知识库（Git）写入纪律

- **共享区**：通过 **PR 或 CEO 门禁后自动 commit**（二选一）；**禁止** Agent 无门禁直接 `git push --force`。  
- **敏感**：密钥、token、未脱敏 PII **不进 KB**；放 **环境变量 / 密钥管理**。  
- **与信封一致**：KB 里可存「任务复盘」时引用 `task_id`，便于对齐聊天室。

### 5.1 Agent 读 B 层：**MCP（推荐）

**约定**：Worker / Fact / QA 等 **不直接**在提示词里塞整库路径碰运气，而是通过 **MCP 工具** 暴露只读能力，例如：

- `kb_read_file(path)`：限定在 `~/raganor-company/`（或配置根目录）下的相对路径。  
- `kb_list_dir(path)`、`kb_search_grep(pattern)`（可选）。

**好处**：路径白名单、审计、与 Nanobot/MCP 生态一致；CEO 可在契约里写「允许读取的 KB 前缀」。**写 KB** 若需 MCP，应 **单独工具 + 门禁**（或仍走 PR，由人合并）。

---

## 6. 长短期如何协作（一条任务里）

1. 用户私聊 → CEO 写 **短期** session + 可选开 `task_id`。  
2. 派 Worker → 信封带 `task_id`；Worker 可读 **KB** 规范文件。  
3. `RESULT` → CEO **Gate** → 短期标记完成；**长期**：契约/规律 **追加到 KB** 或 DB 归档。  
4. OpenClaw **core-memory** 只记 **摘要+链接**（「见 `shared/contracts/xxx`」），避免双源打架。

---

## 7. 与个人管家 v1 对齐

- **第一期**：日程/待办/OKR/习惯 → **本地 YAML/JSON**（用户目录或 demo）；**可不进 CEO DB**，除非要做「跨天恢复未完成任务」再写入 `tasks` 扩展字段。  
- **CEO DB**：仍建议从第一天就存 **简报任务** 的 `task_id` 与审计，便于以后接 **长期习惯分析**。

---

## 8. 反模式

- 全靠 **模型上下文** 记「上周说过什么」。  
- **同一事实** 同时只活在聊天里和某 Agent 脑子里，**没有 KB/DB 锚点**。  
- 把 **运营库** 当通用文档库塞大文本——应 **存路径 + 哈希**，正文在 KB 或对象存储。

---

*版本：v0.1 · 实施时可拆为「CEO schema 迁移」与「KB 目录规范」两个 issue。*
