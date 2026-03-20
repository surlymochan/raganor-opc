import { describe, it, expect, beforeEach } from 'vitest';
import {
  QA1Validator,
  createQA1Validator,
  createQA1ValidatorWithSamples,
  type GoldenSample,
  type ValidationContext,
  type TestCase
} from '../qa-validator.js';

describe('ceo/qa-validator', () => {
  let validator: QA1Validator;

  beforeEach(() => {
    validator = createQA1Validator();
  });

  describe('GoldenSample', () => {
    const sample: GoldenSample = {
      id: 'sample-1',
      name: '晨间简报-正常',
      description: '正常情况下的晨间简报',
      input: { text: '今天怎么安排' },
      expectedSections: ['## 今日日程', '## 待办事项', '## 今日专注'],
      mustContain: ['咖啡', '任务'],
      mustNotContain: ['[TODO]', '[PLACEHOLDER]'],
      metadata: { taskType: 'morning_brief' }
    };

    beforeEach(() => {
      validator.registerGoldenSample(sample);
    });

    it('should register and retrieve golden sample', () => {
      const retrieved = validator.getGoldenSample('sample-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('晨间简报-正常');
    });

    it('should list all golden samples', () => {
      const samples = validator.listGoldenSamples();
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should validate with golden sample - all checks pass', () => {
      const output = '## 今日日程\n咖啡时间 9:00\n## 待办事项\n任务1\n## 今日专注\n专注工作';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'morning_brief',
        input: { text: '今天怎么安排' },
        hasData: true
      };

      const result = validator.validateWithGoldenSample(output, 'sample-1', context);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should fail validation when missing required sections', () => {
      const output = '## 今日日程\n咖啡时间 9:00';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'morning_brief',
        input: { text: '今天怎么安排' },
        hasData: true
      };

      const result = validator.validateWithGoldenSample(output, 'sample-1', context);

      expect(result.passed).toBe(false);
      expect(result.checks.some(c => c.name === 'expected_sections' && !c.passed)).toBe(true);
    });

    it('should fail validation when missing must-contain content', () => {
      const output = '## 今日日程\n## 待办事项\n## 今日专注';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'morning_brief',
        input: { text: '今天怎么安排' }
      };

      const result = validator.validateWithGoldenSample(output, 'sample-1', context);

      expect(result.passed).toBe(false);
      expect(result.checks.some(c => c.name === 'must_contain' && !c.passed)).toBe(true);
    });

    it('should fail validation when contains prohibited content', () => {
      const output = '## 今日日程\n[TODO] 任务\n## 待办事项\n## 今日专注';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'morning_brief',
        input: { text: '今天怎么安排' }
      };

      const result = validator.validateWithGoldenSample(output, 'sample-1', context);

      expect(result.passed).toBe(false);
      expect(result.checks.some(c => c.name === 'must_not_contain' && !c.passed)).toBe(true);
    });

    it('should return error when sample not found', () => {
      const output = 'some output';
      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'unknown',
        input: {}
      };

      const result = validator.validateWithGoldenSample(output, 'non-existent', context);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Invariant Rules', () => {
    it('should have default rules registered', () => {
      const rules = validator.listInvariantRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should check disclaimer_required rule - pass', () => {
      const output = '这是一个输出，包含不构成投资建议的声明';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['disclaimer_required']);

      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should check disclaimer_required rule - fail', () => {
      const output = '这是一个没有任何免责声明的输出';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['disclaimer_required']);

      expect(result.passed).toBe(false);
      expect(result.warnings.length).toBe(1);
    });

    it('should check no_fabrication rule - no data with specific dates should fail', () => {
      const output = '会议安排在 2026-03-21';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {},
        hasData: false // 无数据
      };

      const result = validator.checkInvariants(output, context, ['no_fabrication']);

      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.includes('不得捏造具体日期'))).toBe(true);
    });

    it('should check no_fabrication rule - with data should pass', () => {
      const output = '会议安排在 2026-03-21';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {},
        hasData: true // 有数据
      };

      const result = validator.checkInvariants(output, context, ['no_fabrication']);

      expect(result.passed).toBe(true);
    });

    it('should check no_placeholder rule - pass', () => {
      const output = '这是一个正常的输出，没有占位符';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['no_placeholder']);

      expect(result.passed).toBe(true);
    });

    it('should check no_placeholder rule - fail', () => {
      const output = '这是一个包含 [TODO] 占位符的输出';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['no_placeholder']);

      expect(result.passed).toBe(false);
    });

    it('should check length_limit rule - within range', () => {
      const output = 'a'.repeat(100);

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['length_limit']);

      expect(result.passed).toBe(true);
    });

    it('should check length_limit rule - too short', () => {
      const output = 'a';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context, ['length_limit']);

      expect(result.passed).toBe(false);
    });

    it('should check multiple rules', () => {
      const output = '包含免责声明，但不构成投资建议';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'test',
        input: {}
      };

      const result = validator.checkInvariants(output, context);

      // Should have multiple rule results
      expect(result.results.length).toBeGreaterThan(1);
    });
  });

  describe('Exact Match Validation', () => {
    it('should pass exact match with high similarity', () => {
      const output = '这是一个测试输出';
      const expected = '这是一个测试输出';

      const result = validator.validateExactMatch(output, expected);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should pass with acceptable tolerance', () => {
      // Two similar strings - expected is prefix of output
      // output = '今天天气很好' (6 chars), expected = '今天天气' (4 chars)
      // editDistance = 2 (delete '很', '好'), similarity = (6-2)/6 = 0.667
      const output = '今天天气很好';
      const expected = '今天天气';

      const result = validator.validateExactMatch(output, expected, 0.6);

      expect(result.passed).toBe(true);
    });

    it('should fail with low similarity', () => {
      const output = '完全不同的输出内容';
      const expected = '这是一个测试输出';

      const result = validator.validateExactMatch(output, expected, 0.95);

      expect(result.passed).toBe(false);
    });
  });

  describe('Test Case Generation', () => {
    it('should generate test cases', () => {
      const cases = validator.generateTestCases('morning_brief', 3);

      expect(cases.length).toBeGreaterThan(0);
      expect(cases[0].taskType).toBe('morning_brief');
      expect(cases[0].id).toBeDefined();
    });

    it('should include boundary test cases', () => {
      const cases = validator.generateTestCases('test', 10);

      const boundaryCases = cases.filter(c => c.tags.includes('boundary'));
      expect(boundaryCases.length).toBeGreaterThan(0);
    });

    it('should include validation rules in test cases', () => {
      const cases = validator.generateTestCases('test', 3);

      for (const c of cases) {
        expect(c.validationRules.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Coverage Tracking', () => {
    it('should record test results', () => {
      validator.recordTestResult('morning_brief', 'disclaimer_required', true);
      validator.recordTestResult('morning_brief', 'disclaimer_required', false);

      const coverage = validator.getCoverage();

      expect(coverage.totalTests).toBe(2);
      expect(coverage.passedTests).toBe(1);
      expect(coverage.failedTests).toBe(1);
    });

    it('should track coverage by rule', () => {
      validator.recordTestResult('test', 'rule1', true);
      validator.recordTestResult('test', 'rule1', true);
      validator.recordTestResult('test', 'rule2', false);

      const coverage = validator.getCoverage();

      expect(coverage.coverageByRule['rule1']).toEqual({ total: 2, passed: 2 });
      expect(coverage.coverageByRule['rule2']).toEqual({ total: 1, passed: 0 });
    });

    it('should return empty coverage when no tests recorded', () => {
      const coverage = validator.getCoverage();

      expect(coverage.totalTests).toBe(0);
      expect(coverage.passedTests).toBe(0);
    });
  });

  describe('Full Validation Flow', () => {
    it('should validate successfully with all checks passing', () => {
      const output = '## 今日日程\n9:00 咖啡时间\n## 待办事项\n任务1\n## 今日专注\n专注工作\n不构成投资建议';

      const context: ValidationContext = {
        taskId: 'task-1',
        taskType: 'morning_brief',
        input: { text: '今天怎么安排' },
        hasData: true
      };

      // Register matching sample
      validator.registerGoldenSample({
        id: 'brief-sample',
        name: 'morning_brief',
        input: {},
        expectedSections: ['## 今日日程', '## 待办事项'],
        mustContain: ['咖啡'],
        metadata: { taskType: 'morning_brief' }
      });

      const result = validator.validate('morning_brief', output, context);

      expect(result.score).toBeGreaterThan(0);
      expect(result.validation).toBeDefined();
      expect(result.invariants).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create validator with default config', () => {
      const v = createQA1Validator();
      expect(v).toBeInstanceOf(QA1Validator);
    });

    it('should create validator with pre-registered samples', () => {
      const samples: GoldenSample[] = [
        { id: 's1', name: 'Sample 1', input: {}, expectedSections: ['## A'] },
        { id: 's2', name: 'Sample 2', input: {}, mustContain: ['test'] }
      ];

      const v = createQA1ValidatorWithSamples(samples);
      expect(v.listGoldenSamples().length).toBe(2);
    });
  });
});