# [Epic] 个人管家 v1：晨间 / 晚间简报一体

## 标题（用于 Issue）

`[Epic] 个人管家 v1：晨晚简报（CLI + 本地数据 + demo + 场景 A）`

## 描述

实现 `v0.1/personal-butler.md` 锁定的 **方案 3**：单一入口生成 **晨间** / **晚间** Markdown 简报，整合日程、待办 Top、OKR 一句摘要、习惯；股票与身心健康 **仅占位 + 固定免责声明**；无第三方密钥时可用 **demo 数据**跑通。

**已选增强 — 场景 A（§1.1）**：**三 Agent A2A** — **CEO** 只编排+门禁+合并；**Fact Agent** 产出事实区；**OpenClaw** 产出晨间「今日打法」。晚间 v1 为 **CEO→Fact→CEO**（无 OpenClaw）。OpenClaw 不可用时降级为仅 Fact 输出。

**Slogan 对齐**：一句话/关键词触发简报；输出分区块便于后续测试与门禁。

## 验收标准（Epic 级）

- [ ] 存在 `examples/demo-data/`，README **三步**内可跑 **晨间 + 晚间** 各一次  
- [ ] 输出含规格书 **§3.3 / §3.4** 所列区块顺序（占位块亦须出现）  
- [ ] 股票/健康区块 **每次**含 `personal-butler.md` §9 对应免责声明要点  
- [ ] 无数据时明确标注 **无数据 / demo**，**不编造**日程或行情  
- [ ] **场景 A**：晨间在 OpenClaw 开启时含 **建议区**标题与免责声明；关闭时行为见 §1.1 降级说明  

## 标签建议

`epic`, `personal-butler`, `v1`

## 子 Issue

见同目录 **`personal-butler-v1-brief/`** 下 `02`–`12`；全库 roadmap 见 [`../roadmap-placeholder.md`](../roadmap-placeholder.md)（**#12 = 场景 A**）。

**与 Platform v1 并行**：CEO 服务 + 四频道见 **`docs/issues/platform-v1-brief/`**；若要将场景 A 的 A2A **改走聊天室**，跟进 **`platform-v1-brief/05`**（可选，非 v1 必达）。
