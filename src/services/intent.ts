/**
 * 意图识别服务
 * 将用户一句话识别为：晨间简报 / 晚间简报
 */

// 触发词定义
const MORNING_TRIGGERS = [
  '晨间', '早晨', '早上', '今日安排', '今天怎么安排',
  '今日计划', '今天计划', '今日日程', '今天日程',
  '晨间简报', '早安', '早上好', '新的一天'
];

const EVENING_TRIGGERS = [
  '晚间', '晚上', '晚安', '复盘', '今日复盘',
  '今天复盘', '今日总结', '今天总结', '今日回顾',
  '今天回顾', '晚间简报', '结束一天', '下班'
];

/**
 * 意图类型
 */
export type BriefIntent = 'morning' | 'evening' | 'unknown';

/**
 * 解析结果
 */
export interface IntentResult {
  intent: BriefIntent;
  confidence: number; // 0-1
  matchedTriggers: string[];
  needsClarification: boolean;
  clarificationQuestion?: string;
}

/**
 * 检查文本是否包含特定触发词
 */
function containsTrigger(text: string, triggers: string[]): boolean {
  const lowerText = text.toLowerCase();
  return triggers.some(trigger => lowerText.includes(trigger.toLowerCase()));
}

/**
 * 识别意图
 */
export function recognizeIntent(input: string): IntentResult {
  const lowerInput = input.toLowerCase();
  const matchedMorning: string[] = [];
  const matchedEvening: string[] = [];

  // 统计匹配的触发词
  for (const trigger of MORNING_TRIGGERS) {
    if (lowerInput.includes(trigger.toLowerCase())) {
      matchedMorning.push(trigger);
    }
  }

  for (const trigger of EVENING_TRIGGERS) {
    if (lowerInput.includes(trigger.toLowerCase())) {
      matchedEvening.push(trigger);
    }
  }

  // 计算置信度
  const morningScore = matchedMorning.length;
  const eveningScore = matchedEvening.length;
  const totalScore = morningScore + eveningScore;

  // 判定意图
  if (morningScore > 0 && eveningScore === 0) {
    return {
      intent: 'morning',
      confidence: Math.min(0.5 + morningScore * 0.25, 1),
      matchedTriggers: matchedMorning,
      needsClarification: false
    };
  }

  if (eveningScore > 0 && morningScore === 0) {
    return {
      intent: 'evening',
      confidence: Math.min(0.5 + eveningScore * 0.25, 1),
      matchedTriggers: matchedEvening,
      needsClarification: false
    };
  }

  if (morningScore > 0 && eveningScore > 0) {
    // 同时匹配，按分数判断
    if (morningScore > eveningScore) {
      return {
        intent: 'morning',
        confidence: 0.6,
        matchedTriggers: [...matchedMorning, ...matchedEvening],
        needsClarification: false
      };
    } else if (eveningScore > morningScore) {
      return {
        intent: 'evening',
        confidence: 0.6,
        matchedTriggers: [...matchedMorning, ...matchedEvening],
        needsClarification: false
      };
    } else {
      // 分数相同，需要澄清
      return {
        intent: 'unknown',
        confidence: 0,
        matchedTriggers: [...matchedMorning, ...matchedEvening],
        needsClarification: true,
        clarificationQuestion: '无法确定是晨间还是晚间简报，请问您想要：\n  1. 晨间简报\n  2. 晚间简报'
      };
    }
  }

  // 无匹配，需要澄清
  return {
    intent: 'unknown',
    confidence: 0,
    matchedTriggers: [],
    needsClarification: true,
    clarificationQuestion: '无法理解您的意图，请问您想要：\n  1. 晨间简报\n  2. 晚间简报'
  };
}

/**
 * 获取触发词表（用于文档）
 */
export function getTriggerWordsTable(): { morning: string[]; evening: string[] } {
  return {
    morning: MORNING_TRIGGERS,
    evening: EVENING_TRIGGERS
  };
}
