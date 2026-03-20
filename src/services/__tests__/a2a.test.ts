import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { runMorningBriefA2A, GateService } from '../ceo-orchestration.js';

describe('a2a', () => {
  const demoDataDir = path.join(process.cwd(), 'examples', 'demo-data');

  describe('runMorningBriefA2A', () => {
    it('应成功执行晨间简报 A2A', async () => {
      const result = await runMorningBriefA2A(demoDataDir);

      expect(result.success).toBe(true);
      expect(result.markdown.length).toBeGreaterThan(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('应包含事实区内容', async () => {
      const result = await runMorningBriefA2A(demoDataDir);

      expect(result.markdown).toContain('## 今日日程');
      expect(result.markdown).toContain('## 待办事项');
    });

    it('应包含建议区或降级说明', async () => {
      const result = await runMorningBriefA2A(demoDataDir);

      // 要么有建议区，要么有降级说明
      const hasPlaybook = result.markdown.includes('## 今日打法') ||
                         result.markdown.includes('今日打法');
      const hasFallback = result.markdown.includes('策略 Agent') ||
                         result.markdown.includes('未连接') ||
                         result.markdown.includes('不可用') ||
                         result.markdown.includes('跳过');
      expect(hasPlaybook || hasFallback).toBe(true);
    });

    it('应记录编排日志', async () => {
      const result = await runMorningBriefA2A(demoDataDir);

      expect(result.logs.some(log => log.includes('CEO → Fact'))).toBe(true);
    });
  });

  describe('GateService', () => {
    it('checkMorningBrief 应通过合规简报', () => {
      const validMarkdown = `
# 🌅 晨间简报

## 今日日程
- 10:00 - 11:00 会议

## 待办事项
- 🔴 高 待办1

## 本周 OKR
进度：50%

## 今日习惯
- ✅ 习惯1

## 股票行情
> 📊 占位

> ⚠️ **免责声明**：不构成投资建议

## 身心健康
> 🏃 占位

> ⚠️ **免责声明**：不提供诊疗
`;

      const result = GateService.checkMorningBrief(validMarkdown);
      expect(result.passed).toBe(true);
    });

    it('应检测缺失的免责声明', () => {
      const invalidMarkdown = `
# 🌅 晨间简报

## 今日日程
## 待办事项
## 本周 OKR
## 今日习惯

## 股票行情
> 📊 占位

## 身心健康
> 🏃 占位
`;

      const result = GateService.checkMorningBrief(invalidMarkdown);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('免责声明'))).toBe(true);
    });

    it('应检测缺失的区块', () => {
      const invalidMarkdown = `
# 🌅 晨间简报

## 今日日程
`;

      const result = GateService.checkMorningBrief(invalidMarkdown);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('缺失区块'))).toBe(true);
    });
  });
});
