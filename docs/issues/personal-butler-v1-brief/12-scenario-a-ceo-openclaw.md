# [v1] 场景 A：三 Agent A2A（CEO + Fact + OpenClaw）

## 标题

`[v1] 场景 A：晨间 A2A（CEO 编排 + Fact 事实区 + OpenClaw 今日打法）`

## 描述

落实 `v0.1/personal-butler.md` **§1.1**（**全 Agent**，无单独代码流水线角色）。

**交互链**

`用户 → CEO → Fact → CEO(门禁) → OpenClaw → CEO(门禁+合并) → 用户`

**CEO**

- 发 `MORNING_FACTS`（含 `data_dir`）给 Fact；收 Markdown 事实区 → 跑 §6 门禁。  
- 发 `MORNING_PLAYBOOK`（含限长 `fact_excerpt`）给 OpenClaw；收建议区 → 再门禁、合并。  
- 不撰写事实/建议正文。

**Fact Agent**

- 工具读盘；输出 §3.3 结构；无数据标清；不编造。

**OpenClaw**

- 仅基于 `fact_excerpt` 写「今日打法」；不新增事实；prompt 边界见规格。

**信封**

最小字段：`task_id`, `from`, `to`, `intent`, `payload`（见规格 JSON 示例）。

**降级**

OpenClaw 不可用时 CEO 仅输出 Fact + 跳过行。

## 验收标准

- [ ] 可演示或日志证明 **至少两轮 A2A**（CEO→Fact、CEO→OpenClaw）  
- [ ] 晨间最终稿含事实区 + 建议区标题与 §9 类声明（建议区）  
- [ ] `OPENCLAW` 关闭时仅 Fact + 跳过说明  
- [ ] Fact 在空 `data_dir` 下不编造具体事件  

## 依赖

- #02 demo-data、#06 用户入口（或 CEO 常驻）；可与原 #04 合并为 **Fact Agent 交付物**  

## 标签

`personal-butler`, `v1`, `openclaw`, `scenario-a`, `a2a`
