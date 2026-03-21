#!/usr/bin/env node
/**
 * LLM Code Review Automation
 *
 * 使用 OpenAI API 做代码评审，发现严重问题则让 CI 失败
 * 需要配置 OPENAI_API_KEY 在 GitHub Secrets
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { getPRDiff } from './github-api.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.GITHUB_REF_NAME?.match(/\d+/)?.[0] || process.env.GITHUB_EVENT_NUMBER;
const REPO_FULL_NAME = process.env.GITHUB_REPOSITORY;

if (!OPENAI_API_KEY) {
  console.log('⚠️ OPENAI_API_KEY not configured, skipping LLM review');
  process.exit(0);
}

if (!GITHUB_TOKEN || !PR_NUMBER || !REPO_FULL_NAME) {
  console.log('⚠️ Missing GitHub environment, skipping');
  process.exit(0);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * 评审结果分级
 */
function classifyReview(reviewText) {
  const lower = reviewText.toLowerCase();

  // 检查是否有严重问题
  const hasCritical = lower.includes('critical') ||
                   lower.includes('blocker') ||
                   lower.includes('security') ||
                   lower.includes('vulnerability') ||
                   lower.includes('bug') && lower.includes('critical') ||
                   lower.includes('should not merge');

  // 检查是否有重大问题需要修改
  const hasMajorIssues = lower.includes('major') ||
                       lower.includes('should fix') && !lower.includes('minor') ||
                       lower.includes('needs changes');

  return {
    hasCritical,
    hasMajorIssues,
    approved: !hasCritical && !hasMajorIssues
  };
}

async function main() {
  console.log(`Starting LLM code review for PR #${PR_NUMBER} in ${REPO_FULL_NAME}`);

  try {
    // 获取 PR diff
    const diff = await getPRDiff(REPO_FULL_NAME, PR_NUMBER, GITHUB_TOKEN);

    if (!diff || diff.trim().length === 0) {
      console.log('📭 Empty diff, skipping review');
      process.exit(0);
    }

    console.log(`📝 Diff size: ${diff.length} characters`);

    const prompt = `
你是一位经验丰富的高级软件工程师，负责代码评审。请评审以下 PR 代码变更：

\`\`\`diff
${diff}
\`\`\`

请按照以下格式评审：

## 总体评价

一句话总结本次变更的质量。

## 问题分类

- **严重问题**（会导致 CI 失败，必须修改）：安全漏洞、内存泄漏、严重逻辑错误、破坏现有API、泄露密钥
- **主要问题**（建议修改，但不阻止合并）：代码风格、可维护性问题
- **没问题**：批准通过

## 结论

【批准/需要修改/不批准】
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const review = response.choices[0].message.content;
    console.log('\n--- LLM Review ---\n');
    console.log(review);
    console.log('\n--- End Review ---\n');

    const { hasCritical, hasMajorIssues, approved } = classifyReview(review);

    // 评论到 PR 需要 GitHub API，这里简化处理，只做 blocking 判断
    if (hasCritical) {
      console.log('\n❌ LLM found critical issues, failing CI');
      process.exit(1);
    }

    if (hasMajorIssues) {
      console.log('\n⚠️  LLM found major issues, but will not block merge');
      process.exit(0);
    }

    console.log('\n✅ LLM review approved');
    process.exit(0);
  } catch (error) {
    console.error('❌ LLM review failed:', error.message);
    // LLM 失败不阻止合并
    process.exit(0);
  }
}

main().catch(console.error);
