/**
 * CEO 服务运行时
 * 核心：插件注册表 + 任务分发 + 状态持久化
 */

import { z } from 'zod';
import http from 'http';
import { generateTaskId, type A2AEnvelope, type AgentId } from '../services/a2a-envelope.js';

// 类型定义
export interface CeoPlugin {
  id: string;
  name: string;
  version: string;
  priority: number;
  match(event: CeoEvent): boolean;
  execute(task: Task, context: CeoContext): Promise<PluginResult>;
}

export interface CeoEvent {
  type: 'user_message' | 'worker_result' | 'qa_result' | 'system';
  sender: AgentId;
  text: string;
  envelope: A2AEnvelope | null;
  raw: unknown;
}

export interface Task {
  id: string;
  type: string;
  pluginId?: string;
  state: string;
  input: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: unknown;
  logs: string[];
  errors: string[];
}

export interface CeoContext {
  taskId: string;
  roster: RosterSnapshot;
  channelIds: ChannelIds;
  now: Date;
}

export interface RosterSnapshot {
  agents: AgentInfo[];
  pending: string[];
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface ChannelIds {
  ops: string;
  hr: string;
  ceoDm: string;
  pending: string;
}

export interface PluginResult {
  nextState?: string;
  sideEffects: SideEffect[];
  output?: unknown;
}

export type SideEffect =
  | { type: 'post_message'; channel: string; text: string; threadId?: string }
  | { type: 'call_worker'; worker: string; payload: unknown }
  | { type: 'run_gate'; gateId: string; input: unknown }
  | { type: 'delegate_to_plugin'; pluginId: string; input: unknown };

// 配置 Schema
const ConfigSchema = z.object({
  CHANNEL_ID_OPS: z.string().default('#raganor-ops'),
  CHANNEL_ID_HR: z.string().default('#raganor-hr'),
  CHANNEL_ID_CEO_DM: z.string().default('ceo-dm'),
  CHANNEL_ID_PENDING: z.string().default('#raganor-pending'),
  PORT: z.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * CEO 配置
 */
export function getConfig(): Config {
  return {
    CHANNEL_ID_OPS: process.env.CHANNEL_ID_OPS || '#raganor-ops',
    CHANNEL_ID_HR: process.env.CHANNEL_ID_HR || '#raganor-hr',
    CHANNEL_ID_CEO_DM: process.env.CHANNEL_ID_CEO_DM || 'ceo-dm',
    CHANNEL_ID_PENDING: process.env.CHANNEL_ID_PENDING || '#raganor-pending',
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production') || 'development',
  };
}

/**
 * 插件注册表
 */
export class PluginRegistry {
  private plugins: CeoPlugin[] = [];

  register(plugin: CeoPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => a.priority - b.priority);
    console.log(`[PluginRegistry] Registered plugin: ${plugin.id} (${plugin.name})`);
  }

  unregister(pluginId: string): boolean {
    const index = this.plugins.findIndex(p => p.id === pluginId);
    if (index >= 0) {
      this.plugins.splice(index, 1);
      console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
      return true;
    }
    return false;
  }

  findPlugin(event: CeoEvent): CeoPlugin | null {
    for (const plugin of this.plugins) {
      if (plugin.match(event)) {
        return plugin;
      }
    }
    return null;
  }

  list(): CeoPlugin[] {
    return [...this.plugins];
  }
}

/**
 * 任务存储接口
 */
export interface TaskStore {
  save(task: Task): Promise<void>;
  get(id: string): Promise<Task | null>;
  update(id: string, updates: Partial<Task>): Promise<void>;
  list(): Promise<Task[]>;
  delete(id: string): Promise<void>;
}

/**
 * 内存任务存储
 */
export class InMemoryTaskStore implements TaskStore {
  private tasks: Map<string, Task> = new Map();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task });
  }

  async get(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async update(id: string, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      const updated = { ...task, ...updates, updatedAt: new Date() };
      this.tasks.set(id, updated);
    }
  }

  async list(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }
}

/**
 * CEO 运行时
 */
export class CeoRuntime {
  private registry: PluginRegistry;
  private taskStore: TaskStore;
  private config: Config;
  private roster: RosterSnapshot = { agents: [], pending: [] };
  private server: http.Server | null = null;

  constructor(
    registry: PluginRegistry = new PluginRegistry(),
    taskStore: TaskStore = new InMemoryTaskStore(),
    config: Config = getConfig()
  ) {
    this.registry = registry;
    this.taskStore = taskStore;
    this.config = config;
  }

  /**
   * 分发任务
   */
  async dispatch(taskType: string, input: unknown, pluginId?: string): Promise<TaskResult> {
    const taskId = generateTaskId();
    const logs: string[] = [];
    const errors: string[] = [];

    logs.push(`[${taskId}] Dispatching task: ${taskType}`);

    const task: Task = {
      id: taskId,
      type: taskType,
      pluginId,
      state: 'created',
      input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.taskStore.save(task);
    logs.push(`[${taskId}] Task saved`);

    const context: CeoContext = {
      taskId,
      roster: this.roster,
      channelIds: {
        ops: this.config.CHANNEL_ID_OPS,
        hr: this.config.CHANNEL_ID_HR,
        ceoDm: this.config.CHANNEL_ID_CEO_DM,
        pending: this.config.CHANNEL_ID_PENDING,
      },
      now: new Date(),
    };

    const event: CeoEvent = {
      type: 'user_message',
      sender: 'ceo',
      text: typeof input === 'string' ? input : JSON.stringify(input),
      envelope: null,
      raw: input,
    };

    let plugin: CeoPlugin | null = null;
    if (pluginId) {
      plugin = this.registry.list().find(p => p.id === pluginId) || null;
    } else {
      plugin = this.registry.findPlugin(event);
    }

    if (!plugin) {
      errors.push(`[${taskId}] No plugin found for task type: ${taskType}`);
      return { taskId, success: false, output: null, logs, errors };
    }

    logs.push(`[${taskId}] Using plugin: ${plugin.id}`);

    try {
      const result = await plugin.execute(task, context);
      logs.push(`[${taskId}] Plugin executed successfully`);

      await this.taskStore.update(taskId, {
        state: result.nextState || 'completed',
      });

      for (const effect of result.sideEffects) {
        await this.executeSideEffect(effect);
      }

      return {
        taskId,
        success: true,
        output: result.output,
        logs,
        errors,
      };
    } catch (error) {
      errors.push(`[${taskId}] Plugin execution failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { taskId, success: false, output: null, logs, errors };
    }
  }

  /**
   * 处理 Webhook
   */
  async handleWebhook(envelope: A2AEnvelope): Promise<TaskResult> {
    const logs: string[] = [];
    const errors: string[] = [];

    logs.push(`[${envelope.task_id}] Handling webhook from ${envelope.from}`);

    const intent = envelope.intent;
    logs.push(`[${envelope.task_id}] Intent: ${intent}`);

    const event: CeoEvent = {
      type: 'user_message',
      sender: envelope.from,
      text: JSON.stringify(envelope.payload),
      envelope,
      raw: envelope.payload,
    };

    const plugin = this.registry.findPlugin(event);
    if (!plugin) {
      errors.push(`[${envelope.task_id}] No plugin found for intent: ${intent}`);
      return { taskId: envelope.task_id, success: false, output: null, logs, errors };
    }

    let task = await this.taskStore.get(envelope.task_id);
    if (!task) {
      task = {
        id: envelope.task_id,
        type: intent,
        pluginId: plugin.id,
        state: 'created',
        input: envelope.payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.taskStore.save(task);
    }

    logs.push(`[${envelope.task_id}] Plugin: ${plugin.id}`);

    const context: CeoContext = {
      taskId: envelope.task_id,
      roster: this.roster,
      channelIds: {
        ops: this.config.CHANNEL_ID_OPS,
        hr: this.config.CHANNEL_ID_HR,
        ceoDm: this.config.CHANNEL_ID_CEO_DM,
        pending: this.config.CHANNEL_ID_PENDING,
      },
      now: new Date(),
    };

    try {
      const result = await plugin.execute(task, context);

      await this.taskStore.update(envelope.task_id, {
        state: result.nextState || 'completed',
      });

      for (const effect of result.sideEffects) {
        await this.executeSideEffect(effect);
      }

      return {
        taskId: envelope.task_id,
        success: true,
        output: result.output,
        logs,
        errors,
      };
    } catch (error) {
      errors.push(`[${envelope.task_id}] Execution failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { taskId: envelope.task_id, success: false, output: null, logs, errors };
    }
  }

  /**
   * 执行副作用
   */
  private async executeSideEffect(effect: SideEffect): Promise<void> {
    switch (effect.type) {
      case 'post_message':
        console.log(`[SideEffect] Post to ${effect.channel}: ${effect.text}`);
        break;
      case 'call_worker':
        console.log(`[SideEffect] Call worker ${effect.worker}:`, effect.payload);
        break;
      case 'run_gate':
        console.log(`[SideEffect] Run gate ${effect.gateId}:`, effect.input);
        break;
      case 'delegate_to_plugin':
        console.log(`[SideEffect] Delegate to plugin ${effect.pluginId}`);
        break;
    }
  }

  /**
   * HTTP 请求处理
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString();

    const url = new URL(req.url || '/', `http://localhost:${this.config.PORT}`);
    const method = req.method || 'GET';

    // CORS 预检
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    let response: { status: number; body: unknown };

    try {
      if (url.pathname === '/health') {
        response = { status: 200, body: { status: 'ok', timestamp: new Date().toISOString() } };
      } else if (url.pathname === '/plugins') {
        response = { status: 200, body: this.registry.list().map(p => ({ id: p.id, name: p.name, version: p.version })) };
      } else if (url.pathname === '/tasks') {
        if (method === 'GET') {
          const tasks = await this.taskStore.list();
          response = { status: 200, body: tasks };
        } else {
          const input = body ? JSON.parse(body) : {};
          const result = await this.dispatch(input.type || 'unknown', input.input);
          response = { status: 200, body: result };
        }
      } else if (url.pathname === '/webhook' && method === 'POST') {
        const envelope = JSON.parse(body) as A2AEnvelope;
        const result = await this.handleWebhook(envelope);
        response = { status: 200, body: result };
      } else if (url.pathname === '/roster') {
        response = { status: 200, body: this.roster };
      } else {
        response = { status: 404, body: { error: 'Not found' } };
      }
    } catch (error) {
      response = { status: 500, body: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }

    res.writeHead(response.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(response.body));
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    const { PORT } = this.config;
    console.log(`[CeoRuntime] Starting on port ${PORT}...`);
    console.log(`[CeoRuntime] Registered plugins: ${this.registry.list().map(p => p.id).join(', ')}`);

    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.listen(PORT, () => {
        console.log(`[CeoRuntime] Started on port ${PORT}`);
        resolve();
      });
    });
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[CeoRuntime] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Getters
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  getConfig(): Config {
    return this.config;
  }
}

