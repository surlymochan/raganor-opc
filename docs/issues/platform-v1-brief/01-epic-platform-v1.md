# [Epic] Platform v1：CEO 服务 + community-chat（四频道拓扑）

## 标题（用于 Issue）

`[Epic] Platform v1：CEO 编排服务 + raganor-web-ui 四频道（ops/hr/pending + 私聊）`

## 描述

落实 **`v0.1/community-chat-paradigm.md`** 已定拓扑与 **`v0.1/ceo-agent-architecture.md`** 工程方向：自建 **CEO Agent（TS + 可插拔 FSM）** 作为编排枢纽，经 **community-chat / WebSocket** 接入 **`#raganor-ops` / `#raganor-hr` / `#raganor-pending` + CEO 私聊**，实现 **`ASSIGN` / `RESULT` / `USER_REPLY` / `ROSTER_*` / `QA_*`** 等约定 INTENT 的闭环（实现侧自愿遵守范式；服务端强制校验可后做）。

**版本命名**：本 Epic 为 **Platform v1（Phase 2）**，**不**占用「个人管家 v2」编号；个人管家功能演进仍以 **`docs/issues/personal-butler-v1-brief/`** 与 `v0.1/personal-butler.md` 为准。

**与个人管家 v1 的关系**：

- **可并行**：CEO 服务与频道接入 **不依赖** 简报 CLI 跑通。  
- **可选对接**：`personal-butler` **场景 A**（`personal-butler-v1-brief/12`）可将 A2A 从进程内/HTTP 改为 **ops 频道信封**（见子 Issue `05`）；**非 Platform v1 必达项**。

**规格来源（SSOT）**：

- [v0.1/community-chat-paradigm.md](../../../v0.1/community-chat-paradigm.md)  
- [v0.1/ceo-agent-architecture.md](../../../v0.1/ceo-agent-architecture.md)  
- [v0.1/qa-role-and-e2e.md](../../../v0.1/qa-role-and-e2e.md)（平台交付 **可执行功能** 时）  
- [docs/design/system-design.md](../../design/system-design.md)（总览与泳道图）

## 验收标准（Epic 级）

- [ ] CEO 服务可配置 **`CHANNEL_ID_CEO_DM` / `OPS` / `HR` / `PENDING`** 并启动无报错  
- [ ] 能在 **ops** 观测到带 **`task_id`** 的派单与 `RESULT` 回路（至少 Worker **mock** 或单测等价）  
- [ ] **未雇佣** Agent 仅出现在 **pending**（或等价隔离），**不得**在 ops 派生产单  
- [ ] 用户侧 **私聊** 可收 **`USER_REPLY`**（可与 ops 留痕对照）  
- [ ] `docs/issues/README.md` 已链到本 Epic 与子 Issue；新人可从 **[`docs/design/system-design.md`](../../design/system-design.md)** 读到与本 Epic 一致的流程描述  

## 标签建议

`epic`, `platform`, `ceo`, `community-chat`, `raganor-web-ui`

## 子 Issue

同目录 `02`–`06`（`05` 为可选对接个人管家场景 A）。
