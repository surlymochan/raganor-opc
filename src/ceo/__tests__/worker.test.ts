import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkerRegistry,
  WorkerCaller,
  TaskExecutor,
  WorkerHealthTracker,
  type Worker,
  type Task,
  type TaskResult
} from '../worker.js';

describe('ceo/worker', () => {
  // Mock Worker implementation
  const createMockWorker = (overrides: Partial<Worker> = {}): Worker => ({
    id: 'test-worker',
    name: 'Test Worker',
    version: '1.0.0',
    capabilities: ['test-capability'],
    execute: async (task: Task): Promise<TaskResult> => ({
      taskId: task.id,
      success: true,
      output: { processed: true, input: task.input },
      logs: [`Worker ${overrides.id || 'test-worker'} executed task ${task.id}`],
      duration: 100
    }),
    getCapabilities(): string[] {
      return this.capabilities;
    },
    ...overrides
  });

  describe('WorkerRegistry', () => {
    let registry: WorkerRegistry;

    beforeEach(() => {
      registry = new WorkerRegistry();
    });

    it('should register a worker', () => {
      const worker = createMockWorker();
      registry.register(worker);

      const workers = registry.list();
      expect(workers.length).toBe(1);
      expect(workers[0].id).toBe('test-worker');
    });

    it('should unregister a worker', () => {
      const worker = createMockWorker();
      registry.register(worker);

      const success = registry.unregister('test-worker');
      expect(success).toBe(true);
      expect(registry.list().length).toBe(0);
    });

    it('should return false when unregistering non-existent worker', () => {
      const success = registry.unregister('non-existent');
      expect(success).toBe(false);
    });

    it('should get a worker by id', () => {
      const worker = createMockWorker();
      registry.register(worker);

      const retrieved = registry.get('test-worker');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-worker');
    });

    it('should return undefined for non-existent worker', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should find workers by capability', () => {
      const worker1 = createMockWorker({ id: 'worker1', capabilities: ['cap-a'] });
      const worker2 = createMockWorker({ id: 'worker2', capabilities: ['cap-b'] });
      const worker3 = createMockWorker({ id: 'worker3', capabilities: ['cap-a', 'cap-b'] });

      registry.register(worker1);
      registry.register(worker2);
      registry.register(worker3);

      const found = registry.findByCapability('cap-a');
      expect(found.length).toBe(2);
      expect(found.map(w => w.id)).toContain('worker1');
      expect(found.map(w => w.id)).toContain('worker3');
    });

    it('should return empty array when no workers match capability', () => {
      const worker = createMockWorker({ capabilities: ['cap-a'] });
      registry.register(worker);

      const found = registry.findByCapability('cap-b');
      expect(found.length).toBe(0);
    });

    it('should get worker registration info', () => {
      const worker = createMockWorker();
      registry.register(worker);

      const reg = registry.getRegistration('test-worker');
      expect(reg).toBeDefined();
      expect(reg?.id).toBe('test-worker');
      expect(reg?.name).toBe('Test Worker');
      expect(reg?.capabilities).toEqual(['test-capability']);
    });

    it('should list all registrations', () => {
      const worker1 = createMockWorker({ id: 'worker1' });
      const worker2 = createMockWorker({ id: 'worker2' });

      registry.register(worker1);
      registry.register(worker2);

      const regs = registry.listRegistrations();
      expect(regs.length).toBe(2);
    });

    it('should warn when re-registering same worker id', () => {
      const worker1 = createMockWorker({ id: 'test-worker', name: 'Worker 1' });
      const worker2 = createMockWorker({ id: 'test-worker', name: 'Worker 2' });

      registry.register(worker1);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.register(worker2);

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();

      // Should replace the worker
      const workers = registry.list();
      expect(workers.length).toBe(1);
    });
  });

  describe('WorkerCaller', () => {
    let registry: WorkerRegistry;
    let caller: WorkerCaller;

    beforeEach(() => {
      registry = new WorkerRegistry();
      caller = new WorkerCaller(registry);
    });

    it('should call a registered worker', async () => {
      const worker = createMockWorker();
      registry.register(worker);

      const task: Task = {
        id: 'task-1',
        type: 'test-capability',
        input: { data: 'test' }
      };

      const result = await caller.call({ workerId: 'test-worker', task });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-1');
      expect(result.output).toEqual({ processed: true, input: { data: 'test' } });
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should return error when worker not found', async () => {
      const task: Task = {
        id: 'task-1',
        type: 'test',
        input: {}
      };

      const result = await caller.call({ workerId: 'non-existent', task });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle worker execution error', async () => {
      const workerWithError: Worker = {
        ...createMockWorker(),
        execute: async () => {
          throw new Error('Execution failed');
        }
      };
      registry.register(workerWithError);

      const task: Task = {
        id: 'task-1',
        type: 'test',
        input: {}
      };

      const result = await caller.call({ workerId: 'test-worker', task });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution failed');
    });

    it('should call worker with timeout', async () => {
      const slowWorker: Worker = {
        ...createMockWorker(),
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return {
            taskId: 'task-1',
            success: true,
            output: null,
            logs: []
          };
        }
      };
      registry.register(slowWorker);

      const task: Task = {
        id: 'task-1',
        type: 'test',
        input: {}
      };

      const result = await caller.call({ workerId: 'test-worker', task, timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should call by capability', async () => {
      const worker = createMockWorker({ capabilities: ['my-capability'] });
      registry.register(worker);

      const task: Task = {
        id: 'task-1',
        type: 'my-capability',
        input: {}
      };

      const result = await caller.callByCapability('my-capability', task);

      expect(result.success).toBe(true);
    });

    it('should return error when no worker has capability', async () => {
      const worker = createMockWorker({ capabilities: ['cap-a'] });
      registry.register(worker);

      const task: Task = {
        id: 'task-1',
        type: 'cap-b',
        input: {}
      };

      const result = await caller.callByCapability('cap-b', task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No worker found with capability');
    });
  });

  describe('TaskExecutor', () => {
    let registry: WorkerRegistry;
    let executor: TaskExecutor;

    beforeEach(() => {
      registry = new WorkerRegistry();
      executor = new TaskExecutor(registry);
    });

    it('should execute task with specified worker', async () => {
      const worker = createMockWorker();
      registry.register(worker);

      const result = await executor.execute('test-capability', { data: 'test' }, 'test-worker');

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
    });

    it('should execute task by capability when no worker specified', async () => {
      const worker = createMockWorker({ capabilities: ['cap-x'] });
      registry.register(worker);

      const result = await executor.execute('cap-x', { data: 'test' });

      expect(result.success).toBe(true);
    });

    it('should execute batch tasks', async () => {
      const worker = createMockWorker();
      registry.register(worker);

      const tasks = [
        { type: 'test-capability', input: { data: '1' }, workerId: 'test-worker' },
        { type: 'test-capability', input: { data: '2' }, workerId: 'test-worker' }
      ];

      const results = await executor.executeBatch(tasks);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('WorkerHealthTracker', () => {
    let registry: WorkerRegistry;
    let tracker: WorkerHealthTracker;

    beforeEach(() => {
      registry = new WorkerRegistry();
      tracker = new WorkerHealthTracker(registry);
    });

    it('should get initial healthy status after checkAll', async () => {
      const healthyWorker: Worker = {
        ...createMockWorker(),
        healthCheck: async () => true
      };
      registry.register(healthyWorker);

      await tracker.checkAll();

      const status = tracker.getStatus('test-worker');
      expect(status).toBeDefined();
      expect(status?.healthy).toBe(true);
      expect(status?.consecutiveFailures).toBe(0);
    });

    it('should track consecutive failures', async () => {
      const unhealthyWorker: Worker = {
        ...createMockWorker(),
        healthCheck: async () => false
      };
      registry.register(unhealthyWorker);

      // Run 3 checks (maxConsecutiveFailures default is 3)
      await tracker.checkAll();
      await tracker.checkAll();
      await tracker.checkAll();

      const status = tracker.getStatus('test-worker');
      expect(status?.healthy).toBe(false);
    });

    it('should reset failures on successful check', async () => {
      const flakyWorker: Worker = {
        ...createMockWorker(),
        healthCheck: async () => true
      };
      registry.register(flakyWorker);

      await tracker.checkAll();
      await tracker.checkAll();

      // Update to fail
      (flakyWorker as any).healthCheck = async () => false;

      await tracker.checkAll();

      // Now make it healthy again
      (flakyWorker as any).healthCheck = async () => true;
      await tracker.checkAll();

      const status = tracker.getStatus('test-worker');
      expect(status?.healthy).toBe(true);
      expect(status?.consecutiveFailures).toBe(0);
    });

    it('should get all unhealthy workers', async () => {
      const healthyWorker: Worker = {
        ...createMockWorker({ id: 'healthy' }),
        healthCheck: async () => true
      };
      const unhealthyWorker: Worker = {
        ...createMockWorker({ id: 'unhealthy' }),
        healthCheck: async () => false
      };

      registry.register(healthyWorker);
      registry.register(unhealthyWorker);

      // Mark unhealthy after 3 failures
      await tracker.checkAll();
      await tracker.checkAll();
      await tracker.checkAll();

      const unhealthy = tracker.getUnhealthyWorkers();
      expect(unhealthy).toContain('unhealthy');
      expect(unhealthy).not.toContain('healthy');
    });

    it('should not mark worker unhealthy before max failures', async () => {
      const unhealthyWorker: Worker = {
        ...createMockWorker(),
        healthCheck: async () => false
      };
      registry.register(unhealthyWorker);

      await tracker.checkAll();
      await tracker.checkAll();

      const status = tracker.getStatus('test-worker');
      expect(status?.healthy).toBe(true); // Not marked unhealthy yet
    });

    it('should handle worker without healthCheck', async () => {
      const worker = createMockWorker(); // No healthCheck defined
      registry.register(worker);

      await tracker.checkAll();

      const status = tracker.getStatus('test-worker');
      expect(status?.healthy).toBe(true); // Assumed healthy if no healthCheck
    });

    it('should get undefined status for non-existent worker', () => {
      const status = tracker.getStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });
});