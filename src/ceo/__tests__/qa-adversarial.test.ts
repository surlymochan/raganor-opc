import { describe, it, expect, beforeEach } from 'vitest';
import {
  QA2Adversarial,
  createQA2Adversarial,
  type QA1Result,
  type Challenge
} from '../qa-adversarial.js';

describe('ceo/qa-adversarial', () => {
  let adversarial: QA2Adversarial;

  beforeEach(() => {
    adversarial = createQA2Adversarial();
  });

  describe('QA2Adversarial', () => {
    describe('shouldTrigger', () => {
      const createQA1Result = (overrides: Partial<QA1Result> = {}): QA1Result => ({
        taskId: 'task-1',
        taskType: 'morning_brief',
        validation: { passed: true, score: 100, checks: [], details: [] },
        invariants: { passed: true, results: [], errors: [], warnings: [] },
        score: 100,
        passed: true,
        ...overrides
      });

      it('should trigger for high risk task', () => {
        const qa1Result = createQA1Result({ taskType: 'payment' });
        expect(adversarial.shouldTrigger(qa1Result)).toBe(true);
      });

      it('should trigger when QA-1 rejects', () => {
        const qa1Result = createQA1Result({ passed: false, score: 30 });
        expect(adversarial.shouldTrigger(qa1Result)).toBe(true);
      });

      it('should trigger for new task type', () => {
        const qa1Result = createQA1Result({ taskType: 'unknown_task_type' });
        expect(adversarial.shouldTrigger(qa1Result)).toBe(true);
      });

      it('should trigger when coverage below threshold', () => {
        const qa1Result = createQA1Result();
        expect(adversarial.shouldTrigger(qa1Result, 0.5)).toBe(true);
      });

      it('should not trigger when all conditions are false', () => {
        const qa1Result = createQA1Result({
          taskType: 'morning_brief',
          passed: true
        });
        expect(adversarial.shouldTrigger(qa1Result, 0.9)).toBe(false);
      });
    });

    describe('reviewQA1Conclusion', () => {
      it('should detect false positive when QA-1 passes but has errors', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 85, checks: [], details: [] },
          invariants: {
            passed: true,
            results: [],
            errors: ['Some error'],
            warnings: []
          },
          score: 85,
          passed: true // QA-1 passed but has errors
        };

        const challenges = adversarial.reviewQA1Conclusion(qa1Result);

        expect(challenges.length).toBeGreaterThan(0);
        expect(challenges.some(c => c.type === 'false_positive')).toBe(true);
      });

      it('should detect false negative when QA-1 rejects but quality is acceptable', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 85, checks: [], details: [] },
          invariants: {
            passed: true,
            results: [],
            errors: [],
            warnings: []
          },
          score: 85,
          passed: false // QA-1 rejected but score is high
        };

        const challenges = adversarial.reviewQA1Conclusion(qa1Result);

        expect(challenges.some(c => c.type === 'false_negative')).toBe(true);
      });

      it('should detect contradiction when score is low but passed', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 100, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 40, // Low score
          passed: true // But passed
        };

        const challenges = adversarial.reviewQA1Conclusion(qa1Result);

        expect(challenges.some(c => c.type === 'contradiction')).toBe(true);
      });

      it('should return empty challenges when QA-1 conclusion seems correct', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const challenges = adversarial.reviewQA1Conclusion(qa1Result);

        expect(challenges.length).toBe(0);
      });
    });

    describe('generateAdversarialCases', () => {
      it('should generate empty input cases', () => {
        const cases = adversarial.generateAdversarialCases('test');

        const emptyCases = cases.filter(c => c.category === 'empty');
        expect(emptyCases.length).toBeGreaterThan(0);
      });

      it('should generate extreme cases', () => {
        const cases = adversarial.generateAdversarialCases('test');

        const extremeCases = cases.filter(c => c.category === 'extreme');
        expect(extremeCases.length).toBeGreaterThan(0);
      });

      it('should generate adversarial prompt cases', () => {
        const cases = adversarial.generateAdversarialCases('test');

        const promptCases = cases.filter(c => c.category === 'adversarial_prompt');
        expect(promptCases.length).toBeGreaterThan(0);
      });

      it('should generate boundary cases', () => {
        const cases = adversarial.generateAdversarialCases('test');

        const boundaryCases = cases.filter(c => c.category === 'boundary');
        expect(boundaryCases.length).toBeGreaterThan(0);
      });

      it('should generate targeted cases when qa1 result provided', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 70, checks: [], details: [] },
          invariants: {
            passed: true,
            results: [],
            errors: ['Some error'],
            warnings: []
          },
          score: 70,
          passed: true
        };

        const cases = adversarial.generateAdversarialCases('test', qa1Result);

        expect(cases.length).toBeGreaterThan(4); // More than just the base cases
      });
    });

    describe('runAdversarialTests', () => {
      it('should execute tests and collect results', async () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const executor = async (input: unknown) => {
          if (input === '') return '无效输入';
          return '处理成功';
        };

        const result = await adversarial.runAdversarialTests('test', executor, qa1Result);

        expect(result.taskId).toBe('task-1');
        expect(result.testCases.length).toBeGreaterThan(0);
        expect(result.passedTests + result.failedTests).toBe(result.testCases.length);
      });

      it('should handle executor errors gracefully', async () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const executor = async () => {
          throw new Error('Execution failed');
        };

        const result = await adversarial.runAdversarialTests('test', executor, qa1Result);

        expect(result.testCases.every(tc => !tc.runsCleanly)).toBe(true);
      });
    });

    describe('evaluateAdversarialTests', () => {
      it('should evaluate output without executing', () => {
        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const result = adversarial.evaluateAdversarialTests('test', 'some output', qa1Result);

        expect(result.taskId).toBe('task-1');
        expect(result.testCases.length).toBeGreaterThan(0);
        expect(result.agreedWithQA1).toBe(true);
      });
    });

    describe('shouldEscalate', () => {
      it('should escalate when QA1 and QA2 disagree', () => {
        const result = {
          taskId: 'task-1',
          challenges: [{
            id: 'c1',
            type: 'contradiction' as const,
            severity: 'high' as const,
            description: 'Test',
            evidence: 'Evidence',
            qa1Conclusion: 'Pass',
            qa2Conclusion: 'Fail'
          }],
          testCases: [],
          passedTests: 0,
          failedTests: 0,
          agreedWithQA1: false
        };

        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const escalation = adversarial.shouldEscalate(result, qa1Result);

        expect(escalation).toBeDefined();
        expect(escalation?.reason).toBe('qa1_qa2_disagree');
      });

      it('should escalate on critical challenge', () => {
        const result = {
          taskId: 'task-1',
          challenges: [{
            id: 'c1',
            type: 'contradiction' as const,
            severity: 'critical' as const,
            description: 'Critical issue',
            evidence: 'Evidence',
            qa1Conclusion: 'Pass',
            qa2Conclusion: 'Fail'
          }],
          testCases: [],
          passedTests: 0,
          failedTests: 0,
          agreedWithQA1: true
        };

        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const escalation = adversarial.shouldEscalate(result, qa1Result);

        expect(escalation).toBeDefined();
        expect(escalation?.reason).toBe('critical_challenge');
      });

      it('should escalate when too many challenges', () => {
        const challenges: Challenge[] = [
          { id: 'c1', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
          { id: 'c2', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
          { id: 'c3', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' },
          { id: 'c4', type: 'edge_case', severity: 'low', description: '', evidence: '', qa1Conclusion: '', qa2Conclusion: '' }
        ];

        const result = {
          taskId: 'task-1',
          challenges,
          testCases: [],
          passedTests: 0,
          failedTests: 0,
          agreedWithQA1: true
        };

        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'test',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const escalation = adversarial.shouldEscalate(result, qa1Result);

        expect(escalation).toBeDefined();
        expect(escalation?.reason).toBe('too_many_challenges');
      });

      it('should not escalate when no rules triggered', () => {
        const result = {
          taskId: 'task-1',
          challenges: [],
          testCases: [],
          passedTests: 10,
          failedTests: 0,
          agreedWithQA1: true
        };

        const qa1Result: QA1Result = {
          taskId: 'task-1',
          taskType: 'morning_brief',
          validation: { passed: true, score: 90, checks: [], details: [] },
          invariants: { passed: true, results: [], errors: [], warnings: [] },
          score: 90,
          passed: true
        };

        const escalation = adversarial.shouldEscalate(result, qa1Result);

        expect(escalation).toBeUndefined();
      });
    });

    describe('getEscalationRules', () => {
      it('should return escalation rules', () => {
        const rules = adversarial.getEscalationRules();
        expect(rules.length).toBeGreaterThan(0);
      });
    });

    describe('addEscalationRule', () => {
      it('should add custom escalation rule', () => {
        const initialCount = adversarial.getEscalationRules().length;

        adversarial.addEscalationRule({
          id: 'custom_rule',
          name: 'Custom Rule',
          condition: () => true,
          reason: 'Custom reason',
          recommendation: 'Custom recommendation'
        });

        expect(adversarial.getEscalationRules().length).toBe(initialCount + 1);
      });
    });

    describe('getTriggerConfig', () => {
      it('should return trigger config', () => {
        const config = adversarial.getTriggerConfig();
        expect(config).toBeDefined();
        expect(typeof config.highRiskTask).toBe('boolean');
        expect(typeof config.qa1Rejected).toBe('boolean');
      });
    });
  });

  describe('createQA2Adversarial', () => {
    it('should create adversarial with default config', () => {
      const adversarial = createQA2Adversarial();
      expect(adversarial).toBeInstanceOf(QA2Adversarial);
    });

    it('should create adversarial with custom config', () => {
      const adversarial = createQA2Adversarial({
        highRiskTask: false,
        qa1Rejected: false
      });
      expect(adversarial).toBeInstanceOf(QA2Adversarial);
    });
  });
});