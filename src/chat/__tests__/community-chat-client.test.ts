import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseEnvelope,
  formatEnvelope,
  extractContent,
  createChatClient,
  type MessageEnvelope,
  type Intent,
  type ChatMessage
} from '../community-chat-client.js';

describe('chat/community-chat-client', () => {
  describe('parseEnvelope', () => {
    it('should parse complete envelope', () => {
      const content = '[TASK:task-123][FROM:ceo][TO:fact][INTENT:ASSIGN]\n请帮我生成晨间简报';

      const result = parseEnvelope(content);

      expect(result).toEqual({
        taskId: 'task-123',
        from: 'ceo',
        to: 'fact',
        intent: 'ASSIGN',
      });
    });

    it('should parse envelope without taskId', () => {
      const content = '[FROM:fact][TO:ceo][INTENT:RESULT]\n晨间简报已完成';

      const result = parseEnvelope(content);

      expect(result).toEqual({
        from: 'fact',
        to: 'ceo',
        intent: 'RESULT',
      });
    });

    it('should return null for invalid envelope', () => {
      const content = '这是一条普通消息，没有信封';

      const result = parseEnvelope(content);

      expect(result).toBeNull();
    });

    it('should parse USER_REPLY intent', () => {
      const content = '[TASK:task-456][FROM:ceo][TO:all][INTENT:USER_REPLY]\n今日工作已完成';

      const result = parseEnvelope(content);

      expect(result?.intent).toBe('USER_REPLY');
    });

    it('should parse ROSTER_HIRE intent', () => {
      const content = '[FROM:ceo][TO:all][INTENT:ROSTER_HIRE]\n招聘新成员';

      const result = parseEnvelope(content);

      expect(result?.intent).toBe('ROSTER_HIRE');
    });

    it('should parse QA_ASSIGN intent', () => {
      const content = '[TASK:task-789][FROM:ceo][TO:qa][INTENT:QA_ASSIGN]\n请验证此任务';

      const result = parseEnvelope(content);

      expect(result?.intent).toBe('QA_ASSIGN');
    });
  });

  describe('formatEnvelope', () => {
    it('should format complete envelope', () => {
      const envelope: MessageEnvelope = {
        taskId: 'task-123',
        from: 'ceo',
        to: 'fact',
        intent: 'ASSIGN',
        content: '请帮我生成晨间简报',
        timestamp: new Date('2026-03-21T10:00:00Z'),
      };

      const result = formatEnvelope(envelope);

      expect(result).toContain('[TASK:task-123]');
      expect(result).toContain('[FROM:ceo]');
      expect(result).toContain('[TO:fact]');
      expect(result).toContain('[INTENT:ASSIGN]');
      expect(result).toContain('请帮我生成晨间简报');
    });

    it('should format envelope without taskId', () => {
      const envelope: MessageEnvelope = {
        from: 'fact',
        to: 'ceo',
        intent: 'RESULT',
        content: '晨间简报已完成',
        timestamp: new Date(),
      };

      const result = formatEnvelope(envelope);

      expect(result).toContain('[FROM:fact]');
      expect(result).toContain('[TO:ceo]');
      expect(result).toContain('[INTENT:RESULT]');
      expect(result).not.toContain('[TASK:');
    });

    it('should format envelope with TO:all', () => {
      const envelope: MessageEnvelope = {
        from: 'ceo',
        to: 'all',
        intent: 'USER_REPLY',
        content: '大家好',
        timestamp: new Date(),
      };

      const result = formatEnvelope(envelope);

      expect(result).toContain('[TO:all]');
    });
  });

  describe('extractContent', () => {
    it('should extract content after envelope', () => {
      const content = '[TASK:task-123][FROM:ceo][TO:fact][INTENT:ASSIGN]\n请帮我生成晨间简报';

      const result = extractContent(content);

      expect(result).toBe('请帮我生成晨间简报');
    });

    it('should return empty string if only envelope', () => {
      const content = '[TASK:task-123][FROM:ceo][TO:fact][INTENT:ASSIGN]';

      const result = extractContent(content);

      expect(result).toBe('');
    });

    it('should return original content if no envelope', () => {
      const content = '这是一条普通消息';

      const result = extractContent(content);

      expect(result).toBe('这是一条普通消息');
    });

    it('should handle content with multiple newlines', () => {
      const content = '[FROM:ceo][TO:fact][INTENT:ASSIGN]\n\n多行内容\n第二行';

      const result = extractContent(content);

      expect(result).toBe('多行内容\n第二行');
    });
  });

  describe('createChatClient', () => {
    it('should create client with config', () => {
      const client = createChatClient({
        wsUrl: 'http://localhost:3001',
        agentId: 'ceo',
        username: 'CEO Agent',
        channels: {
          ops: '#raganor-ops',
          hr: '#raganor-hr',
          pending: '#raganor-pending',
          ceoDm: 'ceo-dm',
        },
      });

      expect(client).toBeDefined();
      expect(client.connected).toBe(false);
    });

    it('should return config via getConfig', () => {
      const client = createChatClient({
        wsUrl: 'http://localhost:3001',
        agentId: 'ceo',
        username: 'CEO Agent',
        channels: {
          ops: '#raganor-ops',
          hr: '#raganor-hr',
          pending: '#raganor-pending',
          ceoDm: 'ceo-dm',
        },
      });

      const config = client.getConfig();

      expect(config.wsUrl).toBe('http://localhost:3001');
      expect(config.agentId).toBe('ceo');
      expect(config.channels.ops).toBe('#raganor-ops');
    });
  });

  describe('MessageEnvelope type coverage', () => {
    it('should accept all valid intents', () => {
      const intents: Intent[] = [
        'ASSIGN',
        'ACK',
        'RESULT',
        'BLOCK',
        'CLARIFY',
        'FORWARD',
        'USER_REPLY',
        'USER_APPROVE_HIRE',
        'USER_REJECT_HIRE',
        'USER_APPROVE_FIRE',
        'USER_REJECT_FIRE',
        'ROSTER_HIRE',
        'ROSTER_FIRE',
        'ROSTER_ACK',
        'ROSTER_UPDATE',
        'QA_ASSIGN',
        'QA_RESULT',
        'QA_BLOCK',
        'SKIP',
      ];

      intents.forEach(intent => {
        const envelope: MessageEnvelope = {
          from: 'ceo',
          to: 'fact',
          intent,
          content: 'test',
          timestamp: new Date(),
        };
        expect(envelope.intent).toBe(intent);
      });
    });
  });
});