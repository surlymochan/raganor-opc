/**
 * CEO 编排服务
 * 负责：工作流编排 + 门禁 + 合并
 */

import { generateTaskId } from './a2a-envelope.js';
import { generateFactSection, generateFactExcerpt, validateFactSection } from './fact-agent.js';
import { generatePlaybook, validatePlaybook, isOpenClawAvailable } from './openclaw-client.js';

export interface OrchestrationResult {
  success: boolean;
  markdown: string;
  logs: string[];
  errors: string[];
}

/**
 * 执行晨间简报编排（场景 A）
 * 用户 → CEO → Fact → CEO(门禁) → OpenClaw → CEO(门禁+合并) → 用户
 */
export async function runMorningBriefA2A(dataDir: string): Promise<OrchestrationResult> {
  const logs: string[] = [];
  const errors: string[] = [];
  const taskId = generateTaskId();

  logs.push(`[${taskId}] 开始晨间简报编排（场景 A）`);
  logs.push(`数据目录: ${dataDir}`);

  // Step 1: CEO → Fact (MORNING_FACTS)
  logs.push(`[${taskId}] CEO → Fact: MORNING_FACTS`);

  let factResult;
  try {
    factResult = generateFactSection(dataDir);
    logs.push(`[${taskId}] Fact 返回: has_data=${factResult.has_data}`);
  } catch (error) {
    errors.push(`Fact Agent 失败: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { success: false, markdown: '', logs, errors };
  }

  // Step 2: CEO 门禁 (Fact)
  logs.push(`[${taskId}] CEO 门禁: 检查 Fact 输出`);
  const factValidation = validateFactSection(factResult.markdown, factResult.has_data);

  if (!factValidation.valid) {
    logs.push(`[${taskId}] CEO 门禁失败: ${factValidation.errors.join(', ')}`);
    errors.push(...factValidation.errors);
    // 门禁失败，但仍然继续（降级）
  }

  // 提取事实摘要发给 OpenClaw
  const factExcerpt = generateFactExcerpt(factResult.markdown, 500);
  logs.push(`[${taskId}] 事实摘要长度: ${factExcerpt.length} 字符`);

  // Step 3: CEO → OpenClaw (MORNING_PLAYBOOK)
  logs.push(`[${taskId}] CEO → OpenClaw: MORNING_PLAYBOOK`);
  logs.push(`[${taskId}] OpenClaw 可用: ${isOpenClawAvailable()}`);

  let playbookResult;
  try {
    playbookResult = await generatePlaybook(factExcerpt);
    logs.push(`[${taskId}] OpenClaw 返回建议区`);
  } catch (error) {
    errors.push(`OpenClaw 调用失败: ${error instanceof Error ? error.message : 'Unknown'}`);
    // 降级：使用跳过说明
    playbookResult = {
      markdown: '**今日打法**：策略 Agent 暂时不可用，已跳过',
      disclaimer: '本建议基于上文事实生成，仅供参考，不构成专业建议。'
    };
  }

  // Step 4: CEO 门禁 (Playbook)
  logs.push(`[${taskId}] CEO 门禁: 检查 OpenClaw 输出`);
  const playbookValidation = validatePlaybook(playbookResult.markdown);

  if (!playbookValidation.valid) {
    logs.push(`[${taskId}] OpenClaw 门禁警告: ${playbookValidation.errors.join(', ')}`);
    // 警告但继续
  }

  // Step 5: CEO 合并
  logs.push(`[${taskId}] CEO 合并: 事实区 + 建议区`);
  const finalMarkdown = mergeMorningBrief(factResult.markdown, playbookResult.markdown, playbookResult.disclaimer);

  logs.push(`[${taskId}] 完成`);
  logs.push(`[${taskId}] 最终输出长度: ${finalMarkdown.length} 字符`);

  return {
    success: true,
    markdown: finalMarkdown,
    logs,
    errors
  };
}

/**
 * 合并晨间简报
 */
function mergeMorningBrief(factSection: string, playbook: string, disclaimer: string): string {
  // 检查是否已经有建议区（降级情况）
  const isFallback = playbook.includes('策略 Agent 未连接') ||
                     playbook.includes('暂时不可用') ||
                     playbook.includes('未连接');

  if (isFallback) {
    // 降级情况：附加建议区标题和降级说明
    const fallbackSection = `\n\n## 今日打法（建议，非事实）\n\n${playbook}\n\n> ${disclaimer}`;
    return factSection + fallbackSection;
  }

  // 正常情况：附加建议区
  const sections = factSection.split('\n\n');

  // 在倒数第二个性质区块（股票）之前插入建议区
  // 找到 "## 股票行情" 的位置
  const stockIndex = sections.findIndex(s => s.includes('## 股票行情'));

  if (stockIndex > 0) {
    sections.splice(stockIndex, 0,
      '\n\n## 今日打法（建议，非事实）\n\n' + playbook + '\n\n> ' + disclaimer
    );
  } else {
    sections.push(
      '\n\n## 今日打法（建议，非事实）\n\n' + playbook + '\n\n> ' + disclaimer
    );
  }

  return sections.join('\n');
}

/**
 * 门禁服务 - 纯函数，无 LLM
 */
export class GateService {
  /**
   * 检查晨间简报门禁
   */
  static checkMorningBrief(markdown: string): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    // 1. 必须包含固定区块
    const requiredSections = [
      '## 今日日程',
      '## 待办事项',
      '## 本周 OKR',
      '## 今日习惯'
    ];

    for (const section of requiredSections) {
      if (!markdown.includes(section)) {
        violations.push(`缺失区块: ${section}`);
      }
    }

    // 2. 股票/健康必须有免责声明
    if (!markdown.includes('不构成投资建议')) {
      violations.push('股票区块缺失免责声明');
    }
    if (!markdown.includes('不提供诊疗')) {
      violations.push('健康区块缺失免责声明');
    }

    // 3. 无数据模式检查
    if (markdown.includes('无数据') || markdown.includes('demo 模式')) {
      // 不应该有具体时间
      if (/\d{4}-\d{2}-\d{2}/.test(markdown)) {
        violations.push('无数据模式下不应出现具体日期');
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}
