import { dueLabel, isOverdue, localToday, parseDueInput, readDue, type DueDate } from '@/utils/dueDate';

const d = (s: string) => s as DueDate;

describe('parseDueInput', () => {
  test.each([
    ['2026-11-03', '2026-11-03'],
    ['2028-02-29', '2028-02-29'],
    ['0050-01-01', '0050-01-01'],
    ['2026-12-31', '2026-12-31'],
    ['  2026-11-03  ', '2026-11-03'],
    ['', undefined],
    ['   ', undefined],
  ])('accepts %j', (text, due) => {
    expect(parseDueInput(text)).toEqual({ ok: true, due });
  });

  test.each([
    '2026-02-29',
    '2026-02-30',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-01-00',
    '2026-1-5',
    '26-01-05',
    '2026/01/05',
    '2026-01-05x',
    'tomorrow',
  ])('refuses %j', (text) => {
    expect(parseDueInput(text)).toEqual({ ok: false });
  });
});

describe('readDue', () => {
  test('keeps a valid stored date', () => {
    expect(readDue('2026-11-03')).toBe('2026-11-03');
  });

  test.each([[undefined], [null], [20261103], [{}], [''], ['2026-02-30'], ['soon'], [' 2026-11-03']])(
    'drops %j',
    (raw) => {
      expect(readDue(raw)).toBeUndefined();
    }
  );
});

describe('localToday', () => {
  test('zero-pads month and day', () => {
    expect(localToday(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('uses the local calendar day, not UTC', () => {
    expect(localToday(new Date(2026, 9, 28, 23, 59))).toBe('2026-10-28');
    expect(localToday(new Date(2026, 9, 28, 0, 1))).toBe('2026-10-28');
  });
});

describe('isOverdue', () => {
  const today = d('2026-10-28');

  test.each([
    [{ due: d('2026-10-27'), done: false }, true],
    [{ due: today, done: false }, false],
    [{ due: d('2026-10-29'), done: false }, false],
    [{ due: d('2026-10-27'), done: true }, false],
    [{ done: false }, false],
  ])('%j -> %j', (todo, overdue) => {
    expect(isOverdue(todo, today)).toBe(overdue);
  });
});

describe('dueLabel', () => {
  const today = d('2026-10-28');

  test.each([
    [{ due: d('2026-11-03'), done: false }, 'Due 2026-11-03'],
    [{ due: today, done: false }, 'Due 2026-10-28'],
    [{ due: d('2026-10-27'), done: false }, 'Overdue'],
    [{ due: d('2026-10-27'), done: true }, 'Due 2026-10-27'],
    [{ due: d('2026-11-03'), done: true }, 'Due 2026-11-03'],
    [{ done: false }, null],
    [{ done: true }, null],
  ])('%j -> %j', (todo, label) => {
    expect(dueLabel(todo, today)).toBe(label);
  });

  test('compares across month and year boundaries', () => {
    expect(dueLabel({ due: d('2026-09-30'), done: false }, d('2026-10-01'))).toBe('Overdue');
    expect(dueLabel({ due: d('2025-12-31'), done: false }, d('2026-01-01'))).toBe('Overdue');
  });
});
