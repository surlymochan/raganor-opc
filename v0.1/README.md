# Raganor · v0.1 文档包

**日期**: 2026-03-20  
**性质**：编排/治理/个人管家 **原则与规格**；业务落地见 **`../docs/`**。

---

## 一体总览（先看）

- **[`../docs/design/system-design.md`](../docs/design/system-design.md)**：架构、community-chat 用法与时机、交付 vs 人感、CEO+QA、**Mermaid 泳道图**。  
- **[`../docs/design/README.md`](../docs/design/README.md)**：设计门户；**[`../docs/design/DOCUMENT-MAP.md`](../docs/design/DOCUMENT-MAP.md)**：全库文档地图。

> 本目录各文件仍为 **专题 SSOT**（信封/INTENT/表/模板全文等）；总览与原文冲突时 **以本目录为准并回写总览**。

---

## 本包解决什么

- 降低长程任务在弱门禁下的失败率；**自建 CEO + Worker + QA**；**契约 + 机械验收 + E2E + 异议**；**一句话 + 引导澄清**。

---

## 文档（合并后 8 份主题 + 本说明）

| 文件 | 内容 |
|------|------|
| [../docs/design/system-design.md](../docs/design/system-design.md) | **系统设计总览** + 工作流泳道图（与下表互补，非替代） |
| [orchestration.md](./orchestration.md) | 愿景与 KPI、架构、隐性契约、CEO 规格、可靠性原则 |
| [governance.md](./governance.md) | 博弈位、六帽映射、异议规则、**决议模板全文** |
| [personal-butler.md](./personal-butler.md) | 个人管家 **v1 晨晚简报** + **R2–R8 roadmap**、三 Agent A2A |
| [community-chat-paradigm.md](./community-chat-paradigm.md) | **raganor-web-ui** 聊天室 Agent **沟通范式**（信封、INTENT、花名册、Hire/Fire） |
| [qa-role-and-e2e.md](./qa-role-and-e2e.md) | **QA（必设）**、功能验证、**E2E**、防空测试、`QA_*` INTENT |
| [ceo-agent-architecture.md](./ceo-agent-architecture.md) | **CEO Agent**：全栈 **TS**、可插拔 FSM、框架选型、web-ui 集成 |
| [memory-and-knowledge-design.md](./memory-and-knowledge-design.md) | **知识库（Git）+ 数据库（CEO）+ 长/短期记忆** 分层与反模式 |
| [CHANGELOG-v0.1.md](./CHANGELOG-v0.1.md) | 变更与合并记录 |

---

## 已确认

1. **1A**：六顶思考帽 + CEO/博弈位分述，不统一改为「七顶」对外文案。  
2. **2A**：决议模板保留于本包（见 `governance.md`），不同步 `~/raganor-company/shared/`。  
3. **个人管家**：**先做 v1 晨晚简报**；其余见 `personal-butler.md` roadmap。  
4. **聊天拓扑（已定）**：**3 频道**（`#raganor-ops`、`#raganor-hr`、`#raganor-pending`）+ **1 CEO 私聊**；见 `community-chat-paradigm.md` **§0**。

---

## 与 `docs/` 的关系

| 路径 | 侧重 |
|------|------|
| `docs/issues/README.md` | 离线 Issue 清单；**`personal-butler-v1-brief/`**（管家 v1）、**`platform-v1-brief/`**（编排+四频道） |
| `docs/company-agent-platform.md` | 小红书/GitLab、OpenClaw、chat、`~/raganor-company/`、实施清单 |
| `docs/agent-culture.md` | 老周/老赵/小于/阿梅、社交公约 |
| `docs/skills-library.md` | Skills 清单与草案正文 |

编排原则 **`orchestration.md` / `governance.md`**；聊天室 **`community-chat-paradigm.md`**；CEO 工程 **`ceo-agent-architecture.md`**；QA **`qa-role-and-e2e.md`**；**记忆与 KB** **`memory-and-knowledge-design.md`**。
