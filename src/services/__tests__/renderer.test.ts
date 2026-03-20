import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadBriefData } from '../data-loader.js';
import { renderMorningBrief } from '../renderer.js';

describe('renderer', () => {
  const demoDataDir = path.join(process.cwd(), 'examples', 'demo-data');

  describe('renderMorningBrief', () => {
    it('应输出包含 6 个区块的晨间简报', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 检查 6 个主要区块
      expect(output).toContain('## 今日日程');
      expect(output).toContain('## 待办事项');
      expect(output).toContain('## 本周 OKR');
      expect(output).toContain('## 今日习惯');
      expect(output).toContain('## 股票行情');
      expect(output).toContain('## 身心健康');
    });

    it('应包含正确的标题', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('# 🌅 晨间简报');
    });

    it('应包含股票免责声明', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('不构成投资建议');
    });

    it('应包含健康免责声明', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('不提供诊疗');
    });

    it('应显示日程时间', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // 日程应显示时间格式
      expect(output).toContain('10:00');
    });

    it('应检测并标记日程冲突', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      // demo 数据中有时间重叠的事件
      expect(output).toContain('时间冲突');
    });

    it('应显示待办优先级', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('🔴 高');
    });

    it('应显示 OKR 进度', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('进度：');
      expect(output).toContain('2026-W12');
    });

    it('应显示习惯完成状态', () => {
      const data = loadBriefData(demoDataDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('✅ 已完成');
      expect(output).toContain('⬜ 待完成');
    });

    it('空数据目录不应崩溃', () => {
      const emptyDir = path.join(demoDataDir, 'empty');
      const data = loadBriefData(emptyDir);
      const output = renderMorningBrief(data);

      expect(output).toContain('（demo 模式）');
      expect(output).toContain('## 今日日程');
    });
  });
});
