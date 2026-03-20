/**
 * A2A 信封定义
 * 用于 CEO / Fact / OpenClaw 之间的消息传递
 */

export type AgentId = 'ceo' | 'fact' | 'openclaw';
export type Intent = 'MORNING_FACTS' | 'MORNING_PLAYBOOK' | 'EVENING_FACTS';

export interface A2AEnvelope {
  task_id: string;
  from: AgentId;
  to: AgentId;
  intent: Intent;
  payload: Record<string, unknown>;
}

export interface MORNING_FACTS_Payload {
  data_dir: string;
}

export interface MORNING_PLAYBOOK_Payload {
  fact_excerpt: string;
  max_length?: number;
}

export interface FactResponse {
  markdown: string;
  data_dir: string;
  has_data: boolean;
}

export interface PlaybookResponse {
  markdown: string;
  disclaimer: string;
}

/**
 * 生成任务 ID
 */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 创建信封
 */
export function createEnvelope(
  from: AgentId,
  to: AgentId,
  intent: Intent,
  payload: Record<string, unknown>
): A2AEnvelope {
  return {
    task_id: generateTaskId(),
    from,
    to,
    intent,
    payload
  };
}
