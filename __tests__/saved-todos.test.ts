import { parseSavedTodos } from '@/lib/saved-todos';

test('nothing saved gives an empty list', () => {
  expect(parseSavedTodos(null)).toEqual([]);
  expect(parseSavedTodos('')).toEqual([]);
});

test('a save without pinned reads as unpinned', () => {
  const raw = JSON.stringify([{ id: '1', title: 'Buy milk', done: true }]);
  expect(parseSavedTodos(raw)).toEqual([
    { id: '1', title: 'Buy milk', done: true, pinned: false },
  ]);
});

test('malformed JSON throws, so the to-do screen never saves over a corrupt list', () => {
  expect(() => parseSavedTodos('{oops')).toThrow();
});
