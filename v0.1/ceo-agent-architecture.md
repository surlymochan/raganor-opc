# CEO Agent：实现架构与技术选型（草案 · 全栈 TS）

**目标**：实现「**只编排 + 门禁 + 合并 + 对用户出口**」的 CEO，对接 `raganor-web-ui`、驱动 Fact/OpenClaw/QA、花名册与 Hire/Fire。  
**非目标**：CEO 内嵌业务渲染/E2E 编写；**可选**小模型仅用于 **私聊意图**；**状态机按场景可插拔**，不与某一业务写死在同文件。

---

## 1. 总体架构（分层）

```
                    ┌─────────────────────────────────────┐
  raganor-web-ui    │  Inbound Adapter（Webhook / WS / 轮询）  │
  ───────────────►  │  → ChannelEvent                        │
                    └─────────────────┬───────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  Session + RosterService             │
                    └─────────────────┬───────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  Policy Router                       │
                    └─────────────────┬───────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  PluggableStateMachineRegistry ★       │
                    │  按插件 match → transition → 副作用     │
                    └─────────────────┬───────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  GateService（纯函数，无 LLM）          │
                    └─────────────────┬───────────────────┘
                    ┌─────────────────┴───────────────────┐
                    ▼                                     ▼
        ┌───────────────────┐              ┌───────────────────┐
        │ OutboundAdapter    │              │ WorkerClients      │
        └───────────────────┘              └───────────────────┘
```

★ **场景与状态机解耦**：每种业务（晨间简报、晚间、功能+QA、人事）= **独立 npm 包或 `plugins/*.ts`**，注册进 Registry。

---

## 2. 全栈 TypeScript 基座

| 层级 | 选型 | 说明 |
|------|------|------|
| **运行时** | **Node.js 20+**，**TypeScript 5.x** | 与 `raganor-web-ui` 若同栈则复用工具链。 |
| **HTTP 服务** | **Hono** 或 **Fastify** | 收 Webhook 轻量；`GET /health`。 |
| **校验/信封** | **Zod** | `ChannelEvent`、解析后的 `Envelope`、环境变量 schema。 |
| **HTTP 客户端** | **undici** 或 **ofetch** | 调 Fact/OpenClaw/web-ui 出站 API。 |
| **持久化** | **SQLite** + **Drizzle ORM**（或 **better-sqlite3** 同步 + 手写 SQL） | `task_id`、`pluginId`、`fsmState`、hire 审批记录。 |
| **配置** | **dotenv** + Zod `env` 或 **@t3-oss/env-core** | |
| **子进程（验收）** | **`child_process.spawn` / `execa`** | QA/契约约定命令在 **Gate 或 QA 插件侧**执行，CEO 只编排。 |
| **日志** | **pino** | 结构化，便于对账聊天室。 |
| **测试** | **vitest** + **hono** `app.request()` | 假 Webhook；插件单测与门禁快照。 |

---

## 3. Agent 开发框架怎么选（CrewAI / LangChain / Nanobot…）

**结论先说**：**CEO 进程建议「薄编排 + 可插拔 FSM + Zod」为主**；重型 **Agent 框架放在 Worker 侧**（Fact/OpenClaw/QA），不必塞进 CEO。

| 选项 | 语言/生态 | 适合 CEO？ | 适合成员？ |
|------|-----------|------------|------------|
| **CrewAI** | **Python** 为主 | ❌ 不适合做 **TS CEO 本体** | ✅ 可做 **Python Worker**（研发 crew），与 TS CEO **HTTP/聊天室**通信。 |
| **LangChain.js / LangGraph.js** | TS/JS | △ **可选**：LangGraph 当 **某一插件内部**子图；**不推荐**把整个 CEO 绑在默认的 LLM 节点上。门禁必须 **纯 TS 函数**。 | ✅ 成员 Agent 用 LC 工具链可。 |
| **Vercel AI SDK**（`ai`） | TS | ✅ **仅**用于 CEO 私聊「意图分类/生成澄清」等 **单次 LLM 调用**；不是多 Agent 公司框架。 | ✅ 成员也可用。 |
| **Mastra** | TS 工作流/Agent | △ 与 LangGraph 类似：可做 **插件内**编排；CEO 核心仍建议 **自研 Registry** 以免框架绑架生命周期。 | ✅ |
| **Nanobot**（如 **nanobot-ai**，MCP 向） | 运行时偏 **Go**，生态 MCP | ❌ 不宜当 **TS CEO 内核** | ✅ 很适合 **工具多、MCP 优先** 的 **成员运行时**（与 CEO 分离）。另：**HKUDS/nanobot** 为 Python 轻量助手，亦宜作 **成员** 非 CEO。 |
| **自研 + 可插拔 FSM** | TS | ✅ **推荐作为 CEO 默认** | — |

**推荐组合**

- **CEO（TS）**：`Hono` + **PluggableStateMachineRegistry** + **GateService** +（可选）**AI SDK** 调模型。  
- **Worker**：OpenClaw / Nanobot(MCP) / LangChain.js Agent / CrewAI(Python) **任意**；只要遵守 [community-chat-paradigm.md](./community-chat-paradigm.md) 信封即可。

---

## 4. 可插拔 StateMachine（与具体场景解耦）

### 4.1 设计原则

- **一场景一插件**：如 `personal-butler-morning`、`personal-butler-evening`、`delivery-with-qa`、`hr-hire-fire`。  
- **CEO 核心**只负责：**选插件 → 取/存 `(taskId, pluginId, state)` → 调 `transition` → 执行 `sideEffects` → 调 Gate**。  
- **禁止**在核心里写 `switch(业务)` 巨分支；新业务 = **新包或新目录 + register()**。

### 4.2 建议接口（TypeScript 语义）

```typescript
/** 入站已归一化事件（来自任意频道） */
export type NormalizedEvent = {
  channelKind: 'ceo_dm' | 'ops' | 'hr';
  senderAgentId?: string;
  isUser: boolean;
  text: string;
  envelope: ParsedEnvelope | null;
  raw: unknown;
};

export type CeoContext = {
  taskId: string;
  roster: RosterSnapshot;
  channelIds: { ops: string; hr: string; ceoDm: string };
  now: Date;
};

export type SideEffect =
  | { type: 'post_message'; channel: string; text: string; threadId?: string }
  | { type: 'call_worker'; worker: string; payload: unknown }
  | { type: 'run_gate'; gateId: string; input: unknown };

export interface StateMachineTransition {
  nextState: string;
  sideEffects: SideEffect[];
}

/** 每个场景实现一个插件 */
export interface CeoStateMachinePlugin {
  /** 唯一 id，如 personal-butler-morning */
  readonly id: string;
  readonly version: string;
  /** 多插件同时 match 时，数字越小越优先 */
  readonly priority: number;

  /** 是否由本插件处理该事件（可结合 channelKind + INTENT + 私聊关键词） */
  match(event: NormalizedEvent, ctx: CeoContext): boolean;

  /** 新任务进入本插件时的初始状态 */
  getInitialState(seed: unknown): string;

  /** 返回 null 表示本事件不消费，交由下一插件 */
  transition(
    state: string,
    event: NormalizedEvent,
    ctx: CeoContext
  ): StateMachineTransition | null;
}

export class PluggableStateMachineRegistry {
  register(plugin: CeoStateMachinePlugin): void;
  /** 按 priority 排序，依次 match；持久化 (taskId, pluginId, state) */
  dispatch(taskId: string, event: NormalizedEvent, ctx: CeoContext): Promise<void>;
}
```

### 4.3 持久化

表字段示例：`tasks(id, plugin_id, state, updated_at)`；`task_id` 与聊天室 `[TASK:…]` 对齐。  
**换插件**：仅当 CEO 明确开新任务或 `plugin_id` 迁移策略允许（避免串状态）。

### 4.4 与 LangGraph.js 的关系（可选）

- **插件内部**可用 LangGraph 子图表达复杂分支，但 **对外仍实现 `CeoStateMachinePlugin`**：LangGraph 的 `invoke` 结果映射为 `nextState + sideEffects`。  
- **不把** LangGraph 的 graph 当作全局唯一 CEO 大脑——否则场景耦合、难测。

---

## 5. 核心模块职责（与插件边界）

| 模块 | 职责 |
|------|------|
| **InboundAdapter** | → `ChannelEvent` / `NormalizedEvent`。 |
| **EnvelopeParser** | → `ParsedEnvelope`；失败则 `envelope: null`。 |
| **RosterService** | Hire/Fire 与用户 `USER_APPROVE_*` 落库后再 `activate`。 |
| **PluggableStateMachineRegistry** | 注册、路由、持久化 state、执行 sideEffects。 |
| **GateService** | `checkMorningBrief(md)` 等；**无 LLM**。 |
| **OutboundAdapter** | 发往 web-ui。 |
| **WorkerClients** | HTTP 或代发公群消息。 |

---

## 6. 与 raganor-web-ui 的集成

1. Webhook 入站；2. REST 出站；3. 后期 WS。  
频道映射：`CHANNEL_ID_OPS`、`CHANNEL_ID_HR`、`CHANNEL_ID_CEO_DM`、**`CHANNEL_ID_PENDING`**（待聘，未雇佣 Agent 仅限此）— 见 [community-chat-paradigm.md](./community-chat-paradigm.md) **§6.0.1**。

---

## 7. 部署

**Docker**：单容器 CEO + volume（SQLite + 花名册）；与 web-ui **同一 compose 网络**。  
**Dev**：`tsx watch src/index.ts` + ngrok。

---

## 8. 安全

Webhook **HMAC / Bearer**；TLS；日志脱敏；花名册文件权限。

---

## 9. 迭代顺序

1. Registry + **mock 插件**（假 transition）。  
2. **personal-butler-morning** 插件 + Gate 快照。  
3. web-ui 入站 + Hire 用户同意门禁。  
4. Worker HTTP / 公群代发。  
5. **delivery-with-qa** 插件。

---

## 10. 文档索引

- [community-chat-paradigm.md](./community-chat-paradigm.md)、[orchestration.md](./orchestration.md)  
- [qa-role-and-e2e.md](./qa-role-and-e2e.md)、[personal-butler.md](./personal-butler.md)

---

*随 `raganor-web-ui` API 可增 Webhook 字段附录。*
