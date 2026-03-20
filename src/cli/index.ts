#!/usr/bin/env node

import * as readline from 'readline';
import { loadBriefData, getDataDir } from '../services/data-loader.js';
import { renderMorningBrief, renderEveningBrief } from '../services/renderer.js';
import { recognizeIntent, getTriggerWordsTable, type BriefIntent } from '../services/intent.js';

/**
 * CLI 帮助信息
 */
function showHelp(): void {
  const triggers = getTriggerWordsTable();
  console.log(`
Raganor CLI - 个人管家简报生成器

用法:
  brief [options] [intent] [input]

选项:
  --mode <morning|evening>  强制指定模式（跳过意图识别，用于 CI）
  --data-dir <path>         指定数据目录
  --help                    显示帮助信息

意图识别:
  输入包含以下关键词时自动识别：
  晨间: ${triggers.morning.slice(0, 5).join(', ')} 等
  晚间: ${triggers.evening.slice(0, 5).join(', ')} 等

示例:
  brief morning
  brief evening
  brief "今天怎么安排"
  brief --mode morning
  BRIEF_DATA_DIR=./data brief

非交互式 fallback (CI):
  brief --mode morning
  echo "今天怎么安排" | brief
`);
}

/**
 * 创建 readline 接口
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 交互式获取用户选择
 */
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface();
    rl.question(question + '\n请输入选项 (1-2): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * 解析参数
 */
function parseArgs(args: string[]): {
  mode: BriefIntent | null;
  dataDir: string | null;
  inputText: string | null;
  showHelp: boolean;
} {
  let mode: BriefIntent | null = null;
  let dataDir: string | null = null;
  let inputText: string | null = null;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      break;
    }

    if (arg === '--mode') {
      const next = args[++i];
      if (next === 'morning' || next === 'evening') {
        mode = next;
      }
    } else if (arg === '--data-dir') {
      dataDir = args[++i];
    } else if (arg === 'morning') {
      mode = 'morning';
    } else if (arg === 'evening') {
      mode = 'evening';
    } else if (!arg.startsWith('-')) {
      inputText = arg;
    }
  }

  return { mode, dataDir, inputText, showHelp };
}

/**
 * 执行简报渲染
 */
async function runBrief(mode: BriefIntent, dataDir: string): Promise<void> {
  const data = loadBriefData(dataDir);

  if (mode === 'morning') {
    console.log(renderMorningBrief(data));
  } else {
    console.log(renderEveningBrief(data));
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 检查 stdin 是否有输入（管道输入）
  let stdinText: string | null = null;
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString().trim();
    if (content) {
      stdinText = content.split('\n')[0]; // 只取第一行
    }
  }

  // 解析参数
  const { mode: explicitMode, dataDir, inputText, showHelp } = parseArgs(args);

  // 显示帮助
  if (showHelp) {
    showHelp();
    process.exit(0);
  }

  // 确定模式
  let finalMode: BriefIntent;

  if (explicitMode) {
    // 强制模式 (--mode)
    finalMode = explicitMode;
  } else if (stdinText) {
    // 管道输入
    const result = recognizeIntent(stdinText);
    if (result.needsClarification) {
      console.error(result.clarificationQuestion);
      process.exit(1);
    }
    finalMode = result.intent;
  } else if (inputText) {
    // 命令行文本输入
    const result = recognizeIntent(inputText);
    if (result.needsClarification) {
      // 交互式澄清
      const answer = await askQuestion(result.clarificationQuestion!);
      if (answer === '1') {
        finalMode = 'morning';
      } else if (answer === '2') {
        finalMode = 'evening';
      } else {
        console.error('无效选择，使用 --mode 强制指定');
        process.exit(1);
      }
    } else {
      finalMode = result.intent;
    }
  } else {
    // 无输入，显示帮助
    showHelp();
    process.exit(1);
  }

  // 执行
  const effectiveDataDir = dataDir || getDataDir();

  try {
    await runBrief(finalMode, effectiveDataDir);
  } catch (error) {
    console.error('错误：', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
