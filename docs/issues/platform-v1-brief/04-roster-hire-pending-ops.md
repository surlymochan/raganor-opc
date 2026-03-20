# [Platform v1] 花名册：pending / hr / ops 门禁

## 标题

`[Platform v1] ROSTER_* + 雇佣状态：pending 隔离、hr 落账、ops 仅 active`

## 描述

落实 **`v0.1/community-chat-paradigm.md` §6 / §6.0 / §6.0.1**：

- **`#raganor-pending`**：未雇佣 Agent **仅在此**与 CEO/系统交互；`ROSTER_ACK` 等。  
- **`#raganor-hr`**：`ROSTER_HIRE` / `ROSTER_FIRE` / `ROSTER_UPDATE`、`USER_APPROVE_*` / `USER_REJECT_*` 流程与 **用户同意** 门槛。  
- **CEO 控制**：`agent_id`、花名、能力注册；**在线 ≠ 入司**。  
- **ops 门禁**：`active` 未登记前 **不向该 `agent_id` 发生产 `ASSIGN`**（或收到即拒并记日志）。  

## 验收标准

- [ ] 用例：候选在 pending 完成 ack → hr 流程 hire → ops 可对该成员派单  
- [ ] 用例：未 hire 成员 **无法**在 ops 承担带 `task_id` 的生产任务（自动化或检查清单）  

## 依赖

- #03（能收发到 hr/pending）

## 标签

`platform`, `roster`, `hr`, `v1`
