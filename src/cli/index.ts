#!/usr/bin/env node

import * as readline from 'readline';
import { loadBriefData, getDataDir } from '../services/data-loader.js';
import { renderMorningBrief, renderEveningBrief } from '../services/renderer.js';
import { recognizeIntent, getTriggerWordsTable, type BriefIntent } from '../services/intent.js';
import { runMorningBriefA2A, GateService } from '../services/ceo-orchestration.js';

/**
 * CLI 帮助信息
 */
function showHelp(): void {
  const triggers = getTriggerWordsTable();
  console.log(`
Raganor CLI - 个人管家简报生成器

用法:
  brief [options] [intent] [input]
  brief a2a [mode]   # 启用三 Agent A2A 模式

选项:
  --mode <morning|evening>  强制指定模式（跳过意图识别，用于 CI）
  --a2a                    启用 A2A 模式（CEO + Fact + OpenClaw）
  --data-dir <path>         指定数据目录
  --help                    显示帮助信息

A2A 模式说明:
  启用后，晨间简报将经过三 Agent 协作：
  CEO → Fact → OpenClaw → CEO(合并) → 用户

  环境变量:
  OPENCLAW_URL      OpenClaw 服务地址（默认: http://localhost:3000）
  OPENCLAW_API_KEY  OpenClaw API 密钥
  OPENCLAW_ENABLED  是否启用 OpenClaw（默认: true）

意图识别:
  输入包含以下关键词时自动识别：
  晨间: ${triggers.morning.slice(0, 5).join(', ')} 等
  晚间: ${triggers.evening.slice(0, 5).join(', ')} 等

示例:
  brief morning
  brief evening
  brief a2a morning      # A2A 模式晨间简报
  brief --a2a --mode morning
  BRIEF_DATA_DIR=./data brief
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
  a2aMode: boolean;
} {
  let mode: BriefIntent | null = null;
  let dataDir: string | null = null;
  let inputText: string | null = null;
  let showHelp = false;
  let a2aMode = false;

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
    } else if (arg === '--a2a' || arg === 'a2a') {
      a2aMode = true;
    } else if (arg === 'morning') {
      mode = 'morning';
    } else if (arg === 'evening') {
      mode = 'evening';
    } else if (!arg.startsWith('-')) {
      inputText = arg;
    }
  }

  return { mode, dataDir, inputText, showHelp, a2aMode };
}

/**
 * 执行晨间简报（标准模式）
 */
async function runMorningBrief(dataDir: string): Promise<void> {
  const data = loadBriefData(dataDir);
  console.log(renderMorningBrief(data));
}

/**
 * 执行晨间简报（A2A 模式）
 */
async function runMorningBriefA2A(dataDir: string): Promise<void> {
  const result = await runMorningBriefA2A(dataDir);

  // 打印日志到 stderr（可选）
  if (result.logs.length > 0) {
    console.error('--- 编排日志 ---');
    for (const log of result.logs) {
      console.error(log);
    }
    if (result.errors.length > 0) {
      console.error('--- 错误 ---');
      for (const err of result.errors) {
        console.error(err);
      }
    }
    console.error('----------------');
  }

  // 输出最终简报
  console.log(result.markdown);

  // 门禁检查
  const gateResult = GateService.checkMorningBrief(result.markdown);
  if (!gateResult.passed) {
    console.error('\n⚠️ 门禁警告:');
    for (const v of gateResult.violations) {
      console.error(`  - ${v}`);
    }
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
      stdinText = content.split('\n')[0];
    }
  }

  // 解析参数
  const { mode: explicitMode, dataDir, inputText, showHelp, a2aMode } = parseArgs(args);

  // 显示帮助
  if (showHelp) {
    showHelp();
    process.exit(0);
  }

  // 确定模式
  let finalMode: BriefIntent;

  if (explicitMode) {
    finalMode = explicitMode;
  } else if (stdinText) {
    const result = recognizeIntent(stdinText);
    if (result.needsClarification) {
      console.error(result.clarificationQuestion);
      process.exit(1);
    }
    finalMode = result.intent;
  } else if (inputText) {
    const result = recognizeIntent(inputText);
    if (result.needsClarification) {
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
    showHelp();
    process.exit(1);
  }

  // 执行
  const effectiveDataDir = dataDir || getDataDir();

  try {
    if (finalMode === 'morning') {
      if (a2aMode) {
        await runMorningBriefA2A(effectiveDataDir);
      } else {
        await runMorningBrief(effectiveDataDir);
      }
    } else {
      // 晚间简报（暂时不支持 A2A 模式）
      const data = loadBriefData(effectiveDataDir);
      console.log(renderEveningBrief(data));
    }
  } catch (error) {
    console.error('错误：', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
