import { summarize, summaryLines } from '@/lib/summary';

function lines(total: number, done: number) {
  const todos = Array.from({ length: total }, (_, i) => ({ done: i < done }));
  return summaryLines(summarize(todos));
}

test.each([
  [5, 2, ['5 to-dos', '2 done', '3 left', '40% done']],
  [1, 0, ['1 to-do', '0 done', '1 left', '0% done']],
  [3, 3, ['3 to-dos', '3 done', '0 left', '100% done']],
  [3, 1, ['3 to-dos', '1 done', '2 left', '33% done']],
  [3, 2, ['3 to-dos', '2 done', '1 left', '67% done']],
])('%i to-dos with %i done', (total, done, expected) => {
  expect(lines(total, done)).toEqual(expected);
});

test('an empty list says so and shows no percent', () => {
  expect(summaryLines(summarize([]))).toEqual(['No to-dos yet']);
});
