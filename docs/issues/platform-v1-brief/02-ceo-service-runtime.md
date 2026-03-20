# [Platform v1] CEO 服务运行时与频道配置

## 标题

`[Platform v1] CEO Agent 服务：频道 ID、SQLite、FSM 插件挂载`

## 描述

按 **`v0.1/ceo-agent-architecture.md`**：

- 实现可部署的 **CEO 服务进程**（Hono/Fastify 等栈与仓库实际一致即可）。  
- **环境变量 / 配置**：`CHANNEL_ID_CEO_DM`、`CHANNEL_ID_OPS`、`CHANNEL_ID_HR`、`CHANNEL_ID_PENDING` 与文档 §6 对齐。  
- **状态与外置存储**：任务状态、契约指针、花名册（若 CEO 侧落库）与 **`v0.1/memory-and-knowledge-design.md`** 不冲突。  
- **FSM**：`PluggableStateMachineRegistry` 可挂载；LangGraph 等仅作插件内可选子图。  

## 验收标准

- [ ] README 或 `docs` 中写明 **启动命令 + 必填环境变量**  
- [ ] 缺任一频道 ID 时 **明确失败**（或文档声明 dev 占位策略）  
- [ ] 提供 **最小健康检查**（如 `/health`）或等价日志  

## 依赖

- 无（可与 `03` 并行）

## 标签

`platform`, `ceo`, `typescript`, `v1`
