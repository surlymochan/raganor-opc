/**
 * Consensus 规则引擎
 * 负责：规则引擎 + 决策合成 + 分歧升级 + 决策日志
 */

import type { QA1Result, AdversarialResult } from './qa-adversarial.js';

// ============ 类型定义 ============

/**
 * 规则条件上下文
 */
export interface ConsensusContext {
  qa1: QA1Result;
  qa2?: AdversarialResult;
  metadata?: Record<string, unknown>;
}

/**
 * 规则动作
 */
export type RuleAction = 'pass' | 'reject' | 'escalate';

/**
 * 规则条件函数类型
 */
export type RuleCondition = (_: ConsensusContext) => boolean;

/**
 * 规则
 */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number; // 数字越小优先级越高
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * 决策结果
 */
export interface Decision {
  outcome: 'pass' | 'reject' | 'escalate';
  reason: string;
  confidence: number; // 0-100
  rulesTriggered: string[];
  ruleNames: string[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 升级原因
 */
export interface Escalation {
  triggered: boolean;
  reason: string;
  destination: 'user' | 'admin' | 'system';
  notification: string;
  details: EscalationDetail[];
}

/**
 * 升级详情
 */
export interface EscalationDetail {
  type: 'qa1_qa2_disagree' | 'consecutive_ties' | 'user_preference_conflict' | 'low_confidence';
  description: string;
  data?: Record<string, unknown>;
}

/**
 * 决策日志条目
 */
export interface DecisionLogEntry {
  id: string;
  taskId: string;
  decision: Decision;
  escalation?: Escalation;
  context: ConsensusContext;
  timestamp: Date;
}

// ============ 内置规则 ============

/**
 * 自动拒绝：QA-1 失败
 */
function createAutoRejectRule(): Rule {
  return {
    id: 'auto_reject',
    name: '自动拒绝',
    description: 'QA-1 验证失败',
    condition: (ctx: ConsensusContext) => !ctx.qa1.passed,
    action: 'reject',
    priority: 1,
    reason: 'QA-1 验证未通过'
  };
}

/**
 * 需要用户介入：QA-1 和 QA-2 结论不一致
 */
function createRequireUserRule(): Rule {
  return {
    id: 'require_user',
    name: '需要用户介入',
    description: 'QA-1 通过但 QA-2 发现问题',
    condition: (ctx: ConsensusContext) => {
      if (!ctx.qa1.passed) return false;
      if (!ctx.qa2) return false;
      return ctx.qa2.agreedWithQA1 === false;
    },
    action: 'escalate',
    priority: 10,
    reason: 'QA-1 与 QA-2 结论不一致'
  };
}

/**
 * 高置信度通过：分数很高且无警告
 */
function createHighConfidencePassRule(): Rule {
  return {
    id: 'high_confidence_pass',
    name: '高置信度通过',
    description: 'QA-1 分数 >= 90 且无错误/警告，且 QA-2 无异议',
    condition: (ctx: ConsensusContext) => {
      if (!ctx.qa1.passed) return false;
      if (ctx.qa1.score < 90) return false;
      if (ctx.qa1.invariants.errors.length > 0) return false;
      if (ctx.qa1.invariants.warnings.length > 0) return false;
      // QA-2 存在且有异议时，不适用高置信度通过
      if (ctx.qa2 && !ctx.qa2.agreedWithQA1) return false;
      return true;
    },
    action: 'pass',
    priority: 2,
    reason: '高置信度：分数 >= 90，无错误警告，QA-2 无异议'
  };
}

/**
 * 低置信度拒绝：分数低于阈值
 */
function createLowScoreRejectRule(): Rule {
  return {
    id: 'low_score_reject',
    name: '低置信度拒绝',
    description: 'QA-1 分数低于阈值',
    condition: (ctx: ConsensusContext) => {
      if (ctx.qa1.score < 50) return true;
      return false;
    },
    action: 'reject',
    priority: 2,
    reason: '分数低于 50，不足以通过'
  };
}

/**
 * QA-2 发现严重问题
 */
function createQA2CriticalRule(): Rule {
  return {
    id: 'qa2_critical',
    name: 'QA-2 发现严重问题',
    description: 'QA-2 发现 critical 级别问题',
    condition: (ctx: ConsensusContext) => {
      if (!ctx.qa2) return false;
      return ctx.qa2.challenges.some(c => c.severity === 'critical');
    },
    action: 'escalate',
    priority: 5,
    reason: 'QA-2 发现 critical 级别问题，需要人工审核'
  };
}

/**
 * QA-2 挑战过多
 */
function createTooManyChallengesRule(): Rule {
  return {
    id: 'too_many_challenges',
    name: '挑战过多',
    description: 'QA-2 发现超过 3 个问题',
    condition: (ctx: ConsensusContext) => {
      if (!ctx.qa2) return false;
      return ctx.qa2.challenges.length > 3;
    },
    action: 'escalate',
    priority: 8,
    reason: 'QA-2 发现超过 3 个问题，建议人工审核'
  };
}

/**
 * 无 QA-2 结果时保守通过
 */
function createConservativePassRule(): Rule {
  return {
    id: 'conservative_pass',
    name: '保守通过',
    description: '无 QA-2 结果时，按 QA-1 决定',
    condition: (ctx: ConsensusContext) => {
      // 只有在没有 QA-2 结果时才考虑此规则
      return !ctx.qa2 && ctx.qa1.passed;
    },
    action: 'pass',
    priority: 100, // 低优先级
    reason: '无 QA-2 结果，信任 QA-1'
  };
}

// ============ 升级触发器 ============

const ESCALATION_TRIGGERS = {
  qa1_qa2_disagree: true,
  consecutive_ties: 3,
  user_preference_conflict: true,
  low_confidence: true,
  critical_issue: true
};

// ============ Consensus 引擎 ============

/**
 * Consensus 规则引擎
 */
export class ConsensusEngine {
  private rules: Rule[] = [];
  private decisionHistory: DecisionLogEntry[] = [];
  private consecutiveTies: number = 0;
  private maxHistorySize: number = 1000;

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    // 按优先级排序，低数字先匹配
    // 注意：reject 规则优先级更高，因为拒绝比通过更需要谨慎
    this.rules.push(createAutoRejectRule());       // priority 1
    this.rules.push(createLowScoreRejectRule());   // priority 2
    this.rules.push(createHighConfidencePassRule()); // priority 2
    this.rules.push(createQA2CriticalRule());      // priority 5
    this.rules.push(createTooManyChallengesRule()); // priority 8
    this.rules.push(createRequireUserRule());       // priority 10
    this.rules.push(createConservativePassRule());  // priority 100

    // 按优先级排序
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 添加规则
   */
  addRule(rule: Rule): void {
    this.rules.push(rule);
    // 重新排序
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取所有规则
   */
  getRules(): Rule[] {
    return [...this.rules];
  }

  /**
   * 做决策
   */
  decide(qa1Result: QA1Result, qa2Result?: AdversarialResult): Decision {
    const context: ConsensusContext = {
      qa1: qa1Result,
      qa2: qa2Result
    };

    const triggeredRules: Rule[] = [];

    // 按优先级找到第一个匹配的规则
    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          triggeredRules.push(rule);
          // 立即返回第一个匹配的规则
          break;
        }
      } catch (e) {
        // 规则执行出错，跳过
      }
    }

    // 如果没有匹配的规则，默认拒绝
    if (triggeredRules.length === 0) {
      return {
        outcome: 'reject',
        reason: '没有匹配的规则，默认拒绝',
        confidence: 0,
        rulesTriggered: [],
        ruleNames: [],
        timestamp: new Date()
      };
    }

    const primaryRule = triggeredRules[0];
    const confidence = this.calculateConfidence(primaryRule, context);

    // 记录决策
    const decision: Decision = {
      outcome: primaryRule.action,
      reason: primaryRule.reason,
      confidence,
      rulesTriggered: triggeredRules.map(r => r.id),
      ruleNames: triggeredRules.map(r => r.name),
      timestamp: new Date(),
      metadata: {
        allRulesEvaluated: triggeredRules.length
      }
    };

    // 记录到历史
    this.logDecision(qa1Result.taskId, decision, undefined, context);

    // 更新连续平局计数
    this.updateConsecutiveTies(decision);

    return decision;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(rule: Rule, context: ConsensusContext): number {
    let confidence = 80; // 基础置信度

    // QA-1 分数贡献
    confidence += Math.min(20, context.qa1.score / 5);

    // QA-2 一致性贡献
    if (context.qa2) {
      if (context.qa2.agreedWithQA1) {
        confidence += 10;
      } else {
        confidence -= 20;
      }

      // QA-2 挑战数量贡献
      confidence -= Math.min(30, context.qa2.challenges.length * 10);
    }

    // 优先级贡献（更高优先级的规则更可信）
    confidence += Math.max(0, 10 - rule.priority);

    return Math.min(100, Math.max(0, Math.round(confidence)));
  }

  /**
   * 检查升级条件
   */
  shouldEscalate(decision: Decision): Escalation {
    const details: EscalationDetail[] = [];

    // QA-1 和 QA-2 不一致
    if (decision.metadata?.qa1Qa2Disagree) {
      details.push({
        type: 'qa1_qa2_disagree',
        description: 'QA-1 和 QA-2 结论不一致',
        data: { decision: decision.outcome }
      });
    }

    // 连续平局
    if (this.consecutiveTies >= ESCALATION_TRIGGERS.consecutive_ties) {
      details.push({
        type: 'consecutive_ties',
        description: `连续 ${this.consecutiveTies} 次平局决策`,
        data: { consecutiveTies: this.consecutiveTies }
      });
    }

    // 低置信度
    if (decision.confidence < 50) {
      details.push({
        type: 'low_confidence',
        description: '决策置信度过低',
        data: { confidence: decision.confidence }
      });
    }

    // 升级到用户
    const escalation: Escalation = {
      triggered: details.length > 0 || decision.outcome === 'escalate',
      reason: details.length > 0 ? details.map(d => d.description).join('; ') : '决策需要人工介入',
      destination: 'user',
      notification: '你的决策 needed',
      details
    };

    return escalation;
  }

  /**
   * 更新连续平局计数
   */
  private updateConsecutiveTies(decision: Decision): void {
    if (decision.outcome === 'escalate') {
      this.consecutiveTies++;
    } else {
      this.consecutiveTies = 0;
    }
  }

  /**
   * 记录决策日志
   */
  private logDecision(
    taskId: string,
    decision: Decision,
    escalation: Escalation | undefined,
    context: ConsensusContext
  ): void {
    const entry: DecisionLogEntry = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      decision,
      escalation,
      context,
      timestamp: new Date()
    };

    this.decisionHistory.push(entry);

    // 限制历史大小
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(taskId?: string): DecisionLogEntry[] {
    if (taskId) {
      return this.decisionHistory.filter(e => e.taskId === taskId);
    }
    return [...this.decisionHistory];
  }

  /**
   * 获取最近的决策
   */
  getRecentDecisions(count: number = 10): DecisionLogEntry[] {
    return this.decisionHistory.slice(-count);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalDecisions: number;
    passCount: number;
    rejectCount: number;
    escalateCount: number;
    averageConfidence: number;
  } {
    const total = this.decisionHistory.length;
    if (total === 0) {
      return {
        totalDecisions: 0,
        passCount: 0,
        rejectCount: 0,
        escalateCount: 0,
        averageConfidence: 0
      };
    }

    const passCount = this.decisionHistory.filter(d => d.decision.outcome === 'pass').length;
    const rejectCount = this.decisionHistory.filter(d => d.decision.outcome === 'reject').length;
    const escalateCount = this.decisionHistory.filter(d => d.decision.outcome === 'escalate').length;
    const totalConfidence = this.decisionHistory.reduce((sum, d) => sum + d.decision.confidence, 0);

    return {
      totalDecisions: total,
      passCount,
      rejectCount,
      escalateCount,
      averageConfidence: Math.round(totalConfidence / total)
    };
  }

  /**
   * 清除历史
   */
  clearHistory(): void {
    this.decisionHistory = [];
    this.consecutiveTies = 0;
  }

  /**
   * 完整决策流程（包含升级检查）
   */
  makeDecision(qa1Result: QA1Result, qa2Result?: AdversarialResult): {
    decision: Decision;
    escalation: Escalation;
  } {
    const decision = this.decide(qa1Result, qa2Result);
    const escalation = this.shouldEscalate(decision);

    // 如果需要升级，更新决策
    if (escalation.triggered && decision.outcome !== 'escalate') {
      // 记录升级信息
      const entry = this.decisionHistory[this.decisionHistory.length - 1];
      if (entry) {
        entry.escalation = escalation;
      }
    }

    return { decision, escalation };
  }
}

// ============ 导出工厂函数 ============

/**
 * 创建 Consensus 引擎（带默认规则）
 */
export function createConsensusEngine(): ConsensusEngine {
  return new ConsensusEngine();
}

