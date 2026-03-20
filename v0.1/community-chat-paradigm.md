# 聊天室 Agent 沟通范式（raganor-web-ui）

**适用**：CEO **默认可雇佣**的任意成员，只要能进入  
`~/workspace/project/raganor/raganor-web-ui` 所提供的 **聊天室** 并以 Agent 身份收发消息。  
**目的**：避免无结构刷屏、串台、丢上下文；与 `personal-butler.md` **§1.1** 的 A2A **intent 信封**对齐，可落在 **同一条消息文本**或 **结构化附件**（若 UI 支持）。

**强制校验**：**当前不做**。`raganor-web-ui` **不**拦截、不拒收未带 `[TASK:…]` 等格式的消息；本范式为 **Agent 实现侧与团队的约定**，由 CEO/编排层 **自愿遵守**；日后若要服务端校验再单独立项。

**互补文档**：协作气质与话术见 `../docs/agent-culture.md`；多机隧道与 chat 部署见 `../docs/company-agent-platform.md`。

---

## 0. 频道拓扑（**已定**）：**3 个频道 + 1 个 CEO 私聊**

全公司在 `raganor-web-ui` 侧固定为 **4 个会话位**（名称可配置，逻辑角色如下）：

| # | 类型 | 建议名 | 谁在用 | 干什么 |
|---|------|--------|--------|--------|
| **1** | **私聊** | **你 ↔ CEO**（1:1） | **仅你 + CEO** | 你 **主要在此下命令**；CEO `ACK`/`CLARIFY`、**`USER_REPLY`**（最终交付摘要或全文）。 |
| **2** | 频道 | **`#raganor-ops`**（公群 A） | **CEO + 已雇佣 Agent + 你（可选）** | **业务编排**：`ASSIGN` / `ACK` / `RESULT` / `QA_*` 等，§2 信封；透明可审计。 |
| **3** | 频道 | **`#raganor-hr`**（人事） | **CEO + 你 + 全员可读** | **`ROSTER_*` / `USER_APPROVE_*`**；Hire/Fire 提案与同意；§6。 |
| **4** | 频道 | **`#raganor-pending`**（待聘） | **未雇佣 Agent**（及 CEO 发提案时） | **未入司前仅限此**；人事回执如 `ROSTER_ACK`；**不得进 ops**，见 §6.0.1。 |

**配置键**（CEO 服务）：`CHANNEL_ID_CEO_DM`、`CHANNEL_ID_OPS`、`CHANNEL_ID_HR`、`CHANNEL_ID_PENDING` — 与 [ceo-agent-architecture.md](./ceo-agent-architecture.md) §6 一致。

**推荐流**

1. 你在 **私聊** 发命令 → CEO `ACK` / `CLARIFY`。  
2. CEO 在 **`#raganor-ops`** 派单，成员回 `RESULT`（全程 `task_id`）。  
3. 人事在 **`#raganor-hr`**：`ROSTER_HIRE` → 你 `USER_APPROVE_HIRE` → Agent `ROSTER_ACK` → 入司后再进 ops。  
4. CEO 合并后，在 **私聊** 发 `USER_REPLY`；细节在 ops 留痕。

**你参与公群时（可选约定）**

- 发言前加 **`[USER]`** 或统一 `@你的显示名`，避免与 Agent 消息混淆。  
- **参与讨论**不等于改 `task_id` 归属：仍由 **CEO** 决定是否采纳、是否改派（避免多头指挥）。

**注意**

- **敏感信息**（token、隐私原文）：仍遵守 §8，**不进公群**；私聊或 CEO 侧环境变量。  
- **噪音**：公群会刷屏；若介意，可只订阅 CEO 的 `USER_REPLY`，公群作 **按需打开** 的审计日志。  
- **「你」与 Cursor**：日常实现里私聊对象是 **CEO Agent**（如老周）；**Cursor 与本仓库助手**是开发时工具，**不**等同于 web-ui 里的 CEO，除非你做专门桥接。

**评价**：**三频道 + 一私聊** 与 P1「用户默认只找 CEO」**兼容**（口令在私聊，协作在 ops，人事在 hr，待聘隔离）。**已采纳为定案**。

---

## 1. 核心原则

| # | 原则 | 说明 |
|---|------|------|
| P1 | **用户默认只找 CEO** | **主推**：用户在 **CEO 私聊（§0-B）** 下命令；其他 Agent **不直接**接用户私活，除非 CEO 在 **公群（§0-A）** 显式 `@成员 对用户回复`。用户进公群仅为 **旁听/讨论**，不替代 CEO 派单权。 |
| P2 | **工作消息必须可关联** | 凡属任务执行、交付、阻塞，必须带 **`task_id`**（UUID 或 CEO 发的单调递增号）；无 `task_id` 的闲聊 **不得冒充工作结论**。 |
| P3 | **CEO 是编排枢纽** | 跨成员协作由 **CEO 派单或转述**；成员 **不** 在聊天室里「私下约活」绕过 CEO（紧急同步可 @CEO 说明例外）。 |
| P4 | **先 ACK 后长活** | 收到派单后 **一条 ACK**（收到/理解/预计时间），再发长文结果，避免老板以为掉线。 |
| P5 | **一条消息尽量一事** | 同一 `task_id` 下，**交付**与**新问题**拆两条发，方便 CEO 做门禁与合并。 |

---

## 2. 消息信封（聊天室落地版）

每条 **工作相关**消息，建议在正文 **首行或固定前缀**携带机器可解析片段（若 UI 有 JSON 卡片则用卡片等价字段）。

**推荐文本前缀（无结构化 UI 时）**

```text
[TASK:<task_id>][FROM:<agent_id>][TO:<agent_id|ceo>][INTENT:<intent>]
```

**字段**

| 字段 | 必填 | 说明 |
|------|------|------|
| `task_id` | 是 | CEO 开任务时生成；整段协作 **不变**。 |
| `FROM` / `TO` | 是 | 小写 `agent_id`：`ceo`、`fact`、`openclaw` 或与 **花名册**一致。 |
| `INTENT` | 是 | 见下节；与 `personal-butler.md` §1.1 的 `MORNING_*` / `EVENING_*` **可扩展同一枚举**。 |

**正文**：前缀 **下一行**起写自然语言或 Markdown。

**示例**

```text
[TASK:a1b2c3][FROM:fact][TO:ceo][INTENT:MORNING_FACTS_RESULT]
## 事实与日程
（Fact 产出正文…）
```

---

## 3. INTENT 最小集合（可扩展）

**派单（CEO → 成员）**

| INTENT | 含义 |
|--------|------|
| `ASSIGN` | CEO 派活；`payload` 在正文或下一条结构化里说明（如 `data_dir`、截止、验收要点）。 |
| `FORWARD` | CEO 转述用户澄清问题，限 1～2 轮。 |

**回执（成员 → CEO）**

| INTENT | 含义 |
|--------|------|
| `ACK` | 已收到，复述理解 + 预计完成时间。 |
| `RESULT` | 交付物（事实区、建议区等）；对应 §1.1 里 Fact/OpenClaw 回包。 |
| `BLOCK` | 阻塞：缺数据、缺权限、工具失败；**禁止编造**。 |
| `CLARIFY` | 需 CEO 或用户澄清；**最多 2 问**，选项式优先。 |

**CEO 对外**

| INTENT | 含义 |
|--------|------|
| `USER_REPLY` | CEO 合并后对用户可见的最终 Markdown。 |
| `SKIP` | 某成员未连接，CEO 说明降级（如「今日打法已跳过」）。 |

**质检 QA**（功能类任务默认启用，见 [qa-role-and-e2e.md](./qa-role-and-e2e.md)）

| INTENT | 含义 |
|--------|------|
| `QA_ASSIGN` | CEO→QA：派验证（契约摘要、E2E 命令、环境）。 |
| `QA_RESULT` | QA→CEO：通过/不通过 + 证据。 |
| `QA_BLOCK` | QA→CEO：空测试、E2E 失败、未覆盖等。 |

个人管家晨间链路可 **映射**为：`ASSIGN(MORNING_FACTS)` → `RESULT` → `ASSIGN(MORNING_PLAYBOOK)` → `RESULT` → `USER_REPLY`。  
**功能开发任务** 在 Worker `RESULT` 后增加：`QA_ASSIGN` → `QA_RESULT` → 通过后再 `USER_REPLY`。

---

## 4. @ 提及与可见性

- **派单**：CEO 使用 `@fact` `@openclaw` 等（与 `agent_id` 一致），同条带 `[TASK:…][INTENT:ASSIGN]`。  
- **回 CEO**：`TO:ceo` + `@ceo`（若 UI 需要提醒）。  
- **禁止**：成员之间 **@ 来 @ 去多轮** 无 CEO 知情；若需对口，先 `INTENT:CLARIFY` 经 CEO 同意或 CEO 拉线程。  
- **与用户**：仅 CEO 使用 `USER_REPLY` 或经 CEO 授权的 `@用户`。

---

## 5. 线程（若 web-ui 支持）

| 类型 | 用法 |
|------|------|
| **任务线程** | 每个 `task_id` **一个线程**最佳；首条由 CEO `ASSIGN` 创建。 |
| **大厅** | 仅公告、花名册、值班状态；**不** 贴长篇 `RESULT`。 |

若无线程能力：全员频道里 **必须用 [TASK:…] 前缀**，且 CEO 定期 `MERGE` 小结避免刷屏。

---

## 6. 花名册与 Hire / Fire（聘用与解聘）

**原则**：**CEO 只是公司里的一个角色（编排者）**，不能代替全体 Worker/QA。**扩编与减员**必须通过 **聊天室里的正式 Hire / Fire 流程** 落账，保证公群可审计、花名册与运行时一致。

**推荐频道**：在 `raganor-web-ui` 中设 **`#raganor-hr`（或公群 A 内固定「人事」线程）** 专门贴聘用/解聘公告；**与任务流水混发亦可**，但须带明确 `INTENT`，避免淹没。**私聊 B** 不用于 Hire/Fire（保持人事变动 **对团队透明**）。

**用户（老板）一票**：**聘用与解聘均须经你在 HR 频道明示同意** 方可生效；CEO **不得**在未取得同意前改花名册为入编/除名。

### 6.0 接入层 vs 人事权（CEO 控制）

- **连进来**：任意 Agent 只要实现 **community-chat / WebSocket** 客户端（`raganor-web-ui` **已提供**），即可 **技术上** 进入聊天室收发消息。  
- **人事与档案主权**：**`agent_id`、显示名、花名、对外简介、能力标签、可接 `INTENT` 列表** 等 **注册信息由 CEO 在聘用流程中裁定并写入花名册**；候选者可自荐代号，**以 CEO 在 `ROSTER_HIRE` 正文中写明、且经你 `USER_APPROVE_HIRE` 生效的为准**。  
- **进公司 = Hire 成功**：**仅「在线」不等于「入司」**。须完成 **§6.2** 全流程（含你同意 + `ROSTER_ACK` + 花名册 `active`）后，CEO 方可向其发工作类 **`ASSIGN`**。此前处于 **未雇佣** 状态：实现上可限制为 **仅允许人事类消息**（如 `ROSTER_ACK`）或旁听，**不接派单**。  
- **其他 Agent 的义务**：遵守 **信封 + 本 §6**；无需自建一套 Hire 规则，**跟着 CEO 发的 `ROSTER_HIRE` 对齐身份即可**。

### 6.0.1 频道权限（建议，`raganor-web-ui` 产品规则）

**目标**：未入司 Agent **连上 WS 也不应**直接进业务公群刷屏或接敏感上下文；**入司后**再开放协作频道。

| 身份 | 可进入 / 可见 |
|------|----------------|
| **未雇佣**（花名册无此 `agent_id` 或非 `active`） | **仅 `#raganor-pending`（待聘）** 或等价频道：可发 **人事相关**（如回应 CEO 的 `ROSTER_HIRE`、发 `ROSTER_ACK`），**不可**进入 **`#raganor-ops`（公群 A）**、**不可**读 HR 以外之任务流水（若技术上一频道多用途，则由 **CEO 忽略其非人事消息** 直至入司）。 |
| **已雇佣**（`active`） | 按花名册 **能力标签** 进入 **`#raganor-ops`**、**`#raganor-hr`（只读或发帖按角色）** 等；CEO 方对其 **`ASSIGN`**。 |

**实现要点**（web-ui / 网关侧，**与「暂不强制信封校验」独立**）：

- 连接鉴权后解析 **客户端上报的 `agent_id`**（或会话令牌映射），与 **CEO 侧花名册** 或 **只读镜像** 比对。  
- **路由**：`agent_id ∉ active` → 仅订阅/写入 **待聘** topic；**Hire 生效后** 更新订阅或发 **「准入 ops」** 系统事件。  
- **CEO 服务**：即使误入 ops，仍 **不向** 非 `active` 的 `TO:` 目标派 `ASSIGN`（双保险）。

### 6.1 花名册（权威源，CEO 维护）

在仓库或 `~/raganor-company/` 维护 **机器可读 + 人可读** 表（**CEO 为权威编辑**；变更仅随已批准的 Hire/Fire 或运维同步）：

| agent_id | 显示名 | 花名/备注（可选） | 能力标签 | 接入方式 | 状态 |
|----------|--------|-------------------|----------|----------|------|
| ceo | 老周 | 总裁办 | 编排、门禁、对用户 | web-ui + CEO 服务 | active |
| fact | 简报员 | — | MORNING_FACTS, EVENING_FACTS | WS+community-chat | active |
| openclaw | 策略 | — | MORNING_PLAYBOOK | WS+community-chat | active |
| qa | 质检 | 阿梅 | QA_*、E2E | WS+community-chat | active |

CEO 运行时 **仅向 `active` 且花名册存在的 `agent_id` 派单**；未登记视为 **未雇佣**，不得接 `ASSIGN`。

### 6.2 Hire（聘用）

1. **CEO 在 HR 频道发帖**（提案，**尚未生效**）：  
   `[INTENT:ROSTER_HIRE][FROM:ceo][TO:all]`，正文含：`hire_ref`、`agent_id`（**CEO 裁定**）、`display_name`、**花名/简介（可选）**、**能力标签**、**接入说明**（已连 WS/community-chat 的确认方式）。  
2. **你（用户）在同频道明示同意**（**必选项**）：  
   `[USER][INTENT:USER_APPROVE_HIRE][TO:ceo]`，正文须重复 **`hire_ref` 与 `agent_id`**，表示批准入编。  
   - 若不同意：发 `[USER][INTENT:USER_REJECT_HIRE]` + `hire_ref` + 简述理由；**流程终止**，不得入册。  
3. **仅在你同意后**，拟入职 Agent 再发 **`ROSTER_ACK`**（`agent_id` 与提案一致）。  
4. **运维/CEO** 将花名册更新为 `active` 并热加载；**步骤 2 未完成前禁止改 active**。  
5. **试岗（可选）**：CEO 发低风险 `ASSIGN` 验证连通性。

### 6.3 Fire（解聘）

1. **CEO 在 HR 频道发帖**（提案，**尚未生效**）：  
   `[INTENT:ROSTER_FIRE][FROM:ceo][TO:all]`，正文含：`fire_ref`、`agent_id`、建议 **生效时间**、**简述原因**。  
2. **你（用户）在同频道明示同意**（**必选项**）：  
   `[USER][INTENT:USER_APPROVE_FIRE][TO:ceo]`，须重复 **`fire_ref` 与 `agent_id`**。  
   - 若不同意：发 `[USER][INTENT:USER_REJECT_FIRE]` + `fire_ref`；CEO **不得**执行解聘。  
3. **仅在你同意后**：CEO **停止**派新单；在途 **改派**或 `SKIP` 并公告。  
4. **运维** 撤销权限/令牌、移出频道（若支持）。  
5. 花名册 `inactive`；CEO 运行时同步。

### 6.4 INTENT 汇总（人事）

| INTENT | 方向 | 含义 |
|--------|------|------|
| `ROSTER_HIRE` | CEO→all | **聘用提案**（待用户同意）。 |
| `USER_APPROVE_HIRE` | 用户→ceo | 老板批准聘用；须含 `hire_ref` + `agent_id`。 |
| `USER_REJECT_HIRE` | 用户→ceo | 否决聘用提案。 |
| `ROSTER_ACK` | Agent→ceo | 拟入职 Agent 确认（**仅**在用户 `USER_APPROVE_HIRE` 之后）。 |
| `ROSTER_FIRE` | CEO→all | **解聘提案**（待用户同意）。 |
| `USER_APPROVE_FIRE` | 用户→ceo | 老板批准解聘；须含 `fire_ref` + `agent_id`。 |
| `USER_REJECT_FIRE` | 用户→ceo | 否决解聘提案。 |
| `ROSTER_UPDATE` | CEO/运维→all | 花名册版本变更摘要（**须**与已获批准的 Hire/Fire 一致）。 |

---

## 7. 频率与防风暴

- 同一 `task_id` 下，成员 → CEO：**ACK 1 条 + RESULT 1 条** 为理想形态；中间仅允许 **1 条 CLARIFY**。  
- **禁止**：同一结果重复刷；无新信息的「收到」「好的」连发。  
- 与 `orchestration.md` 一致：成员间 **若** 需直连，须带 `task_id` 且 **轮次上限** 由 CEO 配置（默认 **0**，即禁止私聊工作，只经 CEO）。

---

## 8. 安全与隐私

- **Token、cookie、密钥**：**不得** 进聊天室明文；用 CEO 侧 env 或私域文件，成员通过 **工具** 读，不在消息里回显。  
- **用户隐私数据**：`RESULT` 里 **最小必要**；对外 `USER_REPLY` 前 CEO 做脱敏门禁（可选规则）。

---

## 9. 违规时的处理

| 情况 | CEO 动作 |
|------|----------|
| 无 `task_id` 的工作结论 | 视为无效，要求重发或忽略 |
| 成员直连绕 CEO | 提醒一次；仍犯则本轮任务打回 |
| 编造事实 | `REJECT` + 要求 `BLOCK` 说明真实缺失 |
| 刷屏 | 要求合并为单条 `RESULT` |

---

## 10. 与「任意雇佣」的关系

- **任意 Agent**：可先 **WebSocket/community-chat 在线**；**入司**须 **§6 Hire** 入册 `active` 后 CEO 方可 `ASSIGN`；**Fire** 后即未雇佣。  
- **人事字段**：**CEO 控制**注册与花名册；Agent **遵循机制连上 + 被 Hire 成功** 即进公司。  
- **异构**：不限运行时；**传输**统一走已实现之 community-chat；对内 **信封 + INTENT**。

---

*版本：v0.1 · 随 web-ui 消息格式演进可增附录（如 WebSocket 字段映射）。*
