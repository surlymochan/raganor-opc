/**
 * OpenClaw Client
 * 与 OpenClaw 交互生成「今日打法」
 */

import type { PlaybookResponse } from './a2a-envelope.js';

// OpenClaw 配置
interface OpenClawConfig {
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
}

let config: OpenClawConfig = {
  baseUrl: process.env.OPENCLAW_URL || 'http://localhost:3000',
  apiKey: process.env.OPENCLAW_API_KEY,
  enabled: process.env.OPENCLAW_ENABLED !== 'false'
};

/**
 * 配置 OpenClaw Client
 */
export function configureOpenClaw(cfg: Partial<OpenClawConfig>): void {
  config = { ...config, ...cfg };
}

/**
 * 检查 OpenClaw 是否可用
 */
export function isOpenClawAvailable(): boolean {
  return config.enabled;
}

/**
 * 生成今日打法
 * 调用 OpenClaw 基于事实摘要生成建议
 */
export async function generatePlaybook(factExcerpt: string): Promise<PlaybookResponse> {
  if (!config.enabled) {
    // OpenClaw 不可用时的降级响应
    return {
      markdown: '**今日打法**：策略 Agent 未连接，已跳过',
      disclaimer: '本建议基于上文事实生成，仅供参考，不构成专业建议。'
    };
  }

  try {
    // 构造 prompt
    const prompt = buildPlaybookPrompt(factExcerpt);

    // 调用 OpenClaw API
    // 注意：这里需要根据实际 OpenClaw API 调整
    const response = await fetch(`${config.baseUrl}/api/playbook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`OpenClaw API error: ${response.status}`);
    }

    const data = await response.json() as { playbook: string };

    return {
      markdown: data.playbook,
      disclaimer: '本建议基于上文事实生成，仅供参考，不构成专业建议。'
    };
  } catch (error) {
    // 降级处理
    console.warn('OpenClaw 调用失败，降级处理:', error instanceof Error ? error.message : 'Unknown error');
    return {
      markdown: '**今日打法**：策略 Agent 暂时不可用，已跳过',
      disclaimer: '本建议基于上文事实生成，仅供参考，不构成专业建议。'
    };
  }
}

/**
 * 构建打法 prompt
 */
function buildPlaybookPrompt(factExcerpt: string): string {
  return `你是一个个人助理，基于以下事实摘要，为用户生成今日工作建议。

## 事实摘要
${factExcerpt}

## 要求
1. 只基于上述事实生成建议，不要编造新信息
2. 如果信息不足，说明"信息不足以生成建议"
3. 优先排序重要事项
4. 指出可能的冲突或时间冲突
5. 建议要具体、可执行

## 输出格式
以 Markdown 格式输出"今日打法"建议区块。`;
}

/**
 * 门禁检查：验证建议区质量
 */
export function validatePlaybook(markdown: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 建议区不应为空
  if (!markdown || markdown.trim().length === 0) {
    errors.push('建议区不能为空');
  }

  // 应包含免责声明
  if (!markdown.includes('仅供参考') && !markdown.includes('不构成')) {
    errors.push('建议区应包含免责声明');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
