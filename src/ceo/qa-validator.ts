/**
 * QA-1 验证框架
 * 负责：黄金样本验证 + 不变性规则检查 + 测试用例生成 + 覆盖率追踪
 */

import { z } from 'zod';

// ============ 类型定义 ============

/**
 * 黄金样本
 */
export interface GoldenSample {
  id: string;
  name: string;
  description?: string;
  input: unknown;
  expectedOutput?: string;
  expectedSections?: string[];
  mustContain?: string[];
  mustNotContain?: string[];
  dataDir?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 不变性规则
 */
export interface InvariantRule {
  id: string;
  name: string;
  description?: string;
  check(output: string, context: ValidationContext): boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * 验证上下文
 */
export interface ValidationContext {
  taskId: string;
  taskType: string;
  input: unknown;
  hasData?: boolean;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  checks: CheckResult[];
  details: string[];
}

/**
 * 不变性检查结果
 */
export interface InvariantResult {
  passed: boolean;
  results: InvariantCheckResult[];
  errors: string[];
  warnings: string[];
}

/**
 * 单个检查结果
 */
export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * 不变性检查结果
 */
export interface InvariantCheckResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * 测试用例
 */
export interface TestCase {
  id: string;
  name: string;
  taskType: string;
  input: unknown;
  expectedOutput?: string;
  validationRules: string[]; // rule IDs that should pass
  tags: string[];
}

/**
 * 覆盖率报告
 */
export interface CoverageReport {
  taskType: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverageByRule: Record<string, { total: number; passed: number }>;
  coverageBySample: Record<string, { total: number; passed: number }>;
  timestamp: Date;
}

// ============ 内置不变性规则 ============

/**
 * 创建免责声明规则
 */
function createDisclaimerRule(disclaimers: string[]): InvariantRule {
  return {
    id: 'disclaimer_required',
    name: '免责声明检查',
    description: '检查输出是否包含必要的免责声明',
    check: (output: string) => {
      return disclaimers.some(d => output.includes(d));
    },
    severity: 'warning',
    message: `输出应包含至少一个免责声明: ${disclaimers.join(', ')}`
  };
}

/**
 * 创建禁止捏造规则
 */
function createNoFabricationRule(): InvariantRule {
  return {
    id: 'no_fabrication',
    name: '禁止捏造检查',
    description: '检查是否存在无数据却提供具体日期的情况',
    check: (output: string, context: ValidationContext) => {
      // 如果有数据，允许具体日期
      if (context.hasData) return true;

      // 检查是否存在具体日期模式 (YYYY-MM-DD 或 YYYY/MM/DD)
      const datePattern = /\d{4}[-\/]\d{2}[-\/]\d{2}/g;
      const hasSpecificDates = datePattern.test(output);

      return !hasSpecificDates;
    },
    severity: 'error',
    message: '无数据时不得捏造具体日期'
  };
}

/**
 * 创建必要章节规则
 */
function createRequiredSectionsRule(sections: string[]): InvariantRule {
  return {
    id: 'sections_required',
    name: '必要章节检查',
    description: '检查输出是否包含必要的章节',
    check: (output: string) => {
      return sections.every(s => output.includes(s));
    },
    severity: 'error',
    message: `输出应包含所有必要章节: ${sections.join(', ')}`
  };
}

/**
 * 创建禁止占位符规则
 */
function createNoPlaceholderRule(placeholders: string[]): InvariantRule {
  return {
    id: 'no_placeholder',
    name: '禁止占位符检查',
    description: '检查输出是否包含未填充的占位符',
    check: (output: string) => {
      return !placeholders.some(p => output.includes(p));
    },
    severity: 'error',
    message: `输出不应包含占位符: ${placeholders.join(', ')}`
  };
}

/**
 * 创建长度限制规则
 */
function createLengthLimitRule(min: number, max: number): InvariantRule {
  return {
    id: 'length_limit',
    name: '长度限制检查',
    description: `检查输出长度是否在 ${min}-${max} 范围内`,
    check: (output: string) => {
      const len = output.trim().length;
      return len >= min && len <= max;
    },
    severity: 'warning',
    message: `输出长度应在 ${min}-${max} 范围内`
  };
}

// ============ QA-1 验证器 ============

/**
 * QA-1 验证器
 */
export class QA1Validator {
  private goldenSamples: Map<string, GoldenSample> = new Map();
  private invariantRules: Map<string, InvariantRule> = new Map();
  private testCases: TestCase[] = [];
  private coverageData: Map<string, { total: number; passed: number }> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * 注册默认不变性规则
   */
  private registerDefaultRules(): void {
    // 注册默认规则
    this.registerInvariantRule(createDisclaimerRule(['不构成投资建议', '不提供诊疗', '仅供参考']));
    this.registerInvariantRule(createNoFabricationRule());
    this.registerInvariantRule(createRequiredSectionsRule(['## ']));
    this.registerInvariantRule(createNoPlaceholderRule(['[TODO]', '[PLACEHOLDER]', 'xxx']));
    this.registerInvariantRule(createLengthLimitRule(10, 50000));
  }

  /**
   * 注册黄金样本
   */
  registerGoldenSample(sample: GoldenSample): void {
    this.goldenSamples.set(sample.id, sample);
  }

  /**
   * 批量注册黄金样本
   */
  registerGoldenSamples(samples: GoldenSample[]): void {
    samples.forEach(s => this.registerGoldenSample(s));
  }

  /**
   * 注册不变性规则
   */
  registerInvariantRule(rule: InvariantRule): void {
    this.invariantRules.set(rule.id, rule);
  }

  /**
   * 获取黄金样本
   */
  getGoldenSample(id: string): GoldenSample | undefined {
    return this.goldenSamples.get(id);
  }

  /**
   * 获取所有黄金样本
   */
  listGoldenSamples(): GoldenSample[] {
    return Array.from(this.goldenSamples.values());
  }

  /**
   * 获取不变性规则
   */
  getInvariantRule(id: string): InvariantRule | undefined {
    return this.invariantRules.get(id);
  }

  /**
   * 获取所有不变性规则
   */
  listInvariantRules(): InvariantRule[] {
    return Array.from(this.invariantRules.values());
  }

  // ============ 核心验证方法 ============

  /**
   * 使用黄金样本验证输出
   */
  validateWithGoldenSample(output: string, sampleId: string, context: ValidationContext): ValidationResult {
    const sample = this.goldenSamples.get(sampleId);
    const checks: CheckResult[] = [];
    const details: string[] = [];
    let score = 100;

    if (!sample) {
      return {
        passed: false,
        score: 0,
        checks: [{
          name: 'sample_lookup',
          passed: false,
          message: `黄金样本 ${sampleId} 不存在`,
          severity: 'error'
        }],
        details: [`样本 ${sampleId} 未找到`]
      };
    }

    // 检查必要章节
    if (sample.expectedSections) {
      const missingSections = sample.expectedSections.filter(s => !output.includes(s));
      if (missingSections.length > 0) {
        checks.push({
          name: 'expected_sections',
          passed: false,
          message: `缺少必要章节: ${missingSections.join(', ')}`,
          severity: 'error'
        });
        score -= 30;
        details.push(`缺少章节: ${missingSections.join(', ')}`);
      } else {
        checks.push({
          name: 'expected_sections',
          passed: true,
          message: '所有必要章节都存在',
          severity: 'info'
        });
      }
    }

    // 检查必须包含的内容
    if (sample.mustContain) {
      const missing = sample.mustContain.filter(m => !output.includes(m));
      if (missing.length > 0) {
        checks.push({
          name: 'must_contain',
          passed: false,
          message: `缺少必要内容: ${missing.join(', ')}`,
          severity: 'error'
        });
        score -= 20;
        details.push(`缺少必要内容: ${missing.join(', ')}`);
      } else {
        checks.push({
          name: 'must_contain',
          passed: true,
          message: '所有必要内容都存在',
          severity: 'info'
        });
      }
    }

    // 检查禁止包含的内容
    if (sample.mustNotContain) {
      const prohibited = sample.mustNotContain.filter(m => output.includes(m));
      if (prohibited.length > 0) {
        checks.push({
          name: 'must_not_contain',
          passed: false,
          message: `包含禁止内容: ${prohibited.join(', ')}`,
          severity: 'error'
        });
        score -= 25;
        details.push(`包含禁止内容: ${prohibited.join(', ')}`);
      } else {
        checks.push({
          name: 'must_not_contain',
          passed: true,
          message: '没有包含禁止内容',
          severity: 'info'
        });
      }
    }

    const passed = score >= 70 && checks.filter(c => c.severity === 'error' && !c.passed).length === 0;

    return {
      passed,
      score: Math.max(0, score),
      checks,
      details
    };
  }

  /**
   * 验证输出与预期完全匹配
   */
  validateExactMatch(output: string, expected: string, tolerance: number = 0.95): ValidationResult {
    const checks: CheckResult[] = [];
    const details: string[] = [];
    let score = 100;

    // 简单相似度检查
    const similarity = this.calculateSimilarity(output.trim(), expected.trim());

    if (similarity < tolerance) {
      checks.push({
        name: 'exact_match',
        passed: false,
        message: `输出与预期相似度 ${(similarity * 100).toFixed(1)}% 低于阈值 ${(tolerance * 100).toFixed(0)}%`,
        severity: 'error'
      });
      score -= 50;
      details.push(`相似度不足: ${(similarity * 100).toFixed(1)}%`);
    } else {
      checks.push({
        name: 'exact_match',
        passed: true,
        message: '输出与预期相似度满足要求',
        severity: 'info'
      });
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      checks,
      details
    };
  }

  /**
   * 计算两个字符串的相似度
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    const longerLength = longer.length;
    const editDistance = this.levenshteinDistance(longer, shorter);

    return (longerLength - editDistance) / longerLength;
  }

  /**
   * Levenshtein 距离
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 检查不变性规则
   */
  checkInvariants(output: string, context: ValidationContext, ruleIds?: string[]): InvariantResult {
    const results: InvariantCheckResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const rulesToCheck = ruleIds
      ? ruleIds.map(id => this.invariantRules.get(id)).filter((r): r is InvariantRule => r !== undefined)
      : Array.from(this.invariantRules.values());

    for (const rule of rulesToCheck) {
      let passed = false;
      try {
        passed = rule.check(output, context);
      } catch (e) {
        // 规则执行出错，标记为失败
      }

      const result: InvariantCheckResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        message: passed ? `通过: ${rule.message}` : rule.message
      };

      results.push(result);

      if (!passed) {
        // Rule failed - count as error regardless of severity for overall pass/fail
        errors.push(`[${rule.name}] ${rule.message}`);
        // Also add to warnings for visibility
        if (rule.severity === 'warning') {
          warnings.push(`[${rule.name}] ${rule.message}`);
        }
      }
    }

    return {
      passed: errors.length === 0,
      results,
      errors,
      warnings
    };
  }

  /**
   * 生成测试用例
   */
  generateTestCases(taskType: string, count: number = 5): TestCase[] {
    const cases: TestCase[] = [];
    const samples = this.listGoldenSamples().filter(s =>
      s.metadata?.taskType === taskType || s.name.includes(taskType)
    );

    // 从黄金样本生成测试用例
    for (let i = 0; i < Math.min(count, samples.length); i++) {
      const sample = samples[i];
      cases.push({
        id: `generated-${sample.id}-${Date.now()}-${i}`,
        name: `生成测试: ${sample.name}`,
        taskType,
        input: sample.input,
        expectedOutput: sample.expectedOutput,
        validationRules: this.listInvariantRules().map(r => r.id),
        tags: ['generated', 'golden-sample']
      });
    }

    // 生成边界测试用例
    if (cases.length < count) {
      cases.push({
        id: `generated-boundary-empty-${Date.now()}`,
        name: '边界测试: 空输入',
        taskType,
        input: {},
        validationRules: ['no_fabrication', 'disclaimer_required'],
        tags: ['generated', 'boundary', 'empty']
      });

      cases.push({
        id: `generated-boundary-long-${Date.now()}`,
        name: '边界测试: 超长输入',
        taskType,
        input: { text: 'a'.repeat(10000) },
        validationRules: ['length_limit', 'no_placeholder'],
        tags: ['generated', 'boundary', 'long']
      });
    }

    return cases;
  }

  /**
   * 记录测试结果
   */
  recordTestResult(taskType: string, ruleId: string, passed: boolean): void {
    const key = `${taskType}:${ruleId}`;
    const current = this.coverageData.get(key) || { total: 0, passed: 0 };
    current.total++;
    if (passed) current.passed++;
    this.coverageData.set(key, current);
  }

  /**
   * 获取覆盖率报告
   */
  getCoverage(): CoverageReport {
    const taskTypes = new Set<string>();
    const ruleCoverages: Record<string, { total: number; passed: number }> = {};
    const sampleCoverages: Record<string, { total: number; passed: number }> = {};

    for (const [key, data] of this.coverageData) {
      const [taskType, ruleId] = key.split(':');
      taskTypes.add(taskType);
      ruleCoverages[ruleId] = data;
    }

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const data of this.coverageData.values()) {
      totalTests += data.total;
      passedTests += data.passed;
      failedTests += data.total - data.passed;
    }

    return {
      taskType: Array.from(taskTypes).join(', ') || 'unknown',
      totalTests,
      passedTests,
      failedTests,
      coverageByRule: ruleCoverages,
      coverageBySample: sampleCoverages,
      timestamp: new Date()
    };
  }

  /**
   * 完整验证流程
   */
  validate(taskType: string, output: string, context: ValidationContext): {
    validation: ValidationResult;
    invariants: InvariantResult;
    score: number;
  } {
    // 1. 找到匹配的黄金样本
    let validation: ValidationResult = {
      passed: true,
      score: 100,
      checks: [],
      details: []
    };

    const matchingSample = this.listGoldenSamples().find(s =>
      s.name.includes(taskType) || (s.metadata?.taskType as string) === taskType
    );

    if (matchingSample) {
      validation = this.validateWithGoldenSample(output, matchingSample.id, context);
    }

    // 2. 检查不变性规则
    const invariants = this.checkInvariants(output, context);

    // 3. 计算综合分数
    const invariantScore = invariants.errors.length === 0 ? 100 : Math.max(0, 100 - invariants.errors.length * 20);
    const score = Math.round((validation.score * 0.6 + invariantScore * 0.4));

    // 4. 记录覆盖率
    this.recordTestResult(taskType, 'overall', validation.passed && invariants.passed);

    return {
      validation,
      invariants,
      score
    };
  }
}

// ============ 导出工厂函数 ============

/**
 * 创建 QA-1 验证器（带默认配置）
 */
export function createQA1Validator(): QA1Validator {
  return new QA1Validator();
}

/**
 * 创建带预定义黄金样本的验证器
 */
export function createQA1ValidatorWithSamples(samples: GoldenSample[]): QA1Validator {
  const validator = new QA1Validator();
  validator.registerGoldenSamples(samples);
  return validator;
}
