import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { loadBriefData, hasAnyData, validateBriefData, getDataDir } from '../data-loader';

describe('data-loader', () => {
  const demoDataDir = path.join(process.cwd(), 'examples', 'demo-data');
  const emptyDir = path.join(process.cwd(), 'examples', 'demo-data', 'empty');

  describe('loadBriefData', () => {
    it('应加载 demo 数据并标记 hasData=true', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.calendar.hasData).toBe(true);
      expect(data.todos.hasData).toBe(true);
      expect(data.okr.hasData).toBe(true);
      expect(data.habits.hasData).toBe(true);
    });

    it('应正确解析日程事件', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.calendar.data?.events).toBeDefined();
      expect(data.calendar.data?.events.length).toBeGreaterThanOrEqual(2);
    });

    it('应正确解析待办事项', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.todos.data?.todos).toBeDefined();
      expect(data.todos.data?.todos.some((t: any) => t.done === true)).toBe(true);
      expect(data.todos.data?.todos.some((t: any) => t.done === false)).toBe(true);
    });

    it('应正确解析 OKR', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.okr.data?.week_id).toBeDefined();
      expect(data.okr.data?.objectives).toBeDefined();
      expect(data.okr.data?.objectives.length).toBeGreaterThan(0);
    });

    it('应正确解析习惯', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.habits.data?.habits).toBeDefined();
      expect(data.habits.data?.habits.some((h: any) => h.today_done === true)).toBe(true);
      expect(data.habits.data?.habits.some((h: any) => h.today_done === false)).toBe(true);
    });

    it('应正确加载 day_focus', () => {
      const data = loadBriefData(demoDataDir);

      expect(data.dayFocus.hasData).toBe(true);
      expect(data.dayFocus.data?.content).toBeDefined();
    });
  });

  describe('空目录加载', () => {
    it('空目录应不崩溃，标记 hasData=false', () => {
      const data = loadBriefData(emptyDir);

      expect(data.calendar.hasData).toBe(false);
      expect(data.todos.hasData).toBe(false);
      expect(data.okr.hasData).toBe(false);
      expect(data.habits.hasData).toBe(false);
      expect(data.dayFocus.hasData).toBe(false);
    });

    it('空目录应可安全调用 hasAnyData', () => {
      const data = loadBriefData(emptyDir);
      expect(hasAnyData(data)).toBe(false);
    });
  });

  describe('hasAnyData', () => {
    it('demo 数据应返回 true', () => {
      const data = loadBriefData(demoDataDir);
      expect(hasAnyData(data)).toBe(true);
    });

    it('空目录应返回 false', () => {
      const data = loadBriefData(emptyDir);
      expect(hasAnyData(data)).toBe(false);
    });
  });

  describe('validateBriefData', () => {
    it('demo 数据应验证通过', () => {
      const data = loadBriefData(demoDataDir);
      const result = validateBriefData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空目录应验证通过（无错误）', () => {
      const data = loadBriefData(emptyDir);
      const result = validateBriefData(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('getDataDir', () => {
    it('默认应返回包含 examples/demo-data 的路径', () => {
      const dir = getDataDir();
      expect(dir).toContain('examples');
      expect(dir).toContain('demo-data');
    });
  });
});
