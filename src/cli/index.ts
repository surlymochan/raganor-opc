#!/usr/bin/env node

import { loadBriefData, getDataDir } from '../services/data-loader.js';
import { renderMorningBrief, renderEveningBrief } from '../services/renderer.js';

/**
 * CLI 帮助信息
 */
function showHelp(): void {
  console.log(`
Raganor CLI - 个人管家简报生成器

用法:
  brief morning          生成晨间简报
  brief evening         生成晚间简报
  brief --help          显示帮助信息

选项:
  --data-dir <path>     指定数据目录（默认: $BRIEF_DATA_DIR 或 examples/demo-data）
  --help                显示帮助信息

示例:
  brief morning
  brief evening
  brief morning --data-dir ./my-data
  BRIEF_DATA_DIR=./my-data brief morning
`);
}

/**
 * 输出 Markdown 到 stdout
 */
function output(markdown: string): void {
  console.log(markdown);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 解析参数
  let mode: 'morning' | 'evening' | 'help' | null = null;
  let dataDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      mode = 'help';
      break;
    }

    if (arg === 'morning') {
      mode = 'morning';
    } else if (arg === 'evening') {
      mode = 'evening';
    } else if (arg === '--data-dir') {
      dataDir = args[++i];
    }
  }

  // 如果没有指定模式，尝试从参数推断
  if (!mode && args.length > 0) {
    if (args[0] === 'morning') mode = 'morning';
    else if (args[0] === 'evening') mode = 'evening';
  }

  // 显示帮助或无模式
  if (mode === 'help' || !mode) {
    showHelp();
    process.exit(mode === 'help' ? 0 : 1);
  }

  // 加载数据
  const effectiveDataDir = dataDir || getDataDir();

  try {
    const data = loadBriefData(effectiveDataDir);

    // 根据模式渲染
    if (mode === 'morning') {
      const output_ = renderMorningBrief(data);
      output(output_);
    } else if (mode === 'evening') {
      const output_ = renderEveningBrief(data);
      output(output_);
    }
  } catch (error) {
    console.error('错误：', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
