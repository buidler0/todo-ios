export type DueDate = string & { readonly __brand: 'DueDate' };

export type DueInput = { ok: true; due: DueDate | undefined } | { ok: false };

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width: number) => String(n).padStart(width, '0');

export function parseDueInput(text: string): DueInput {
  const value = text.trim();
  if (value === '') return { ok: true, due: undefined };
  const match = SHAPE.exec(value);
  if (!match) return { ok: false };
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Date rolls 2026-02-30 over to March, so a real day is one that survives the round trip.
  // setUTCFullYear, unlike Date.UTC, does not turn years 0-99 into 1900-1999.
  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  const real =
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return real ? { ok: true, due: value as DueDate } : { ok: false };
}

export function readDue(raw: unknown): DueDate | undefined {
  if (typeof raw !== 'string') return undefined;
  const parsed = parseDueInput(raw);
  return parsed.ok && parsed.due === raw ? parsed.due : undefined;
}

export function localToday(now: Date = new Date()): DueDate {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}` as DueDate;
}

export function isOverdue(todo: { due?: DueDate; done: boolean }, today: DueDate): boolean {
  return todo.due !== undefined && !todo.done && todo.due < today;
}

export function dueLabel(todo: { due?: DueDate; done: boolean }, today: DueDate): string | null {
  if (!todo.due) return null;
  return isOverdue(todo, today) ? 'Overdue' : `Due ${todo.due}`;
}
