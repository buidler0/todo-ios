// A real local calendar day as YYYY-MM-DD. Only this module mints one, and because every
// DueDate is zero-padded, comparing two with < is date order.
export type DueDate = string & { readonly __brand: 'DueDate' };

export type DueParse = { ok: true; due: DueDate | null } | { ok: false };

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function parseDue(text: string): DueParse {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, due: null };
  const match = SHAPE.exec(trimmed);
  if (!match) return { ok: false };
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { ok: false };
  }
  return { ok: true, due: trimmed as DueDate };
}

export function dueFromStorage(value: unknown): DueDate | null {
  if (typeof value !== 'string') return null;
  const parsed = parseDue(value);
  return parsed.ok && parsed.due === value ? parsed.due : null;
}

// Built from local parts: toISOString is UTC and names the wrong day near midnight.
export function localToday(now: Date): DueDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}` as DueDate;
}

export function dueLabel(
  todo: { done: boolean; due: DueDate | null },
  today: DueDate
): { text: string; overdue: boolean } | null {
  if (!todo.due) return null;
  const overdue = !todo.done && todo.due < today;
  return { text: overdue ? 'Overdue' : `Due ${todo.due}`, overdue };
}
