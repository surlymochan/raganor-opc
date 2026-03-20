import type { BriefData, CalendarEvent, Todo, OkrWeek, Habit } from './data-loader.js';

// 免责声明
const STOCK_DISCLAIMER = '> ⚠️ **免责声明**：本栏目仅作信息展示，不构成投资建议或买卖邀约，用户需自担风险。';
const WELLNESS_DISCLAIMER = '> ⚠️ **免责声明**：本栏目仅作信息展示，不提供诊疗服务，健康问题请咨询专业机构。';

/**
 * 检测日程冲突
 */
function detectConflicts(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const conflicts = new Map<string, CalendarEvent[]>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      // 跳过空日程
      if (a.title === '（无日程）' || b.title === '（无日程）') continue;

      const aStart = new Date(a.start).getTime();
      const aEnd = new Date(a.end).getTime();
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();

      // 检测重叠
      if (aStart < bEnd && bStart < aEnd) {
        const key = `${a.id}-${b.id}`;
        conflicts.set(key, [a, b]);
      }
    }
  }

  return conflicts;
}

/**
 * 格式化时间
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * OKR 状态标签
 */
function getOkrStatusTag(status: string): string {
  switch (status) {
    case 'in_progress': return '🔄 进行中';
    case 'at_risk': return '⚠️ 有风险';
    case 'completed': return '✅ 已完成';
    default: return '';
  }
}

/**
 * 优先级标签
 */
function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high': return '🔴 高';
    case 'medium': return '🟡 中';
    case 'low': return '🟢 低';
    default: return '';
  }
}

/**
 * 渲染今日日程区块
 */
function renderCalendar(events: CalendarEvent[], hasData: boolean): string {
  const lines: string[] = ['## 今日日程\n'];

  if (!hasData || events.length === 0) {
    lines.push('> 当前无数据（demo 模式）\n');
    return lines.join('\n');
  }

  // 过滤今日事件
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= today && start < tomorrow;
  }).filter(e => e.title !== '（无日程）');

  if (todayEvents.length === 0) {
    lines.push('📅 **今日无日程安排**\n');
    return lines.join('\n');
  }

  // 检测冲突
  const conflicts = detectConflicts(todayEvents);

  // 按时间排序
  todayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // 收集冲突时间点
  const conflictEventIds = new Set<string>();
  conflicts.forEach(([a, b]) => {
    conflictEventIds.add(a.id);
    conflictEventIds.add(b.id);
  });

  for (const event of todayEvents) {
    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);
    const isConflict = conflictEventIds.has(event.id);

    const conflictNote = isConflict ? ' ⚠️ **时间冲突**' : '';
    lines.push(`- **${startTime} - ${endTime}**：${event.title}${conflictNote}`);
  }

  if (conflicts.size > 0) {
    lines.push('\n> ⚠️ 检测到日程冲突，请确认优先级');
  }

  return lines.join('\n');
}

/**
 * 渲染待办 Top N
 */
function renderTodos(todos: Todo[], hasData: boolean): string {
  const lines: string[] = ['## 待办事项\n'];

  if (!hasData || todos.length === 0) {
    lines.push('> 当前无待办事项（demo 模式）\n');
    return lines.join('\n');
  }

  // 过滤未完成
  const undone = todos.filter(t => !t.done);

  // 排序：优先级 > 截止日期
  undone.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;

    if (aPriority !== bPriority) return aPriority - bPriority;

    // 有截止日期的优先
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) return a.due.localeCompare(b.due);

    return 0;
  });

  // 取 Top 3
  const topTodos = undone.slice(0, 3);

  for (const todo of topTodos) {
    const priority = getPriorityLabel(todo.priority);
    const dueNote = todo.due ? ` (截止: ${todo.due})` : '';
    lines.push(`- ${priority} ${todo.title}${dueNote}`);
  }

  if (undone.length > 3) {
    lines.push(`\n> 还有 ${undone.length - 3} 项待办未列出`);
  }

  return lines.join('\n');
}

/**
 * 渲染 OKR 进度
 */
function renderOkr(okr: OkrWeek | null, hasData: boolean): string {
  const lines: string[] = ['## 本周 OKR\n'];

  if (!hasData || !okr) {
    lines.push('> 当前无 OKR 数据（demo 模式）\n');
    return lines.join('\n');
  }

  lines.push(`**周次**：${okr.week_id}\n`);

  for (const obj of okr.objectives) {
    const statusTag = getOkrStatusTag(obj.status);
    lines.push(`\n### ${obj.title} ${statusTag}\n`);
    lines.push(`进度：${obj.progress}%`);

    if (obj.key_results.length > 0) {
      lines.push('\n关键结果：');
      for (const kr of obj.key_results) {
        const doneMark = kr.done ? '✅' : '⬜';
        lines.push(`- ${doneMark} ${kr.title}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 渲染习惯
 */
function renderHabits(habits: Habit[], hasData: boolean): string {
  const lines: string[] = ['## 今日习惯\n'];

  if (!hasData || habits.length === 0) {
    lines.push('> 当前无习惯数据（demo 模式）\n');
    return lines.join('\n');
  }

  for (const habit of habits) {
    const status = habit.today_done ? '✅ 已完成' : '⬜ 待完成';
    const streakNote = habit.streak > 0 ? ` (连续 ${habit.streak} 天)` : '';
    lines.push(`- ${habit.name}：${status}${streakNote}`);
  }

  const incomplete = habits.filter(h => !h.today_done).length;
  if (incomplete > 0) {
    lines.push(`\n> 还有 ${incomplete} 项习惯今日待完成`);
  }

  return lines.join('\n');
}

/**
 * 渲染股票占位区块
 */
function renderStockPlaceholder(): string {
  return `## 股票行情

> 📊 股票行情功能正在规划中...

${STOCK_DISCLAIMER}`;
}

/**
 * 渲染身心健康占位区块
 */
function renderWellnessPlaceholder(): string {
  return `## 身心健康

> 🏃 健康追踪功能正在规划中...

${WELLNESS_DISCLAIMER}`;
}

/**
 * 渲染晨间简报
 */
export function renderMorningBrief(data: BriefData): string {
  const sections: string[] = [];

  // 标题
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  sections.push(`# 🌅 晨间简报\n\n*${today}*\n`);

  // 1. 今日日程
  const calendarData = data.calendar.data;
  sections.push(renderCalendar(calendarData?.events || [], data.calendar.hasData));

  // 2. 待办事项
  const todosData = data.todos.data;
  sections.push('\n\n' + renderTodos(todosData?.todos || [], data.todos.hasData));

  // 3. 本周 OKR
  sections.push('\n\n' + renderOkr(data.okr.data, data.okr.hasData));

  // 4. 今日习惯
  const habitsData = data.habits.data;
  sections.push('\n\n' + renderHabits(habitsData?.habits || [], data.habits.hasData));

  // 5. 股票占位
  sections.push('\n\n' + renderStockPlaceholder());

  // 6. 身心健康占位
  sections.push('\n\n' + renderWellnessPlaceholder());

  return sections.join('\n');
}

/**
 * 渲染今日完成回顾（日程）
 */
function renderCompletedCalendar(events: CalendarEvent[], hasData: boolean): string {
  const lines: string[] = ['## 今日完成回顾\n'];

  if (!hasData || events.length === 0) {
    lines.push('> 当前无日程数据（demo 模式）\n');
    return lines.join('\n');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= today && start < tomorrow;
  }).filter(e => e.title !== '（无日程）');

  if (todayEvents.length === 0) {
    lines.push('📅 今日无日程记录\n');
    return lines.join('\n');
  }

  todayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  for (const event of todayEvents) {
    lines.push(`- ✅ ${event.title}`);
  }

  return lines.join('\n');
}

/**
 * 渲染未完成待办
 */
function renderUncompletedTodos(todos: Todo[], hasData: boolean): string {
  const lines: string[] = ['## 未完成事项\n'];

  if (!hasData || todos.length === 0) {
    lines.push('> 当前无待办事项\n');
    return lines.join('\n');
  }

  const undone = todos.filter(t => !t.done);

  if (undone.length === 0) {
    lines.push('🎉 所有待办已完成！\n');
    return lines.join('\n');
  }

  undone.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    return aPriority - bPriority;
  });

  for (const todo of undone) {
    const priority = getPriorityLabel(todo.priority);
    lines.push(`- ⬜ ${priority} ${todo.title}`);
  }

  lines.push('\n> 💡 可顺延至明日处理');

  return lines.join('\n');
}

/**
 * 渲染明日预备
 */
function renderTomorrowSchedule(events: CalendarEvent[], hasData: boolean): string {
  const lines: string[] = ['## 明日预备\n'];

  if (!hasData || events.length === 0) {
    lines.push('> 当前无日程数据（demo 模式）\n');
    return lines.join('\n');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const tomorrowEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= tomorrow && start < dayAfterTomorrow;
  }).filter(e => e.title !== '（无日程）');

  if (tomorrowEvents.length === 0) {
    lines.push('📅 明日暂无安排\n');
    return lines.join('\n');
  }

  tomorrowEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  for (const event of tomorrowEvents) {
    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);
    lines.push(`- ${startTime} - ${endTime}：${event.title}`);
  }

  return lines.join('\n');
}

/**
 * 渲染习惯未打卡提醒
 */
function renderHabitReminders(habits: Habit[], hasData: boolean): string {
  const lines: string[] = ['## 习惯打卡提醒\n'];

  if (!hasData || habits.length === 0) {
    lines.push('> 当前无习惯数据\n');
    return lines.join('\n');
  }

  const incomplete = habits.filter(h => !h.today_done);

  if (incomplete.length === 0) {
    lines.push('🌟 今日习惯已全部完成！\n');
    return lines.join('\n');
  }

  lines.push('以下习惯今日尚未打卡：\n');
  for (const habit of incomplete) {
    lines.push(`- ⬜ ${habit.name}`);
  }

  return lines.join('\n');
}

/**
 * 渲染晚间简报
 */
export function renderEveningBrief(data: BriefData): string {
  const sections: string[] = [];

  // 标题
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  sections.push(`# 🌙 晚间简报\n\n*${today}*\n`);

  // 1. 今日完成回顾
  const calendarData = data.calendar.data;
  sections.push(renderCompletedCalendar(calendarData?.events || [], data.calendar.hasData));

  // 2. 未完成事项
  const todosData = data.todos.data;
  sections.push('\n\n' + renderUncompletedTodos(todosData?.todos || [], data.todos.hasData));

  // 3. 明日预备
  sections.push('\n\n' + renderTomorrowSchedule(calendarData?.events || [], data.calendar.hasData));

  // 4. 习惯打卡提醒
  const habitsData = data.habits.data;
  sections.push('\n\n' + renderHabitReminders(habitsData?.habits || [], data.habits.hasData));

  // 5. OKR 一句
  sections.push('\n\n' + renderOkr(data.okr.data, data.okr.hasData));

  // 6. 股票/健康占位
  sections.push('\n\n' + renderStockPlaceholder());
  sections.push('\n\n' + renderWellnessPlaceholder());

  return sections.join('\n');
}
