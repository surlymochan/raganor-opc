# [Platform v1] community-chat 接入与消息回路

## 标题

`[Platform v1] community-chat / WS：订阅四频道 + 解析信封 + 发回 ops/DM`

## 描述

CEO 服务作为 **raganor-web-ui** 的 Agent 客户端：

- **接入**：WebSocket 或范式文档所述方式；能 **收/发** 四路频道（私聊 + ops + hr + pending）。  
- **信封**：实现侧遵守 **`v0.1/community-chat-paradigm.md`** 前缀与 INTENT（至少：`ASSIGN`、`ACK`、`RESULT`、`CLARIFY`、`USER_REPLY`；`QA_*` 与 `ROSTER_*` 随 `04` 可分期）。  
- **`task_id`**：凡工作类消息须可关联；无 `task_id` 的闲聊不当作交付结论。  
- **日志**：关键 INTENT 落日志（可脱敏），便于与 **`docs/design/system-design.md`** 泳道对照。  

## 验收标准

- [ ] 集成测试或手工脚本：CEO **发**一条 `ASSIGN` 至 ops，**mock Worker** 回 `RESULT`，CEO **收**到并可驱动状态机  
- [ ] 私聊通道可发送 **`USER_REPLY`** 给用户（与 ops 内容一致或可追踪）  

## 依赖

- #02（服务进程与频道 ID 就绪）

## 标签

`platform`, `community-chat`, `websocket`, `v1`
