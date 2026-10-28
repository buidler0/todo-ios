export const TODOS_KEY = 'todos';

export type Todo = { id: string; title: string; done: boolean; pinned: boolean };

export function parseSavedTodos(raw: string | null): Todo[] {
  if (!raw) return [];
  const stored: (Omit<Todo, 'pinned'> & { pinned?: boolean })[] = JSON.parse(raw);
  return stored.map((t) => ({ ...t, pinned: t.pinned === true }));
}
