/**
 * Worker 执行器框架
 * 负责注册、执行任务、结果回调
 */

import { z } from 'zod';
import { generateTaskId } from '../services/a2a-envelope.js';

// 类型定义
export interface Worker {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  execute(task: Task): Promise<TaskResult>;
  getCapabilities(): string[];
  healthCheck?(): Promise<boolean>;
}

export interface Task {
  id: string;
  type: string;
  input: unknown;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: unknown;
  error?: string;
  logs: string[];
  duration?: number;
}

export interface WorkerRegistration {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  endpoint?: string;
  registeredAt: Date;
}

export interface CallWorkerPayload {
  workerId: string;
  task: Task;
  timeout?: number;
}

// Worker 状态
export type WorkerStatus = 'idle' | 'busy' | 'error' | 'offline';

/**
 * Worker 信息
 */
export interface WorkerInfo {
  id: string;
  name: string;
  status: WorkerStatus;
  lastSeen: Date;
  capabilities: string[];
}

/**
 * Worker 注册表
 */
export class WorkerRegistry {
  private workers: Map<string, Worker> = new Map();
  private registrations: Map<string, WorkerRegistration> = new Map();

  /**
   * 注册 Worker
   */
  register(worker: Worker): void {
    if (this.workers.has(worker.id)) {
      console.warn(`[WorkerRegistry] Worker ${worker.id} already registered, replacing`);
    }
    this.workers.set(worker.id, worker);
    this.registrations.set(worker.id, {
      id: worker.id,
      name: worker.name,
      version: worker.version,
      capabilities: worker.getCapabilities(),
      registeredAt: new Date()
    });
    console.log(`[WorkerRegistry] Registered worker: ${worker.id} (${worker.name})`);
  }

  /**
   * 注销 Worker
   */
  unregister(workerId: string): boolean {
    const deleted = this.workers.delete(workerId);
    this.registrations.delete(workerId);
    if (deleted) {
      console.log(`[WorkerRegistry] Unregistered worker: ${workerId}`);
    }
    return deleted;
  }

  /**
   * 获取 Worker
   */
  get(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }

  /**
   * 列出所有 Worker
   */
  list(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * 按能力查找 Worker
   */
  findByCapability(capability: string): Worker[] {
    return this.list().filter(w => w.getCapabilities().includes(capability));
  }

  /**
   * 获取注册信息
   */
  getRegistration(workerId: string): WorkerRegistration | undefined {
    return this.registrations.get(workerId);
  }

  /**
   * 列出所有注册信息
   */
  listRegistrations(): WorkerRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Worker 健康检查
   */
  async healthCheck(workerId: string): Promise<boolean> {
    const worker = this.workers.get(workerId);
    if (!worker) return false;
    if (!worker.healthCheck) return true;

    try {
      return await worker.healthCheck();
    } catch {
      return false;
    }
  }

  /**
   * 批量健康检查
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [id, worker] of this.workers) {
      if (worker.healthCheck) {
        try {
          results.set(id, await worker.healthCheck());
        } catch {
          results.set(id, false);
        }
      } else {
        results.set(id, true);
      }
    }
    return results;
  }
}

/**
 * Worker 调用器
 * 负责调用 Worker 执行任务
 */
export class WorkerCaller {
  private registry: WorkerRegistry;
  private defaultTimeout: number = 30000; // 30s

  constructor(registry: WorkerRegistry) {
    this.registry = registry;
  }

  /**
   * 调用 Worker 执行任务
   */
  async call(payload: CallWorkerPayload): Promise<TaskResult> {
    const { workerId, task, timeout = this.defaultTimeout } = payload;

    const worker = this.registry.get(workerId);
    if (!worker) {
      return {
        taskId: task.id,
        success: false,
        output: null,
        error: `Worker ${workerId} not found`,
        logs: []
      };
    }

    const startTime = Date.now();
    const logs: string[] = [];
    logs.push(`[${task.id}] Calling worker ${workerId}`);

    try {
      // 使用 Promise.race 实现超时
      const result = await Promise.race([
        worker.execute(task),
        new Promise<TaskResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout)
        )
      ]) as TaskResult;

      result.duration = Date.now() - startTime;
      result.taskId = task.id;
      logs.push(`[${task.id}] Worker completed successfully`);

      return { ...result, logs };
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`[${task.id}] Worker error: ${error instanceof Error ? error.message : 'Unknown'}`);

      return {
        taskId: task.id,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown',
        logs,
        duration
      };
    }
  }

  /**
   * 调用第一个匹配能力的 Worker
   */
  async callByCapability(capability: string, task: Task, timeout?: number): Promise<TaskResult> {
    const workers = this.registry.findByCapability(capability);
    if (workers.length === 0) {
      return {
        taskId: task.id,
        success: false,
        output: null,
        error: `No worker found with capability: ${capability}`,
        logs: []
      };
    }

    // 使用第一个匹配的 Worker
    return this.call({ workerId: workers[0].id, task, timeout });
  }

  /**
   * 设置默认超时
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

/**
 * 任务执行器
 * 负责执行任务并返回结果
 */
export class TaskExecutor {
  private registry: WorkerRegistry;
  private caller: WorkerCaller;

  constructor(registry: WorkerRegistry) {
    this.registry = registry;
    this.caller = new WorkerCaller(registry);
  }

  /**
   * 执行任务
   */
  async execute(taskType: string, input: unknown, workerId?: string): Promise<TaskResult> {
    const task: Task = {
      id: generateTaskId(),
      type: taskType,
      input
    };

    // 如果指定了 Worker，直接调用
    if (workerId) {
      return this.caller.call({ workerId, task });
    }

    // 否则按能力查找
    return this.caller.callByCapability(taskType, task);
  }

  /**
   * 批量执行
   */
  async executeBatch(tasks: Array<{ type: string; input: unknown; workerId?: string }>): Promise<TaskResult[]> {
    return Promise.all(
      tasks.map(t => this.execute(t.type, t.input, t.workerId))
    );
  }
}

/**
 * Worker 健康状态追踪器
 */
export class WorkerHealthTracker {
  private registry: WorkerRegistry;
  private healthStatus: Map<string, { healthy: boolean; lastCheck: Date; consecutiveFailures: number }> = new Map();
  private checkInterval: number = 60000; // 1分钟
  private maxConsecutiveFailures: number = 3;

  constructor(registry: WorkerRegistry) {
    this.registry = registry;
  }

  /**
   * 启动健康检查循环
   */
  start(): NodeJS.Timeout {
    return setInterval(() => {
      this.checkAll();
    }, this.checkInterval);
  }

  /**
   * 检查所有 Worker
   */
  async checkAll(): Promise<void> {
    const results = await this.registry.healthCheckAll();

    for (const [workerId, healthy] of results) {
      const current = this.healthStatus.get(workerId) || {
        healthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0
      };

      if (healthy) {
        current.consecutiveFailures = 0;
        current.healthy = true;
      } else {
        current.consecutiveFailures++;
        if (current.consecutiveFailures >= this.maxConsecutiveFailures) {
          current.healthy = false;
          console.warn(`[WorkerHealthTracker] Worker ${workerId} marked as unhealthy after ${current.consecutiveFailures} failures`);
        }
      }

      current.lastCheck = new Date();
      this.healthStatus.set(workerId, current);
    }
  }

  /**
   * 获取 Worker 健康状态
   */
  getStatus(workerId: string): { healthy: boolean; lastCheck: Date; consecutiveFailures: number } | undefined {
    return this.healthStatus.get(workerId);
  }

  /**
   * 获取所有不健康的 Worker
   */
  getUnhealthyWorkers(): string[] {
    const unhealthy: string[] = [];
    for (const [id, status] of this.healthStatus) {
      if (!status.healthy) {
        unhealthy.push(id);
      }
    }
    return unhealthy;
  }
}

export type { Worker, Task, TaskResult, WorkerRegistration, CallWorkerPayload, WorkerStatus, WorkerInfo };
