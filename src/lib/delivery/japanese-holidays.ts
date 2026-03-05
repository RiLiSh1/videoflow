/**
 * 日本の祝日判定ユーティリティ
 *
 * 固定祝日 + 振替休日 + ハッピーマンデー + 春分/秋分を計算
 */

// 固定祝日（月, 日）
const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1],   // 元日
  [2, 11],  // 建国記念の日
  [2, 23],  // 天皇誕生日
  [4, 29],  // 昭和の日
  [5, 3],   // 憲法記念日
  [5, 4],   // みどりの日
  [5, 5],   // こどもの日
  [8, 11],  // 山の日
  [11, 3],  // 文化の日
  [11, 23], // 勤労感謝の日
];

// ハッピーマンデー（月, 第n月曜日）
const HAPPY_MONDAY: [number, number][] = [
  [1, 2],  // 成人の日（1月第2月曜日）
  [7, 3],  // 海の日（7月第3月曜日）
  [9, 3],  // 敬老の日（9月第3月曜日）
  [10, 2], // スポーツの日（10月第2月曜日）
];

/**
 * 春分の日を計算（近似式）
 */
function getVernalEquinox(year: number): number {
  if (year >= 2000 && year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  // 2100年以降の近似
  return Math.floor(21.851 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/**
 * 秋分の日を計算（近似式）
 */
function getAutumnalEquinox(year: number): number {
  if (year >= 2000 && year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return Math.floor(24.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/**
 * 第n月曜日の日付を取得
 */
function getNthMonday(year: number, month: number, n: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  // 最初の月曜日
  const firstMonday = firstDay <= 1 ? 2 - firstDay : 9 - firstDay;
  return firstMonday + (n - 1) * 7;
}

/**
 * 指定年の全祝日を取得
 */
export function getHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  function addDate(month: number, day: number) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    holidays.add(key);
  }

  // 固定祝日
  for (const [m, d] of FIXED_HOLIDAYS) {
    addDate(m, d);
  }

  // ハッピーマンデー
  for (const [m, n] of HAPPY_MONDAY) {
    addDate(m, getNthMonday(year, m, n));
  }

  // 春分の日・秋分の日
  addDate(3, getVernalEquinox(year));
  addDate(9, getAutumnalEquinox(year));

  // 振替休日：祝日が日曜日の場合、翌月曜日が振替休日
  const baseHolidays = Array.from(holidays);
  for (const dateStr of baseHolidays) {
    const d = new Date(dateStr + "T00:00:00");
    if (d.getDay() === 0) {
      // 翌日（月曜日）を追加。もし翌日も祝日ならさらに翌日
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      while (holidays.has(formatDate(next))) {
        next.setDate(next.getDate() + 1);
      }
      holidays.add(formatDate(next));
    }
  }

  // 国民の休日：祝日に挟まれた平日
  const sortedDates = Array.from(holidays).sort();
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const curr = new Date(sortedDates[i] + "T00:00:00");
    const next = new Date(sortedDates[i + 1] + "T00:00:00");
    const diff = (next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 2) {
      const between = new Date(curr);
      between.setDate(between.getDate() + 1);
      if (between.getDay() !== 0 && between.getDay() !== 6) {
        holidays.add(formatDate(between));
      }
    }
  }

  return holidays;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 指定日が祝日かどうか
 */
export function isJapaneseHoliday(date: Date): boolean {
  const holidays = getHolidays(date.getFullYear());
  return holidays.has(formatDate(date));
}

/**
 * 指定日が営業日（平日かつ祝日でない）かどうか
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isJapaneseHoliday(date);
}

/**
 * 指定週の第1営業日を取得
 * weekStart は月曜日を想定
 */
export function getFirstBusinessDayOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  // 月曜日から開始して最初の営業日を探す
  for (let i = 0; i < 7; i++) {
    if (isBusinessDay(d)) return d;
    d.setDate(d.getDate() + 1);
  }
  // フォールバック（ありえないが安全のため）
  return weekStart;
}
