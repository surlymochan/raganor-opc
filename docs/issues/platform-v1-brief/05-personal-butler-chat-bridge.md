# [Platform v1 · 可选] 个人管家场景 A → community-chat 信封

## 标题

`[Platform v1 · 可选] 晨间 A2A 走 ops 频道（MORNING_FACTS / MORNING_PLAYBOOK）`

## 描述

将 **`v0.1/personal-butler.md` §1.1** 与 **`docs/issues/personal-butler-v1-brief/12-scenario-a-ceo-openclaw.md`** 中的 A2A，从「HTTP/进程内」**可选迁移**为 **community-chat 信封**（INTENT 名可与规格一致或映射表文档化）：

- **CEO** 在 ops（或私聊仅触发，ops 留痕）驱动 `MORNING_FACTS` → Fact → `MORNING_PLAYBOOK` → OpenClaw。  
- **门禁与降级** 行为与规格 **一致**（OpenClaw 不可用时仅 Fact + 跳过说明）。  
- **不要求**替代 CLI 路径：CLI 仍可保留为 **无 UI 模式**。  

## 验收标准

- [ ] 一次完整晨间链路的 **聊天室日志** 或导出可证明顺序：CEO→Fact→CEO→OpenClaw→CEO→用户私聊  
- [ ] 与 `personal-butler-v1-brief/12` 验收项 **等价**（事实/建议分栏、免责声明、不编造）  

## 依赖

- **个人管家**：`personal-butler-v1-brief/12`（或等价实现）  
- **本 Epic**：#02、#03、#04（至少 Fact/OpenClaw 已登记为可雇成员）  

## 标签

`platform`, `personal-butler`, `optional`, `scenario-a`, `v1`
