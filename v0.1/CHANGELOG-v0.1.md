# CHANGELOG · v0.1 文档包

## 2026-03-21 · Issues 目录命名统一

- `docs/issues/v1-brief/` **重命名**为 **`docs/issues/personal-butler-v1-brief/`**，与 **`platform-v1-brief/`** 并列，规则 **`{Epic 主题}-v1-brief`**；全仓链接已更新。  
- [`docs/issues/README.md`](../docs/issues/README.md) 文首补充 **两子目录非重复** 说明。  
- **级联**：[`docs/README.md`](../docs/README.md)、[`README.md`](../README.md)、[`v0.1/README.md`](./README.md)、[`docs/design/DOCUMENT-MAP.md`](../docs/design/DOCUMENT-MAP.md) §5–§6、[`docs/company-agent-platform.md`](../docs/company-agent-platform.md) 文首已写清新路径与旧名对照。

## 2026-03-20 · Platform v1 离线 Issues（`docs/issues/platform-v1-brief/`）

- 新增 **Platform v1** Epic + 子 Issue `02`–`06`：CEO 运行时、community-chat 接入、花名册与 pending/ops 门禁、**可选**个人管家场景 A 走聊天室、QA/E2E；**明确非个人管家 v2**。  
- [`docs/issues/README.md`](../docs/issues/README.md) 已更新目录与依赖图；[`docs/design/DOCUMENT-MAP.md`](../docs/design/DOCUMENT-MAP.md)、[`docs/design/system-design.md`](../docs/design/system-design.md)、[`docs/issues/personal-butler-v1-brief/01-epic-v1-brief.md`](../docs/issues/personal-butler-v1-brief/01-epic-v1-brief.md) 已互链。

## 2026-03-20 · 设计门户与系统总览（`docs/design/`）

- 新增 **`docs/design/`**：[`README.md`](../docs/design/README.md)（阅读路径）、[`system-design.md`](../docs/design/system-design.md)（架构 + community-chat 时机 + 交付/人感 + CEO+QA + **泳道图**）、[`DOCUMENT-MAP.md`](../docs/design/DOCUMENT-MAP.md)（全库 Markdown 地图）。  
- **`v0.1/` 专题文保留不动**（仍为 INTENT/表/模板等 SSOT）；仓库根新增 [`README.md`](../README.md) 入口；[`docs/README.md`](../docs/README.md)、[`v0.1/README.md`](./README.md) 已链到设计门户。  
- **未合并** `docs/issues/personal-butler-v1-brief/` 多文件（保留逐 issue + `gh issue create --body-file` 工作流）。

## 2026-03-20 · 频道拓扑定案

- **3 频道 + 1 CEO 私聊** 写入 `community-chat-paradigm.md` **§0**（ops / hr / pending + 私聊）；`README` 已确认项 4。

## 2026-03-20 · Hire 与人事主权

- `community-chat-paradigm.md` **§6.0**：**CEO 控制** `agent_id`/姓名花名/能力等注册；**WS+community-chat 仅接入**；**在线≠入司**；Hire 成功才算进公司。`memory-and-knowledge-design.md` 花名册说明同步。  
- **§6.0.1**：未雇佣 **仅 `#raganor-pending`（待聘）**；**不可进 `#raganor-ops`**；入司 `active` 后再进 ops；`ceo-agent-architecture.md` 增加 `CHANNEL_ID_PENDING`。

## 2026-03-20 · 记忆与知识库

- 新增 `memory-and-knowledge-design.md`：运营库（CEO SQLite）vs Git 知识库 vs Agent 长短期记忆；表建议、KB 写入纪律、与个人管家对齐。  
- **§5.1**：Agent 经 **MCP** 只读 B 层（路径白名单）。

## 2026-03-20 · CEO Agent 架构（TS + 可插拔 FSM）

- `ceo-agent-architecture.md`：**全栈 TypeScript**（Hono/Fastify、Zod、Drizzle+SQLite、pino、vitest）；**CrewAI / LangChain.js / Nanobot / AI SDK** 选型表；**PluggableStateMachineRegistry** 与 `CeoStateMachinePlugin` 接口；LangGraph 仅作插件内可选子图。

## 2026-03-20 · Hire / Fire

- `community-chat-paradigm.md` **§6**：经聊天室 **`ROSTER_HIRE` / `ROSTER_ACK` / `ROSTER_FIRE` / `ROSTER_UPDATE`**；推荐 `#raganor-hr`；CEO 仅一人、扩编必须通过频道落账；§10 与雇佣状态对齐。  
- **用户同意**：`USER_APPROVE_HIRE` / `USER_REJECT_HIRE`、`USER_APPROVE_FIRE` / `USER_REJECT_FIRE`；未同意前 **不得** 改花名册 active/执行解聘。

## 2026-03-20 · QA 与 E2E

- 新增 `qa-role-and-e2e.md`：**必设 QA**、E2E 与防空测试职责、典型工作流、`QA_ASSIGN` / `QA_RESULT` / `QA_BLOCK`；`community-chat-paradigm.md` 花名册与 INTENT 已扩展。

## 2026-03-20 · 聊天室沟通范式

- 新增 `community-chat-paradigm.md`：`raganor-web-ui` 内 Agent 信封、INTENT、花名册、防风暴；`personal-butler.md` §1.1 已链到该文。  
- **约定**：暂不强制服务端校验（见 `community-chat-paradigm.md` 文首说明）。  
- **§0 双通道**：公群（全员+用户可选）透明编排；CEO 私聊收口指令与 `USER_REPLY`。

## 2026-03-20 · 场景 A 改为三 Agent A2A

- `personal-butler.md` **§1.1**：Fact Agent 产出事实区；CEO / OpenClaw 分工同前；极简 `intent` 信封；issue **#12** 已同步。

## 2026-03-20 · 场景 A（CEO + OpenClaw）

- `personal-butler.md` 增加 **§1.1 场景 A**；`docs/issues/personal-butler-v1-brief/12-scenario-a-ceo-openclaw.md`；Epic `01` 与 `docs/issues/README.md` 依赖图已更新。

## 2026-03-20 · 离线 Issues

- 新增 `docs/issues/`：v1 晨晚简报 **Epic + 子任务** + `roadmap-placeholder.md`（R2–R8）。

## 2026-03-20 · 文档合并

### 结构调整

- **`docs/plans/`** 下 6 个按日文件 **删除**，合并为 **`docs/`** 三份：
  - `README.md`（索引）
  - `company-agent-platform.md`（原 design + implementation **精简表** + 附录 A/B；保留 **backlog/analyzed 衔接**、**复盘数据来源** 等待实施说明）
  - `agent-culture.md`（原 ceo-persona + worker-personas + social-protocol）
  - `skills-library.md`（原 skills-library；Skill **总模板**改为条目列表，避免嵌套代码块损坏）
- **`v0.1/`** 下原 `01`–`09` **删除**，合并为：
  - `orchestration.md`（01+02+03+04+06）
  - `governance.md`（05+07，含决议模板全文）
  - `personal-butler.md`（08+09）

### 历史内容保留说明

- 原 **implementation-plan** 逐步 bash 已压缩为 **实施清单表**；若需全文可从 Git 历史恢复（本仓库若非 git 则无）。
- **社交公约** 八条在 `agent-culture.md` 为摘要表 + **标准沟通格式** 全文代码块。

### 更早

- **2026-03-20（上午）**：个人管家 `08`/`09` 初稿；已确认 1A、2A。

### 备注

- 本 CHANGELOG 描述 **文档包** 范围，不代表产品已发布 v0.1 实现。
