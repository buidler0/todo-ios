import { statLines, statsFromSaved } from '@/lib/todo-stats';

const list = (...done: unknown[]) => JSON.stringify(done.map((d) => ({ title: 't', done: d })));
const lines = (raw: string | null) => statLines(statsFromSaved(raw));

test('shows the counts for a saved list', () => {
  expect(lines(list(true, true, false, false, false))).toEqual([
    '5 to-dos',
    '2 done',
    '3 left',
    '40% done',
  ]);
});

test.each([null, '[]'])('says there are no to-dos for %p', (raw) => {
  expect(lines(raw)).toEqual(['No to-dos yet']);
});

test('uses the singular for one to-do', () => {
  expect(lines(list(false))).toEqual(['1 to-do', '0 done', '1 left', '0% done']);
  expect(lines(list(true))).toEqual(['1 to-do', '1 done', '0 left', '100% done']);
});

test('shows 100% when everything is done', () => {
  expect(lines(list(true, true))).toEqual(['2 to-dos', '2 done', '0 left', '100% done']);
});

test.each([
  [1, 3, '33% done'],
  [2, 3, '67% done'],
  [1, 200, '1% done'],
  [199, 200, '100% done'],
])('rounds %i of %i to a whole percent', (done, total, expected) => {
  const flags = Array.from({ length: total }, (_, i) => i < done);
  expect(lines(list(...flags))[3]).toBe(expected);
});

test('ignores fields it does not read', () => {
  const raw = JSON.stringify([
    { title: 'a', done: true, dueDate: '2026-11-01', tags: ['x'] },
    { title: 'b', done: false, pinned: true },
    { title: 'c', done: true },
  ]);
  expect(lines(raw)).toEqual(['3 to-dos', '2 done', '1 left', '67% done']);
});
