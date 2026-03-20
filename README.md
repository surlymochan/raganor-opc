# Raganor OPC

**一人公司式多 Agent 编排框架**：CEO + Worker + QA，契约与机械验收优先。

> 一句话需求 → 晨/晚简报；长程任务靠周节奏与 OKR/习惯占位。

---

## 快速开始

### 三步跑通晨间 + 晚间简报

```bash
# 1. 安装依赖
npm install

# 2. 生成晨间简报
npm run brief:morning

# 3. 生成晚间简报
npm run brief:evening
```

### 其他用法

```bash
# 指定数据目录
BRIEF_DATA_DIR=./my-data npm run brief:morning

# 强制模式（跳过意图识别，用于 CI）
npm run brief:morning -- --mode evening

# 运行测试
npm test
```

---

## 项目结构

```
raganor-opc/
├── src/
│   ├── cli/              # 命令行入口
│   ├── services/         # 核心服务
│   │   ├── data-loader.ts   # 数据加载
│   │   ├── renderer.ts      # 简报渲染
│   │   └── intent.ts        # 意图识别
│   └── services/__tests__/ # 测试
├── examples/
│   └── demo-data/        # 示例数据
├── v0.1/                # 核心规范
│   ├── orchestration.md
│   ├── ceo-agent-architecture.md
│   └── personal-butler.md
├── docs/
│   ├── design/           # 设计文档
│   └── issues/          # Issues (GitHub 同步)
```

---

## 数据目录

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BRIEF_DATA_DIR` | `examples/demo-data/` | 数据根目录 |

示例数据包含：日程、待办、OKR、习惯（均为 demo 模式）。

---

## 免责声明

- **股票行情**：占位功能，不构成投资建议
- **健康追踪**：占位功能，不提供诊疗

---

## 文档索引

| 入口 | 说明 |
|------|------|
| [docs/design/README.md](./docs/design/README.md) | 设计门户（推荐起点） |
| [docs/design/system-design.md](./docs/design/system-design.md) | 系统架构图 |
| [v0.1/personal-butler.md](./v0.1/personal-butler.md) | 个人管家 v1 规格 |
| [docs/issues/README.md](./docs/issues/README.md) | Issues 追踪 |

---

## 状态

- **Personal Butler v1**: 开发中（CLI 核心功能已完成）
- **Platform v1**: 规划中（CEO 服务 + community-chat）
