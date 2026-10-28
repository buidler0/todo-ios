import { dueFromStorage, dueLabel, localToday, parseDue } from '@/lib/due';

describe('parseDue', () => {
  test.each(['2026-11-03', '2028-02-29', '2000-02-29', ' 2026-11-03 '])('accepts %j', (text) => {
    expect(parseDue(text)).toEqual({ ok: true, due: text.trim() });
  });

  test('an empty field means no date', () => {
    expect(parseDue('')).toEqual({ ok: true, due: null });
    expect(parseDue('   ')).toEqual({ ok: true, due: null });
  });

  test.each([
    '2026-02-30',
    '2027-02-29',
    '2100-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-1-3',
    '20261103',
    '3 Nov',
    '2026-11-03x',
    '0000-01-01',
  ])('refuses %j', (text) => {
    expect(parseDue(text)).toEqual({ ok: false });
  });
});

describe('dueFromStorage', () => {
  test('keeps a valid date', () => {
    expect(dueFromStorage('2026-11-03')).toBe('2026-11-03');
  });

  test.each([undefined, null, 20261103, ' 2026-11-03', '2026-02-30', ''])('drops %j', (value) => {
    expect(dueFromStorage(value)).toBeNull();
  });
});

describe('localToday', () => {
  test('names the local day just after and just before midnight', () => {
    expect(localToday(new Date(2026, 10, 3, 0, 5))).toBe('2026-11-03');
    expect(localToday(new Date(2026, 10, 3, 23, 55))).toBe('2026-11-03');
  });

  test('zero-pads month and day', () => {
    expect(localToday(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('dueLabel', () => {
  const today = localToday(new Date(2026, 10, 3, 12));
  const due = (text: string) => {
    const parsed = parseDue(text);
    if (!parsed.ok) throw new Error(text);
    return parsed.due;
  };

  test.each([
    ['no date', false, '', null],
    ['future', false, '2026-11-04', { text: 'Due 2026-11-04', overdue: false }],
    ['today', false, '2026-11-03', { text: 'Due 2026-11-03', overdue: false }],
    ['past', false, '2026-11-02', { text: 'Overdue', overdue: true }],
    ['past and done', true, '2026-11-02', { text: 'Due 2026-11-02', overdue: false }],
  ])('%s', (_name, done, text, expected) => {
    expect(dueLabel({ done, due: due(text) }, today)).toEqual(expected);
  });
});
