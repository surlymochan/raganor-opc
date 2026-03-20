# 个人管家：路线图 + v1 规格（晨晚简报）

**Slogan 对齐**：一句话需求 + 长程任务解决神器（个人侧：**一句话** → 晨/晚简报；**长程** 先靠周节奏与 OKR/习惯占位。）

---

## 一、v1 范围（已锁定）

**方案 3**：**晨间 / 晚间 10 分钟简报一体**。

**目标**：单一入口，每日两次结构化输出，整合 **日程、待办、OKR（本周一句摘要）、习惯**；**股票、身心健康** 仅 **占位 + 免责声明**，不提供投资建议或医疗诊断。

### 1.1 三 Agent + A2A（简化）：场景 **A** 一句话晨间 +「今日打法」

**整体做成 Agent 与 Agent 交互**；**不写独立「代码流水线」角色**——**事实区也由一个 Agent 产出**（可用 OpenClaw **另一实例/另一 bot** + 强约束与工具读盘，或任意运行时，只要对外是 **一个 Fact Agent**）。

| Agent | 建议花名 | 职责 |
|--------|----------|------|
| **CEO** | 老周（编排） | **仅**工作流 + 门禁 + 合并 + 对用户单出口：收用户一句话 → 发 A2A 任务 → 收 Fact / OpenClaw 回包 → 校验区块与免责 → 拼成最终 Markdown。**不写**事实正文、**不写**建议正文。 |
| **Fact** | 简报员（事实） | **只做事实区**：通过工具读 `data_dir` 下本地数据，按 §3.3（晨）/ §3.4（晚）输出 Markdown；**只陈述已读到的内容**，缺数据写「无数据/demo」，**禁止编造**日程与行情。 |
| **OpenClaw** | 策略（建议） | **只做晨间建议区**：只基于 CEO 转发的 **事实摘要** 写「今日打法」（优先序、坑、30 分钟先做哪件）；**不得新增事实**，不足则答「信息不足」。 |

**晨间链路（A2A，固定顺序）**

```text
用户 ──► CEO ──► Fact ──► CEO(门禁) ──► OpenClaw ──► CEO(门禁+合并) ──► 用户
```

**晚间链路（v1 简化，仍全 Agent）**

```text
用户 ──► CEO ──► Fact ──► CEO(门禁+合并) ──► 用户
```

（晚间不接 OpenClaw，直至扩展场景 B。）

**极简信封（任选 HTTP / community-chat / 内存队列，实现越简单越好）**  
落在 **raganor-web-ui 聊天室** 时，须遵守 [community-chat-paradigm.md](./community-chat-paradigm.md)（`[TASK:…][FROM:…][TO:…][INTENT:…]` 前缀与 INTENT 表可合并扩展）。

```json
{
  "task_id": "uuid",
  "from": "ceo|fact|openclaw",
  "to": "ceo|fact|openclaw",
  "intent": "MORNING_FACTS | MORNING_PLAYBOOK | EVENING_FACTS",
  "payload": { "data_dir": "...", "fact_excerpt": "..." }
}
```

- `MORNING_FACTS`：CEO→Fact，`payload` 含 `data_dir`。  
- `MORNING_PLAYBOOK`：CEO→OpenClaw，`payload` 含 **限长** `fact_excerpt` 或等价结构化摘要。  
- `EVENING_FACTS`：CEO→Fact，同上。

**用户侧（仍尽量一句话）**：触发词同 §5；用户 **只对接 CEO**，不感知 Fact/OpenClaw 来回。

**最终 Markdown 结构（晨间）**

1. **`## 事实与日程`（及子区块）** — **Fact Agent** 产出，§3.3 顺序。  
2. **`## 今日打法（建议，非事实）`** — **OpenClaw** 产出；文首固定声明：基于上文事实、非专业建议、日程变更以本人确认为准。

**失败与降级**：OpenClaw 不可达时，CEO 只发布 Fact 回包 + 门禁行 `今日打法：策略 Agent 未连接，已跳过`。

---

## 二、Roadmap（v1 之后）

| 阶段 | 模块 | 说明 |
|------|------|------|
| **R2** | 日程 + 待办深度统一 | 多日历/任务源、冲突与排程 |
| **R3** | 个人 OKR 管理与推进 | 与 `orchestration.md` 契约/周复盘门禁对齐 |
| **R4** | 习惯养成 | 打卡、连续、简报联动 |
| **R5** | 兴趣资讯 + 行动点 | RSS/订阅；可选 demo 验证 |
| **R6** | 炒股盯盘 | 展示与提醒；合规 |
| **R7** | 身心健康 | 记录与提醒；非诊疗 |
| **R8** | Demo / 项目验证助手 | 与一人公司长程主线合并 |

**架构对齐**：v1 CEO/门禁 **轻量化**（分区块输出、免责声明、禁编造）；R3 起加强契约与门禁。

---

## 三、v1 产品说明

### 3.1 一句话

用户 **一句话**（或「生成简报」）触发 **晨间或晚间** 简报：日程、待办 Top、OKR 摘要、习惯；股票/健康 **占位**。

### 3.2 场景

| 场景 | 触发示例 | 期望 |
|------|----------|------|
| 晨间 | 「晨间简报」「今天怎么安排」 | 冲突、Top 待办、OKR 一句、习惯 |
| 晚间 | 「晚间简报」「今天复盘」 | 今日回顾、明日预备、习惯提示 |

### 3.3 晨间区块（顺序）

1. 今日日程（冲突/空档）  
2. 待办 Top 3（不足则全列）  
3. 本周 OKR 进度（一句话 + 可选标签）  
4. 习惯（今日应做 / 已完成）  
5. **股票（占位）** + 固定脚注：非投资建议  
6. **身心健康（占位）** + 固定脚注：非医疗建议  

### 3.4 晚间区块

1. 今日完成回顾（日程/待办状态）  
2. 未完成 Top（可顺延）  
3. 明日预备  
4. 习惯未打卡提醒  
5. OKR 一句（非强制建议）  
6. 股票/健康：同占位规则  

---

## 四、数据模型（v1 最小）

**本地优先**；无第三方密钥可跑 demo。

| 实体 | 最小字段 | v1 来源 |
|------|----------|---------|
| calendar_event | start, end, title, source? | 本地 YAML/JSON 或 demo；真实 API → R2 |
| todo | title, priority, due?, done | 本地文件 |
| okr_week | week_id, objectives[] | 本地文件 |
| habit | name, frequency_rule, today_done | 本地文件 |
| equity_placeholder | enabled: false | 占位 |
| wellness_placeholder | enabled: false | 占位 |

**可选**：`day_focus.md` — 一句话澄清后写入今日 1～3 重点，简报优先对齐。

---

## 五、一句话与澄清（v1 轻量）

- 「今天怎么安排」→ 晨间；「晚上复盘」→ 晚间。  
- 模糊时 **≤1～2 个选择题**（晨/晚？是否更新焦点？），原则同 [orchestration.md](./orchestration.md) 契约节，字段从简。

---

## 六、CEO / 门禁（v1 轻量）

- **不做** 完整 [governance.md](./governance.md) 决议模板。  
- **必做**：输出 **固定分区块**（利测试解析）；股票/健康 **必有免责声明**；数据缺失写 **无数据/demo**，**禁止编造**日程或行情。

---

## 七、技术形态（建议）

- CLI：`brief morning` / `brief evening` → stdout Markdown。  
- **场景 A**：入口仍可为 `brief morning`（或仅 CEO 监听用户）；内部为 **CEO→Fact→CEO→OpenClaw→CEO** 的 A2A；环境变量、OpenClaw/Fact 接入方式见实现 README。  
- 可选：静态 HTML 渲染。  
- 后续：与 OpenClaw 深度集成时为 **skill**。

---

## 八、Demo / 开源友好

- `examples/demo-data/`：日程、待办、OKR、习惯示例。  
- README：**三步** 跑通晨间+晚间（无 API Key）。  
- 录屏：空数据 → 无数据提示；载入 demo → 完整简报。

---

## 九、免责声明（常驻）

- **证券**：不构成投资建议或买卖邀约；用户自担风险。  
- **健康**：不提供诊疗；健康问题询专业机构。

---

## 十、v1 不做

- 真实行情/券商 API  
- 诊疗/用药建议  
- 全自动资讯爬虫（→ R5）  
- 外部日历 OAuth（→ R2）

---

*实现任务已拆为离线 Issues：见 [`docs/issues/personal-butler-v1-brief/`](../docs/issues/personal-butler-v1-brief/) 与 [`docs/issues/README.md`](../docs/issues/README.md)。*
