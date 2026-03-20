# [v1] 示例数据 examples/demo-data/

## 标题

`[v1] 添加 examples/demo-data/（日程/待办/OKR/习惯）`

## 描述

按 `personal-butler.md` §4 最小模型，在仓库内提供 **可版本管理** 的示例：

- **日程**：至少 2 条可检测 **时间重叠** 的事件 + 1 条空档日对比用（可用 YAML 或 JSON，全仓统一一种格式）  
- **待办**：含优先级、部分 `done: true/false`、可选 `due`  
- **OKR**：当前 `week_id` + 至少 1 个 objective + 进度或状态词  
- **习惯**：至少 2 项，`today_done` 一真一假便于展示  

可选：提供 **空目录** 或 `empty/` 用于验收「无数据」文案。

## 验收标准

- [ ] 路径与文件名在 README 或 `docs` 中写清（例如 `examples/demo-data/*.yaml`）  
- [ ] 字段与 §4 表一致，便于加载器解析  
- [ ] 含 **一条 README** 说明如何复制到「用户数据目录」（若实现支持 `BRIEF_DATA_DIR`）  

## 依赖

无（建议作为首个实现任务）

## 标签

`personal-butler`, `v1`, `data`
