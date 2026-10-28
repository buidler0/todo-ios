import type { Todo } from '@/lib/saved-todos';

export type Summary =
  | { kind: 'empty' }
  | { kind: 'counted'; total: number; done: number; percentDone: number };

export function summarize(todos: readonly Pick<Todo, 'done'>[]): Summary {
  const total = todos.length;
  if (total === 0) return { kind: 'empty' };
  const done = todos.filter((t) => t.done).length;
  return {
    kind: 'counted',
    total,
    done,
    percentDone: Math.round((100 * done) / total),
  };
}

export function summaryLines(summary: Summary): string[] {
  if (summary.kind === 'empty') return ['No to-dos yet'];
  const { total, done, percentDone } = summary;
  return [
    `${total} ${total === 1 ? 'to-do' : 'to-dos'}`,
    `${done} done`,
    `${total - done} left`,
    `${percentDone}% done`,
  ];
}
