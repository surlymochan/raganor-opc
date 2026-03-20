/**
 * Community Chat Client
 * 负责：Socket.IO 连接、四频道收发、消息信封解析与封装
 */

import { io, Socket } from 'socket.io-client';
import { generateTaskId } from '../services/a2a-envelope.js';

// ============ 类型定义 ============

/**
 * Agent ID（包括所有可能的代理）
 */
export type AgentId = 'ceo' | 'fact' | 'openclaw' | 'qa';

/**
 * 消息信封
 */
export interface MessageEnvelope {
  taskId?: string;
  from: AgentId;
  to: AgentId | 'all';
  intent: Intent;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 意图枚举
 */
export type Intent =
  // 派单与回执
  | 'ASSIGN'
  | 'ACK'
  | 'RESULT'
  | 'BLOCK'
  | 'CLARIFY'
  | 'FORWARD'
  // 用户
  | 'USER_REPLY'
  | 'USER_APPROVE_HIRE'
  | 'USER_REJECT_HIRE'
  | 'USER_APPROVE_FIRE'
  | 'USER_REJECT_FIRE'
  // 花名册
  | 'ROSTER_HIRE'
  | 'ROSTER_FIRE'
  | 'ROSTER_ACK'
  | 'ROSTER_UPDATE'
  // QA
  | 'QA_ASSIGN'
  | 'QA_RESULT'
  | 'QA_BLOCK'
  // 内部
  | 'SKIP';

/**
 * 频道 ID
 */
export interface ChannelIds {
  ops: string;
  hr: string;
  pending: string;
  ceoDm: string;
}

/**
 * 消息处理器
 */
export type MessageHandler = (envelope: MessageEnvelope, raw: ChatMessage) => void;

/**
 * 原始聊天消息
 */
export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  messageType?: string;
  referencedMessageId?: string;
  isAgentMessage?: boolean;
  isMention?: boolean;
  mentionedAgentId?: string;
  mentionedAgentIds?: string[];
  createdAt: string;
}

/**
 * 客户端配置
 */
export interface ChatClientConfig {
  wsUrl: string;
  agentId: AgentId;
  username: string;
  channels: ChannelIds;
  messageHandler?: MessageHandler;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// ============ 信封解析与封装 ============

/**
 * 解析消息信封
 */
export function parseEnvelope(content: string): Partial<MessageEnvelope> | null {
  // 格式: [TASK:<task_id>][FROM:<agent_id>][TO:<agent_id|all>][INTENT:<intent>]
  const taskMatch = content.match(/\[TASK:([^\]]+)\]/);
  const fromMatch = content.match(/\[FROM:([^\]]+)\]/);
  const toMatch = content.match(/\[TO:([^\]]+)\]/);
  const intentMatch = content.match(/\[INTENT:([^\]]+)\]/);

  if (!fromMatch || !toMatch || !intentMatch) {
    return null;
  }

  return {
    taskId: taskMatch?.[1],
    from: fromMatch[1] as AgentId,
    to: toMatch[1] as AgentId | 'all',
    intent: intentMatch[1] as Intent,
  };
}

/**
 * 封装消息信封
 */
export function formatEnvelope(envelope: MessageEnvelope): string {
  const parts: string[] = [];

  if (envelope.taskId) {
    parts.push(`[TASK:${envelope.taskId}]`);
  }

  parts.push(`[FROM:${envelope.from}]`);
  parts.push(`[TO:${envelope.to}]`);
  parts.push(`[INTENT:${envelope.intent}]`);

  return parts.join('') + '\n' + envelope.content;
}

/**
 * 从聊天消息提取正文（去除信封前缀）
 */
export function extractContent(content: string): string {
  // 查找第一个换行后面的内容
  const newlineIndex = content.indexOf('\n');
  if (newlineIndex !== -1) {
    return content.substring(newlineIndex + 1).trim();
  }

  // 如果没有换行，检查是否整个字符串都是信封
  const parts = content.split(/\[(TASK|FROM|TO|INTENT):/);
  if (parts.length > 1) {
    // 整个字符串都是信封格式
    return '';
  }

  return content;
}

// ============ Chat Client ============

/**
 * Community Chat Client
 */
export class ChatClient {
  private socket: Socket | null = null;
  private config: ChatClientConfig;
  private messageHandler?: MessageHandler;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private joinedChannels: Set<string> = new Set();

  constructor(config: ChatClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.messageHandler = config.messageHandler;
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[ChatClient] Connecting to ${this.config.wsUrl} as ${this.config.agentId}...`);

      this.socket = io(this.config.wsUrl, {
        auth: {
          userId: this.config.agentId,
          username: this.config.username,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: this.config.reconnectInterval,
        reconnectionAttempts: this.config.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log(`[ChatClient] Connected as ${this.config.agentId}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // 加入个人代理房间
        this.socket?.emit('join_channel', `agent:${this.config.agentId}`);
        console.log(`[ChatClient] Joined personal room: agent:${this.config.agentId}`);

        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error(`[ChatClient] Connection error: ${error.message}`);
        this.isConnected = false;

        if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
          reject(new Error(`Failed to connect after ${this.reconnectAttempts} attempts`));
        }
        this.reconnectAttempts++;
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`[ChatClient] Disconnected: ${reason}`);
        this.isConnected = false;
        this.handleReconnect();
      });

      // 接收新消息
      this.socket.on('message_new', (message: ChatMessage) => {
        this.handleMessage(message);
      });

      // 接收频道历史
      this.socket.on('channel_history', (data: { channelId: string; messages: ChatMessage[] }) => {
        console.log(`[ChatClient] Received ${data.messages.length} messages from ${data.channelId}`);
        // 处理历史消息（如果需要）
      });

      // 错误处理
      this.socket.on('error', (error: Error) => {
        console.error(`[ChatClient] Socket error: ${error.message}`);
      });
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: ChatMessage): void {
    // 跳过自己发送的消息
    if (message.userId === this.config.agentId) {
      return;
    }

    // 解析信封
    const envelope = parseEnvelope(message.content);

    if (envelope) {
      // 有信封的消息 - envelope has from, to, intent guaranteed by parseEnvelope
      const fullEnvelope = {
        ...envelope,
        content: extractContent(message.content),
        timestamp: new Date(message.createdAt),
      } as MessageEnvelope;

      console.log(`[ChatClient] Received ${envelope.intent} from ${envelope.from} (task: ${envelope.taskId || 'none'})`);

      if (this.messageHandler) {
        this.messageHandler(fullEnvelope, message);
      }
    } else {
      // 无信封的普通消息（闲聊）
      console.log(`[ChatClient] Received plain message from ${message.username}: ${message.content.substring(0, 50)}...`);
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    console.log(`[ChatClient] Scheduling reconnect in ${this.config.reconnectInterval}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
        console.log(`[ChatClient] Attempting reconnect #${this.reconnectAttempts + 1}...`);
        this.socket?.connect();
      }
    }, this.config.reconnectInterval);
  }

  /**
   * 订阅频道
   */
  subscribe(channelId: string): void {
    if (!this.isConnected) {
      console.warn('[ChatClient] Not connected, cannot subscribe to channel');
      return;
    }

    this.socket?.emit('join_channel', channelId);
    this.joinedChannels.add(channelId);
    console.log(`[ChatClient] Subscribed to channel: ${channelId}`);
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channelId: string): void {
    if (!this.isConnected) {
      return;
    }

    this.socket?.emit('leave_channel', channelId);
    this.joinedChannels.delete(channelId);
    console.log(`[ChatClient] Unsubscribed from channel: ${channelId}`);
  }

  /**
   * 订阅所有业务频道
   */
  subscribeAllChannels(): void {
    this.subscribe(this.config.channels.ops);
    this.subscribe(this.config.channels.hr);
    this.subscribe(this.config.channels.pending);
    // CEO DM is handled via agent personal room
  }

  /**
   * 发送消息
   */
  async send(
    channelId: string,
    intent: Intent,
    content: string,
    options: {
      taskId?: string;
      to?: AgentId | 'all';
      referencedMessageId?: string;
    } = {}
  ): Promise<string | null> {
    if (!this.isConnected) {
      console.error('[ChatClient] Cannot send message: not connected');
      return null;
    }

    const envelope: MessageEnvelope = {
      taskId: options.taskId,
      from: this.config.agentId,
      to: options.to || 'all',
      intent,
      content,
      timestamp: new Date(),
    };

    const formattedMessage = formatEnvelope(envelope);

    return new Promise((resolve) => {
      this.socket?.emit(
        'send_message',
        {
          channelId,
          content: formattedMessage,
          referencedMessageId: options.referencedMessageId,
        },
        (result: { success: boolean; messageId?: string; error?: string }) => {
          if (result.success) {
            console.log(`[ChatClient] Sent ${intent} to ${channelId}`);
            resolve(result.messageId || null);
          } else {
            console.error(`[ChatClient] Failed to send: ${result.error}`);
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * 发送 ASSIGN 消息（派单）
   */
  async assign(
    workerId: AgentId,
    taskId: string,
    content: string,
    channelId?: string
  ): Promise<string | null> {
    return this.send(channelId || this.config.channels.ops, 'ASSIGN', content, {
      taskId,
      to: workerId,
    });
  }

  /**
   * 发送 RESULT 消息（结果）
   */
  async result(
    taskId: string,
    content: string,
    channelId?: string
  ): Promise<string | null> {
    return this.send(channelId || this.config.channels.ops, 'RESULT', content, {
      taskId,
    });
  }

  /**
   * 发送 USER_REPLY 消息（用户可见回复）
   */
  async userReply(content: string, taskId?: string): Promise<string | null> {
    return this.send(this.config.channels.ceoDm, 'USER_REPLY', content, {
      taskId,
    });
  }

  /**
   * 发送 QA 消息
   */
  async qaAssign(taskId: string, content: string): Promise<string | null> {
    return this.send(this.config.channels.ops, 'QA_ASSIGN', content, {
      taskId,
      to: 'qa',
    });
  }

  async qaResult(taskId: string, content: string): Promise<string | null> {
    return this.send(this.config.channels.ops, 'QA_RESULT', content, {
      taskId,
    });
  }

  /**
   * 发送花名册消息
   */
  async rosterHire(agentId: AgentId, content: string): Promise<string | null> {
    return this.send(this.config.channels.hr, 'ROSTER_HIRE', content, {
      to: 'all',
    });
  }

  async rosterFire(agentId: AgentId, content: string): Promise<string | null> {
    return this.send(this.config.channels.hr, 'ROSTER_FIRE', content, {
      to: 'all',
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.joinedChannels.clear();
    console.log('[ChatClient] Disconnected');
  }

  /**
   * 检查连接状态
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取配置
   */
  getConfig(): ChatClientConfig {
    return { ...this.config };
  }

  /**
   * 设置消息处理器
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }
}

// ============ 导出工厂函数 ============

/**
 * 创建 Chat Client
 */
export function createChatClient(config: ChatClientConfig): ChatClient {
  return new ChatClient(config);
}
