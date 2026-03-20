# [Platform v1] QA 与 E2E（可执行功能）

## 标题

`[Platform v1] QA 接入：QA_ASSIGN / QA_RESULT / E2E 流水线`

## 描述

按 **`v0.1/qa-role-and-e2e.md`**：一旦 Platform 交付 **CLI / API / 页面** 等可执行行为，须纳入 **QA 三角**，禁止仅靠 Worker 自述「测过」。

- **聊天室**：CEO → `QA_ASSIGN`；QA → `QA_RESULT` / `QA_BLOCK`（附 **可复查证据**：CI、报告路径、日志摘要）。  
- **契约**：任务澄清阶段写明 **E2E 命令、环境、通过条件**；无约定时 QA 应 `BLOCK` 或要求补契约。  
- **防空**：审查测试 diff（删断言、空转等）。  

**简报纯渲染**若仍无 UI/API，可继续沿用 **快照门禁**（对齐 `personal-butler-v1-brief/08`），与本 Issue 范围 **解耦**。

## 验收标准

- [ ] 至少一条 **端到端**用例：派单 → 实现 → QA → CEO 合并（可在 CI 中 mock 部分 Agent）  
- [ ] `QA_BLOCK` 时 CEO **不**对用户私聊宣称功能完成（自动化或人工剧本）  

## 依赖

- #03（ops 上可跑 `QA_*`）  
- 具体功能任务定义后补 **契约中的 E2E 命令**  

## 标签

`platform`, `qa`, `e2e`, `v1`
