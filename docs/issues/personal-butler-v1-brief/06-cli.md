# [v1] CLI：brief morning / brief evening

## 标题

`[v1] CLI：brief morning | brief evening（stdout Markdown）`

## 描述

- 命令：`brief morning`、`brief evening`（若技术栈用 `npm run` / `uv run` 等，在 README 统一成 **三步内** 等价命令）  
- 输出：**Markdown 到 stdout**（便于管道与测试）  
- 支持 `--data-dir` 或与 #3 一致的环境变量覆盖数据路径  

## 验收标准

- [ ] README 三步内可执行两次命令并得到 Markdown  
- [ ] `--help` 或文档说明参数  

## 依赖

- #4、#5（渲染完成）

## 标签

`personal-butler`, `v1`, `cli`
