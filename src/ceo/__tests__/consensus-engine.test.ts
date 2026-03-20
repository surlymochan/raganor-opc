import { describe, it, expect, beforeEach } from 'vitest';
import type { QA1Result, AdversarialResult } from '../qa-adversarial.js';
import {
  ConsensusEngine,
  createConsensusEngine,
  type Rule,
  type Decision
} from '../consensus-engine.js';

describe('ceo/consensus-engine', () => {
  let engine: ConsensusEngine;

  // Helper to create QA1 result
  const createQA1Result = (overrides: Partial<QA1Result> = {}): QA1Result => ({
    taskId: 'task-1',
    taskType: 'test',
    validation: { passed: true, score: 100, checks: [], details: [] },
    invariants: { passed: true, results: [], errors: [], warnings: [] },
    score: 100,
    passed: true,
    ...overrides
  });

  // Helper to create QA2 result
  const createQA2Result = (overrides: Partial<AdversarialResult> = {}): AdversarialResult => ({
    taskId: 'task-1',
    challenges: [],
    testCases: [],
    passedTests: 10,
    failedTests: 0,
    agreedWithQA1: true,
    ...overrides
  });

  beforeEach(() => {
    engine = createConsensusEngine();
  });

  describe('ConsensusEngine', () => {
    describe('decide', () => {
      it('should auto pass when QA1 passes and QA2 not triggered', () => {
        const qa1 = createQA1Result({ passed: true, score: 95 });

        const decision = engine.decide(qa1);

        expect(decision.outcome).toBe('pass');
        expect(decision.rulesTriggered).toContain('high_confidence_pass');
      });

      it('should auto reject when QA1 fails', () => {
        const qa1 = createQA1Result({ passed: false, score: 30 });

        const decision = engine.decide(qa1);

        expect(decision.outcome).toBe('reject');
        expect(decision.rulesTriggered).toContain('auto_reject');
      });

      it('should escalate when QA1 and QA2 disagree', () => {
        const qa1 = createQA1Result({ passed: true, score: 80 });
        const qa2 = createQA2Result({ agreedWithQA1: false, challenges: [{ id: 'c1', type: 'contradiction', severity: 'high', description: 'Issue', evidence: 'Evidence', qa1Conclusion: 'Pass', qa2Conclusion: 'Fail' }] });

        const decision = engine.decide(qa1, qa2);

        expect(decision.outcome).toBe('escalate');
        expect(decision.rulesTriggered).toContain('require_user');
      });

      it('should escalate on QA2 critical issue', () => {
        const qa1 = createQA1Result({ passed: true, score: 85 });
        const qa2 = createQA2Result({
          agreedWithQA1: true,
          challenges: [{
            id: 'c1',
            type: 'contradiction',
            severity: 'critical',
            description: 'Critical issue',
            evidence: 'Evidence',
            qa1Conclusion: 'Pass',
            qa2Conclusion: 'Pass'
          }]
        });

        const decision = engine.decide(qa1, qa2);

        expect(decision.outcome).toBe('escalate');
        expect(decision.rulesTriggered).toContain('qa2_critical');
      });

      it('should escalate when too many challenges', () => {
        const qa1 = createQA1Result({ passed: true, score: 80 });
        const qa2 = createQA2Result({
          agreedWithQA1: true,
          challenges: [
            { id: 'c1', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
            { id: 'c2', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
            { id: 'c3', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
            { id: 'c4', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' }
          ]
        });

        const decision = engine.decide(qa1, qa2);

        expect(decision.outcome).toBe('escalate');
        expect(decision.rulesTriggered).toContain('too_many_challenges');
      });

      it('should reject on low score', () => {
        const qa1 = createQA1Result({ passed: true, score: 40 });

        const decision = engine.decide(qa1);

        expect(decision.outcome).toBe('reject');
        expect(decision.rulesTriggered).toContain('low_score_reject');
      });

      it('should include confidence in decision', () => {
        const qa1 = createQA1Result({ passed: true, score: 95 });

        const decision = engine.decide(qa1);

        expect(decision.confidence).toBeGreaterThan(0);
        expect(decision.confidence).toBeLessThanOrEqual(100);
      });

      it('should default reject when no rules match', () => {
        // Remove all rules
        const rules = engine.getRules();
        for (const rule of rules) {
          engine.removeRule(rule.id);
        }

        const qa1 = createQA1Result({ passed: true, score: 95 });
        const decision = engine.decide(qa1);

        expect(decision.outcome).toBe('reject');
        expect(decision.confidence).toBe(0);
      });
    });

    describe('shouldEscalate', () => {
      it('should escalate on low confidence', () => {
        const decision: Decision = {
          outcome: 'pass',
          reason: 'Test',
          confidence: 30,
          rulesTriggered: [],
          ruleNames: [],
          timestamp: new Date()
        };

        const escalation = engine.shouldEscalate(decision);

        expect(escalation.triggered).toBe(true);
        expect(escalation.details.some(d => d.type === 'low_confidence')).toBe(true);
      });

      it('should not escalate on high confidence', () => {
        const decision: Decision = {
          outcome: 'pass',
          reason: 'Test',
          confidence: 90,
          rulesTriggered: [],
          ruleNames: [],
          timestamp: new Date()
        };

        const escalation = engine.shouldEscalate(decision);

        expect(escalation.triggered).toBe(false);
      });
    });

    describe('addRule', () => {
      it('should add custom rule', () => {
        const initialCount = engine.getRules().length;

        engine.addRule({
          id: 'custom_rule',
          name: 'Custom Rule',
          condition: () => true,
          action: 'pass',
          priority: 0,
          reason: 'Custom reason'
        });

        expect(engine.getRules().length).toBe(initialCount + 1);
      });

      it('should sort rules by priority', () => {
        engine.addRule({
          id: 'low_priority',
          name: 'Low Priority',
          condition: () => true,
          action: 'pass',
          priority: 100,
          reason: 'Low'
        });

        engine.addRule({
          id: 'high_priority',
          name: 'High Priority',
          condition: () => true,
          action: 'pass',
          priority: 1,
          reason: 'High'
        });

        const rules = engine.getRules();
        const highPriorityIndex = rules.findIndex(r => r.id === 'high_priority');
        const lowPriorityIndex = rules.findIndex(r => r.id === 'low_priority');

        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      });
    });

    describe('removeRule', () => {
      it('should remove existing rule', () => {
        const initialCount = engine.getRules().length;

        const removed = engine.removeRule('auto_reject');

        expect(removed).toBe(true);
        expect(engine.getRules().length).toBe(initialCount - 1);
      });

      it('should return false for non-existent rule', () => {
        const removed = engine.removeRule('non_existent');

        expect(removed).toBe(false);
      });
    });

    describe('getDecisionHistory', () => {
      it('should record decisions', () => {
        const qa1 = createQA1Result({ passed: true, score: 95 });
        engine.decide(qa1);

        const history = engine.getDecisionHistory();

        expect(history.length).toBeGreaterThan(0);
      });

      it('should filter by taskId', () => {
        const qa1 = createQA1Result({ taskId: 'task-1', passed: true, score: 95 });
        engine.decide(qa1);

        const qa1Other = createQA1Result({ taskId: 'task-2', passed: true, score: 95 });
        engine.decide(qa1Other);

        const history = engine.getDecisionHistory('task-1');

        expect(history.length).toBe(1);
        expect(history[0].taskId).toBe('task-1');
      });
    });

    describe('getStats', () => {
      it('should return correct stats', () => {
        // Make some decisions
        engine.decide(createQA1Result({ taskId: 'task-1', passed: true, score: 95 }));
        engine.decide(createQA1Result({ taskId: 'task-2', passed: false, score: 30 }));
        engine.decide(createQA1Result({ taskId: 'task-3', passed: true, score: 80 }));

        const stats = engine.getStats();

        expect(stats.totalDecisions).toBe(3);
        expect(stats.passCount).toBe(2);
        expect(stats.rejectCount).toBe(1);
      });

      it('should return zeros for empty history', () => {
        engine.clearHistory();

        const stats = engine.getStats();

        expect(stats.totalDecisions).toBe(0);
        expect(stats.passCount).toBe(0);
      });
    });

    describe('clearHistory', () => {
      it('should clear decision history', () => {
        engine.decide(createQA1Result({ passed: true, score: 95 }));
        engine.clearHistory();

        const stats = engine.getStats();

        expect(stats.totalDecisions).toBe(0);
      });
    });

    describe('makeDecision', () => {
      it('should return both decision and escalation', () => {
        const qa1 = createQA1Result({ passed: true, score: 95 });
        const qa2 = createQA2Result({ agreedWithQA1: false, challenges: [{ id: 'c1', type: 'contradiction', severity: 'high', description: 'Issue', evidence: 'Evidence', qa1Conclusion: 'Pass', qa2Conclusion: 'Fail' }] });

        const { decision, escalation } = engine.makeDecision(qa1, qa2);

        expect(decision).toBeDefined();
        expect(escalation).toBeDefined();
        expect(escalation.triggered).toBe(true);
      });
    });

    describe('getRecentDecisions', () => {
      it('should return recent decisions', () => {
        for (let i = 0; i < 15; i++) {
          engine.decide(createQA1Result({ taskId: `task-${i}`, passed: true, score: 95 }));
        }

        const recent = engine.getRecentDecisions(5);

        expect(recent.length).toBe(5);
      });
    });
  });

  describe('createConsensusEngine', () => {
    it('should create engine with default rules', () => {
      const engine = createConsensusEngine();
      expect(engine.getRules().length).toBeGreaterThan(0);
    });
  });
});