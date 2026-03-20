import { describe, it, expect, beforeEach } from 'vitest';
import { CeoRuntime, PluginRegistry, InMemoryTaskStore, getConfig, type CeoPlugin, type CeoEvent, type Task, type CeoContext } from '../runtime.js';

describe('ceo/runtime', () => {
  let runtime: CeoRuntime;
  let registry: PluginRegistry;

  // 创建一个测试插件
  const mockPlugin: CeoPlugin = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    priority: 1,
    match(event: CeoEvent): boolean {
      return event.text.includes('test');
    },
    async execute(task: Task, context: CeoContext): Promise<{ nextState?: string; sideEffects: any[]; output?: unknown }> {
      return {
        nextState: 'completed',
        sideEffects: [],
        output: { message: 'Test plugin executed', taskId: task.id }
      };
    }
  };

  beforeEach(() => {
    registry = new PluginRegistry();
    runtime = new CeoRuntime(registry, new InMemoryTaskStore(), getConfig());
  });

  describe('PluginRegistry', () => {
    it('应可以注册插件', () => {
      registry.register(mockPlugin);
      const plugins = registry.list();
      expect(plugins.length).toBe(1);
      expect(plugins[0].id).toBe('test-plugin');
    });

    it('应可以注销插件', () => {
      registry.register(mockPlugin);
      const success = registry.unregister('test-plugin');
      expect(success).toBe(true);
      expect(registry.list().length).toBe(0);
    });

    it('应按优先级排序', () => {
      const lowPriority: CeoPlugin = { ...mockPlugin, id: 'low', priority: 10 };
      const highPriority: CeoPlugin = { ...mockPlugin, id: 'high', priority: 1 };

      registry.register(lowPriority);
      registry.register(highPriority);

      const plugins = registry.list();
      expect(plugins[0].id).toBe('high');
      expect(plugins[1].id).toBe('low');
    });

    it('应能找到匹配的事件', () => {
      registry.register(mockPlugin);

      const matchingEvent: CeoEvent = {
        type: 'user_message',
        sender: 'ceo',
        text: 'this is a test',
        envelope: null,
        raw: null
      };

      const plugin = registry.findPlugin(matchingEvent);
      expect(plugin?.id).toBe('test-plugin');
    });

    it('应返回null当没有匹配', () => {
      registry.register(mockPlugin);

      const nonMatchingEvent: CeoEvent = {
        type: 'user_message',
        sender: 'ceo',
        text: 'hello world',
        envelope: null,
        raw: null
      };

      const plugin = registry.findPlugin(nonMatchingEvent);
      expect(plugin).toBeNull();
    });
  });

  describe('CeoRuntime', () => {
    it('应可以分发任务', async () => {
      registry.register(mockPlugin);

      const result = await runtime.dispatch('test', 'test input');

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.output).toEqual({ message: 'Test plugin executed', taskId: result.taskId });
    });

    it('应返回失败当没有插件匹配', async () => {
      const result = await runtime.dispatch('unknown', 'some input');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No plugin found');
    });

    it('应可以获取配置', () => {
      const config = runtime.getConfig();
      expect(config).toBeDefined();
      expect(config.CHANNEL_ID_OPS).toBeDefined();
      expect(config.PORT).toBeGreaterThan(0);
    });

    it('应可以获取插件注册表', () => {
      registry.register(mockPlugin);
      const reg = runtime.getRegistry();
      expect(reg.list().length).toBe(1);
    });
  });

  describe('InMemoryTaskStore', () => {
    it('应可以保存和获取任务', async () => {
      const store = new InMemoryTaskStore();

      const task: Task = {
        id: 'task-1',
        type: 'test',
        state: 'created',
        input: { data: 'test' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await store.save(task);
      const retrieved = await store.get('task-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('task-1');
      expect(retrieved?.type).toBe('test');
    });

    it('应可以更新任务', async () => {
      const store = new InMemoryTaskStore();

      const task: Task = {
        id: 'task-1',
        type: 'test',
        state: 'created',
        input: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await store.save(task);
      await store.update('task-1', { state: 'completed' });

      const updated = await store.get('task-1');
      expect(updated?.state).toBe('completed');
    });

    it('应可以删除任务', async () => {
      const store = new InMemoryTaskStore();

      const task: Task = {
        id: 'task-1',
        type: 'test',
        state: 'created',
        input: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await store.save(task);
      await store.delete('task-1');

      const retrieved = await store.get('task-1');
      expect(retrieved).toBeNull();
    });

    it('应可以列出所有任务', async () => {
      const store = new InMemoryTaskStore();

      await store.save({ id: 'task-1', type: 'test', state: 'created', input: {}, createdAt: new Date(), updatedAt: new Date() });
      await store.save({ id: 'task-2', type: 'test', state: 'created', input: {}, createdAt: new Date(), updatedAt: new Date() });

      const tasks = await store.list();
      expect(tasks.length).toBe(2);
    });
  });

  describe('getConfig', () => {
    it('应返回配置对象', () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(typeof config.PORT).toBe('number');
      expect(typeof config.CHANNEL_ID_OPS).toBe('string');
    });
  });
});
