export type TodoStats = { readonly total: number; readonly done: number };

export const TODOS_KEY = 'todos';

export function statsFromSaved(raw: string | null): TodoStats {
  const saved: { done: boolean }[] = raw === null ? [] : JSON.parse(raw);
  return { total: saved.length, done: saved.filter((todo) => todo.done === true).length };
}

const percentDone = ({ total, done }: TodoStats) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

export function statLines(stats: TodoStats): string[] {
  const { total, done } = stats;
  if (total === 0) return ['No to-dos yet'];
  return [
    total === 1 ? '1 to-do' : `${total} to-dos`,
    `${done} done`,
    `${total - done} left`,
    `${percentDone(stats)}% done`,
  ];
}
