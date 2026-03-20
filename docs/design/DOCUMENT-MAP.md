# 文档地图（全库 Markdown）

> **用途**：快速定位文件、避免「同名不同义」重复维护。  
> **原则**：专题细节以 **`v0.1/`** 为规范源；本图只做索引，**不删减原文信息**。

---

## 1. 根与入口

| 路径 | 说明 |
|------|------|
| [README.md](../../README.md)（仓库根） | 项目入口：指向设计门户与文档索引 |
| [docs/README.md](../README.md) | `docs/` 总索引 |
| [docs/design/README.md](./README.md) | **设计门户**（阅读路径） |
| [docs/design/system-design.md](./system-design.md) | **系统设计总览**（含泳道图） |
| **本文** | 全库文档地图 |

---

## 2. 规范包 `v0.1/`（可靠性 / 聊天 / CEO 工程 / 记忆）

| 路径 | 内容摘要 |
|------|----------|
| [v0.1/README.md](../../v0.1/README.md) | v0.1 包说明、已确认决议列表 |
| [v0.1/orchestration.md](../../v0.1/orchestration.md) | 愿景 KPI、架构、隐性契约、CEO 规格、可靠性原则 |
| [v0.1/governance.md](../../v0.1/governance.md) | 博弈位、六帽、异议规则、**决议模板全文** |
| [v0.1/community-chat-paradigm.md](../../v0.1/community-chat-paradigm.md) | 3 频道 + CEO 私聊、信封、INTENT、花名册、Hire/Fire、防风暴 |
| [v0.1/ceo-agent-architecture.md](../../v0.1/ceo-agent-architecture.md) | CEO Agent：TS、FSM、框架选型、频道配置键 |
| [v0.1/qa-role-and-e2e.md](../../v0.1/qa-role-and-e2e.md) | QA 必设、E2E、防空测试、`QA_*` INTENT、工作流 |
| [v0.1/memory-and-knowledge-design.md](../../v0.1/memory-and-knowledge-design.md) | Git KB、CEO DB、长短期记忆、反模式 |
| [v0.1/personal-butler.md](../../v0.1/personal-butler.md) | 个人管家 v1 晨晚简报、场景 A（Fact/OpenClaw）、R2–R8 roadmap |
| [v0.1/CHANGELOG-v0.1.md](../../v0.1/CHANGELOG-v0.1.md) | v0.1 合并与变更历史 |

---

## 3. 业务与资产 `docs/`（非 design）

| 路径 | 内容摘要 |
|------|----------|
| [company-agent-platform.md](../company-agent-platform.md) | 业务向：多机 OpenClaw、community-chat、`~/raganor-company/`、实施清单 |
| [agent-culture.md](../agent-culture.md) | 老周/老赵/小于/阿梅、社交协作公约 |
| [skills-library.md](../skills-library.md) | Skills 原则、模板与各技能草案 |

---

## 4. 离线 Issues `docs/issues/`

| 路径 | 内容摘要 |
|------|----------|
| [issues/README.md](../issues/README.md) | Issues 用法、v1 依赖关系图 |
| [issues/roadmap-placeholder.md](../issues/roadmap-placeholder.md) | R2–R8 占位 checklist |
| [issues/personal-butler-v1-brief/](../issues/personal-butler-v1-brief/) | 个人管家 v1 可执行 issue 正文（01–12 等） |
| [issues/platform-v1-brief/](../issues/platform-v1-brief/) | **Platform v1**：CEO 服务 + community-chat（Epic + 02–06） |

**说明**：`personal-butler-v1-brief/`、`platform-v1-brief/` 下**多文件**便于 `gh issue create --body-file`；**不合并为单文件**，以免丢失逐条 issue 边界与 CLI 工作流。

---

## 5. 维护时注意

- 修改 **频道拓扑 / INTENT / 花名册规则** → 以 **`v0.1/community-chat-paradigm.md`** 为准，并在 **`system-design.md`** 中若引用「已定拓扑」则核对一致。  
- 修改 **CEO 能否宣称完成 / QA 门槛** → **`v0.1/orchestration.md`** + **`v0.1/qa-role-and-e2e.md`**。  
- **产品设计叙事**（泳道、人感与交付分层）→ **`docs/design/system-design.md`**。  
- **Issues 目录**：`docs/issues/v1-brief/` 已更名为 **`docs/issues/personal-butler-v1-brief/`**；外部笔记/脚本若仍写旧路径须级联更新（CHANGELOG 保留历史一句即可）。  

## 6. 旧路径备忘（仅索引，勿再使用）

| 曾用 | 现用 |
|------|------|
| `docs/issues/v1-brief/` | `docs/issues/personal-butler-v1-brief/` |

---

*版本：2026-03-21*
