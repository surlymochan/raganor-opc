import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

// 数据类型定义
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  source?: string;
}

export interface Todo {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due?: string;
  done: boolean;
  created_at?: string;
}

export interface KeyResult {
  id: string;
  title: string;
  done: boolean;
}

export interface Objective {
  id: string;
  title: string;
  status: 'in_progress' | 'completed' | 'at_risk';
  progress: number;
  key_results: KeyResult[];
}

export interface OkrWeek {
  week_id: string;
  objectives: Objective[];
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  today_done: boolean;
  streak: number;
  note?: string;
  weekly_target?: number;
  weekly_done?: number;
}

export interface DayFocus {
  content: string;
  created_at?: string;
}

// 加载结果
export interface LoadResult<T> {
  data: T | null;
  hasData: boolean;
  source: string;
  error?: string;
}

export interface BriefData {
  calendar: LoadResult<{ events: CalendarEvent[] }>;
  todos: LoadResult<{ todos: Todo[] }>;
  okr: LoadResult<OkrWeek>;
  habits: LoadResult<{ habits: Habit[] }>;
  dayFocus: LoadResult<DayFocus>;
  dataDir: string;
}

/**
 * 解析 YAML 文件
 */
function parseYaml<T>(filePath: string): LoadResult<T> {
  try {
    if (!fs.existsSync(filePath)) {
      return { data: null, hasData: false, source: filePath };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const trimmed = content.trim();

    if (!trimmed) {
      return { data: null, hasData: false, source: filePath };
    }

    const data = YAML.parse(trimmed) as T;
    return { data, hasData: true, source: filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, hasData: false, source: filePath, error: message };
  }
}

/**
 * 获取数据根目录
 */
export function getDataDir(): string {
  return process.env.BRIEF_DATA_DIR || path.join(process.cwd(), 'examples', 'demo-data');
}

/**
 * 加载简报数据
 */
export function loadBriefData(dataDir?: string): BriefData {
  const dir = dataDir || getDataDir();

  const calendarPath = path.join(dir, 'calendar.yaml');
  const todosPath = path.join(dir, 'todos.yaml');
  const okrPath = path.join(dir, 'okr.yaml');
  const habitsPath = path.join(dir, 'habits.yaml');
  const dayFocusPath = path.join(dir, 'day_focus.md');

  const calendar = parseYaml<{ events: CalendarEvent[] }>(calendarPath);
  const todos = parseYaml<{ todos: Todo[] }>(todosPath);
  const okr = parseYaml<OkrWeek>(okrPath);
  const habits = parseYaml<{ habits: Habit[] }>(habitsPath);

  // day_focus.md 是 Markdown 文本
  let dayFocus: LoadResult<DayFocus> = { data: null, hasData: false, source: dayFocusPath };
  if (fs.existsSync(dayFocusPath)) {
    const content = fs.readFileSync(dayFocusPath, 'utf-8').trim();
    if (content) {
      dayFocus = {
        data: { content, created_at: fs.statSync(dayFocusPath).mtime.toISOString() },
        hasData: true,
        source: dayFocusPath
      };
    }
  }

  return {
    calendar,
    todos,
    okr,
    habits,
    dayFocus,
    dataDir: dir
  };
}

/**
 * 检查是否有任意数据
 */
export function hasAnyData(data: BriefData): boolean {
  return data.calendar.hasData ||
         data.todos.hasData ||
         data.okr.hasData ||
         data.habits.hasData ||
         data.dayFocus.hasData;
}

/**
 * 验证数据完整性（用于测试）
 */
export function validateBriefData(data: BriefData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.calendar.error) {
    errors.push(`Calendar: ${data.calendar.error}`);
  }
  if (data.todos.error) {
    errors.push(`Todos: ${data.todos.error}`);
  }
  if (data.okr.error) {
    errors.push(`OKR: ${data.okr.error}`);
  }
  if (data.habits.error) {
    errors.push(`Habits: ${data.habits.error}`);
  }

  return { valid: errors.length === 0, errors };
}
