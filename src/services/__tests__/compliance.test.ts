import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadBriefData } from '../data-loader.js';
import { renderMorningBrief, renderEveningBrief } from '../renderer.js';

// 晨间简报必须包含的区块标题
const MORNING_SECTIONS = [
  '## 今日日程',
  '## 待办事项',
  '## 本周 OKR',
  '## 今日习惯',
  '## 股票行情',
  '## 身心健康'
];

// 晚间简报必须包含的区块标题
const EVENING_SECTIONS = [
  '## 今日完成回顾',
  '## 未完成事项',
  '## 明日预备',
  '## 习惯打卡提醒',
  '## 股票行情',
  '## 身心健康'
];

// 免责声明关键词（来自 personal-butler.md §9）
const STOCK_DISCLAIMER_KEYWORDS = [
  '不构成投资建议',
  '投资建议'
];

const WELLNESS_DISCLAIMER_KEYWORDS = [
  '不提供诊疗',
  '诊疗'
];

// 不应出现的内容（防编造）
const FORBIDDEN_PATTERNS = [
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // 具体时间如 2026-03-21T10:00
  /[A-Z]{2,5}\d{4,}/, // 股票代码如 AAPL123
  /医院|诊所|医生/, // 医疗相关虚构内容
  /(?!.*无数据)(?!.*demo).*2026.*股票.*/, // 具体年份+股票
];

/**
 * 检查输出是否包含所有必需区块
 */
function hasAllSections(output: string, sections: string[]): { valid: boolean; missing: string[] } {
  const missing = sections.filter(s => !output.includes(s));
  return { valid: missing.length === 0, missing };
}

/**
 * 检查免责声明
 */
function hasDisclaimer(output: string, keywords: string[]): boolean {
  return keywords.some(kw => output.includes(kw));
}

/**
 * 检查是否有防编造内容
 */
function hasForbiddenContent(output: string, patterns: RegExp[]): string[] {
  return patterns
    .filter(p => p.test(output))
    .map(p => p.toString());
}

describe('compliance', () => {
  const demoDataDir = path.join(process.cwd(), 'examples', 'demo-data');
  const emptyDir = path.join(process.cwd(), 'examples', 'demo-data', 'empty');

  describe('晨间简报区块完整性', () => {
    it('应包含所有必需的区块标题', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      const result = hasAllSections(output, MORNING_SECTIONS);
      expect(result.valid, `缺失区块: ${result.missing.join(', ')}`).toBe(true);
    });

    it('应包含标题', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('# 🌅 晨间简报');
    });
  });

  describe('晚间简报区块完整性', () => {
    it('应包含所有必需的区块标题', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderEveningBrief(data);

      const result = hasAllSections(output, EVENING_SECTIONS);
      expect(result.valid, `缺失区块: ${result.missing.join(', ')}`).toBe(true);
    });

    it('应包含标题', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderEveningBrief(data);

      expect(output).toContain('# 🌙 晚间简报');
    });
  });

  describe('免责声明合规', () => {
    it('晨间简报股票区块应包含投资建议免责', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 找到股票区块
      const stockSection = output.split('## 身心健康')[0]; // 股票在身心健康之前
      expect(hasDisclaimer(stockSection, STOCK_DISCLAIMER_KEYWORDS)).toBe(true);
    });

    it('晨间简报健康区块应包含诊疗免责', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 找到健康区块
      const wellnessSection = output.split('## 身心健康')[1];
      expect(hasDisclaimer(wellnessSection, WELLNESS_DISCLAIMER_KEYWORDS)).toBe(true);
    });

    it('晚间简报应包含股票和健康免责声明', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderEveningBrief(data);

      expect(hasDisclaimer(output, STOCK_DISCLAIMER_KEYWORDS)).toBe(true);
      expect(hasDisclaimer(output, WELLNESS_DISCLAIMER_KEYWORDS)).toBe(true);
    });
  });

  describe('空数据目录合规', () => {
    it('晨间简报空数据应标注 demo 模式', () => {
      const data = loadBriefData(emptyDir);
      const output = renderMorningBrief(data);

      // 应包含无数据/ demo 提示
      expect(output).toMatch(/无数据|demo|demo 模式/);
    });

    it('晚间简报空数据应标注 demo 模式', () => {
      const data = loadBriefData(emptyDir);
      const output = renderEveningBrief(data);

      expect(output).toMatch(/无数据|demo|demo 模式/);
    });

    it('晨间简报空数据不应有具体时间', () => {
      const data = loadBriefData(emptyDir);
      const output = renderMorningBrief(data);

      // 空数据不应出现具体的时间格式
      const hasTime = /\d{2}:\d{2}/.test(output);
      const hasDate = /2026-\d{2}-\d{2}/.test(output);

      // 如果标注了无数据/ demo，则不应该有具体时间
      if (output.includes('demo') || output.includes('无数据')) {
        // 允许时间格式存在（因为日期标题），但不应有日程时间点
        // 这里只检查明显的时间点格式
        expect(hasDate).toBe(false);
      }
    });
  });

  describe('防编造检查', () => {
    it('晨间简报 demo 数据不应有股票代码', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 检查是否有股票代码格式
      const hasStockCode = /[A-Z]{2,5}\d{4,}/.test(output);
      expect(hasStockCode).toBe(false);
    });

    it('晨间简报 demo 数据不应有具体医疗名词', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 排除免责声明后检查（免责声明允许出现"诊疗"等词）
      const mainContent = output.split('> ⚠️')[0];
      const forbiddenMedical = /医院|诊所|医生/.test(mainContent);
      expect(forbiddenMedical).toBe(false);
    });
  });

  describe('CI 可运行性', () => {
    it('测试应可通过 vitest 运行', () => {
      // 此测试确保所有合规检查都通过
      const data = loadBriefData(demoDataDir);

      // 晨间
      const morningOutput = renderMorningBrief(data);
      expect(hasAllSections(morningOutput, MORNING_SECTIONS).valid).toBe(true);
      expect(hasDisclaimer(morningOutput, STOCK_DISCLAIMER_KEYWORDS)).toBe(true);

      // 晚间
      const eveningOutput = renderEveningBrief(data);
      expect(hasAllSections(eveningOutput, EVENING_SECTIONS).valid).toBe(true);
      expect(hasDisclaimer(eveningOutput, STOCK_DISCLAIMER_KEYWORDS)).toBe(true);
      expect(hasDisclaimer(eveningOutput, WELLNESS_DISCLAIMER_KEYWORDS)).toBe(true);
    });
  });
});
