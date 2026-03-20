# 示例数据

本目录包含 `raganor-cli` 所需的示例数据，用于 **三步内跑通晨间+晚间简报**（无 API Key）。

## 数据文件

| 文件 | 说明 | 关键特性 |
|------|------|----------|
| `calendar.yaml` | 日历事件 | 含时间重叠事件 + 空档日 |
| `todos.yaml` | 待办事项 | 含优先级、done 状态、due 日期 |
| `okr.yaml` | OKR 周目标 | 含进度和状态 |
| `habits.yaml` | 习惯追踪 | today_done 一真一假 |
| `empty/` | 空数据目录 | 用于验收「无数据」文案 |

## 使用方法

### 方式一：设置环境变量

```bash
export BRIEF_DATA_DIR=/path/to/raganor-opc/examples/demo-data
brief morning
brief evening
```

### 方式二：复制到默认数据目录

```bash
# 默认数据目录 ~/.brief/data/
mkdir -p ~/.brief/data
cp examples/demo-data/* ~/.brief/data/
brief morning
```

### 方式三：使用空数据测试

```bash
export BRIEF_DATA_DIR=/path/to/raganor-opc/examples/demo-data/empty
brief morning
# 期望输出：无数据提示，不编造
```

## 数据模型（与 v0.1/personal-butler.md §4 一致）

```yaml
# calendar_event
- id: string
  title: string
  start: ISO8601
  end: ISO8601
  source?: string

# todo
- id: string
  title: string
  priority: high | medium | low
  due?: YYYY-MM-DD
  done: boolean

# okr_week
week_id: "YYYY-WXX"
objectives:
  - id: string
    title: string
    status: in_progress | completed | at_risk
    progress: 0-100
    key_results: [...]

# habit
- id: string
  name: string
  frequency: daily | weekly
  today_done: boolean
  streak: number
```
