import { describe, it, expect } from 'vitest';
import { recognizeIntent, getTriggerWordsTable } from '../intent.js';

describe('intent', () => {
  describe('recognizeIntent', () => {
    // 晨间触发词测试
    it('应识别"今天怎么安排"为晨间', () => {
      const result = recognizeIntent('今天怎么安排');
      expect(result.intent).toBe('morning');
      expect(result.needsClarification).toBe(false);
    });

    it('应识别"今日计划"为晨间', () => {
      const result = recognizeIntent('今日计划');
      expect(result.intent).toBe('morning');
    });

    it('应识别"晨间简报"为晨间', () => {
      const result = recognizeIntent('晨间简报');
      expect(result.intent).toBe('morning');
    });

    it('应识别"早上好"为晨间', () => {
      const result = recognizeIntent('早上好');
      expect(result.intent).toBe('morning');
    });

    // 晚间触发词测试
    it('应识别"今日复盘"为晚间', () => {
      const result = recognizeIntent('今日复盘');
      expect(result.intent).toBe('evening');
      expect(result.needsClarification).toBe(false);
    });

    it('应识别"晚间简报"为晚间', () => {
      const result = recognizeIntent('晚间简报');
      expect(result.intent).toBe('evening');
    });

    it('应识别"今天总结"为晚间', () => {
      const result = recognizeIntent('今天总结');
      expect(result.intent).toBe('evening');
    });

    it('应识别"复盘"为晚间', () => {
      const result = recognizeIntent('复盘');
      expect(result.intent).toBe('evening');
    });

    // 置信度测试
    it('应返回匹配的触发词', () => {
      const result = recognizeIntent('今天怎么安排');
      expect(result.matchedTriggers.length).toBeGreaterThan(0);
    });

    it('多触发词应提高置信度', () => {
      const single = recognizeIntent('安排');
      const multiple = recognizeIntent('今天怎么安排今日计划');
      expect(multiple.confidence).toBeGreaterThanOrEqual(single.confidence);
    });

    // 模糊测试
    it('无匹配时应需要澄清', () => {
      const result = recognizeIntent('你好');
      expect(result.needsClarification).toBe(true);
      expect(result.clarificationQuestion).toBeDefined();
    });
  });

  describe('getTriggerWordsTable', () => {
    it('应返回晨间和晚间触发词表', () => {
      const table = getTriggerWordsTable();
      expect(table.morning).toBeDefined();
      expect(table.evening).toBeDefined();
      expect(Array.isArray(table.morning)).toBe(true);
      expect(Array.isArray(table.evening)).toBe(true);
    });

    it('触发词表应包含预期关键词', () => {
      const table = getTriggerWordsTable();
      expect(table.morning).toContain('晨间');
      expect(table.evening).toContain('晚间');
    });
  });
});
