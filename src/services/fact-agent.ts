/**
 * Fact Agent - 事实区生成
 * 只做事实区，通过工具读盘，不编造
 */

import { loadBriefData } from './data-loader.js';
import { renderMorningBrief } from './renderer.js';
import type { FactResponse } from './a2a-envelope.js';

/**
 * 生成事实区
 * 从晨间简报中提取纯事实部分（不含建议区）
 */
export function generateFactSection(dataDir: string): FactResponse {
  const data = loadBriefData(dataDir);

  // 使用晨间简报渲染器生成完整输出
  const fullMarkdown = renderMorningBrief(data);

  // 提取事实区（第一个 ## 区块到 ## 今日打法 之前）
  // 注意：目前渲染器没有分离事实区和打法区，需要调整
  // 暂时返回完整输出，由 CEO 做门禁后决定是否附加打法区

  return {
    markdown: fullMarkdown,
    data_dir: dataDir,
    has_data: data.calendar.hasData ||
              data.todos.hasData ||
              data.okr.hasData ||
              data.habits.hasData
  };
}

/**
 * 生成事实摘要（用于发送给 OpenClaw）
 * 从完整事实区中提取关键信息，限制长度
 */
export function generateFactExcerpt(factMarkdown: string, maxLength: number = 500): string {
  // 移除 Markdown 标题标记，精简内容
  let excerpt = factMarkdown
    .replace(/#{1,2}\s+/g, '')  // 移除 # 标记
    .replace(/\*\*/g, '')        // 移除加粗
    .replace(/>/g, '')           // 移除引用
    .trim();

  // 如果超过长度限制，截断
  if (excerpt.length > maxLength) {
    excerpt = excerpt.slice(0, maxLength - 3) + '...';
  }

  return excerpt;
}

/**
 * 门禁检查：确保事实区没有编造
 */
export function validateFactSection(markdown: string, hasData: boolean): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 如果没有数据，不应出现具体时间
  if (!hasData) {
    // 检查是否有具体时间格式（如 2026-03-21T10:00）
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(markdown)) {
      errors.push('空数据模式下不应出现具体时间');
    }

    // 应该包含 "无数据" 或 "demo" 标记
    if (!markdown.includes('无数据') && !markdown.includes('demo')) {
      errors.push('空数据模式应标注无数据');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
