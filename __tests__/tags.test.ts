import { hasTag, tagsOf } from '@/lib/tags';

const titles = (...list: string[]) => list.map((title) => ({ title }));

test.each([
  ['a #b, #B #c.', ['#b', '#c']],
  ['#shop. and #shop,', ['#shop']],
  ['#', []],
  ['#,', []],
  ['x#y', []],
  ['Learn C#', []],
  ['##x', ['##x']],
  ['#shop,', ['#shop']],
  ['#c++', ['#c']],
  ["#don't", ["#don't"]],
  ['#shop.com', ['#shop.com']],
  ['#a-', ['#a']],
  ['#a#b', ['#a#b']],
  ['#हिंदी', ['#हिंदी']],
  ['#cafe\u0301', ['#cafe\u0301']],
  ['#-', []],
  ['#_', []],
  ['#café', ['#café']],
  ['#a-b_c', ['#a-b_c']],
  ['#2024 plan', ['#2024']],
  ['no tags here', []],
])('reads the tags in %j', (title, keys) => {
  expect(tagsOf(titles(title)).map((tag) => tag.key)).toEqual(keys);
});

test('lists each tag once, in first-seen order across titles', () => {
  const tags = tagsOf(titles('Buy milk #shop', 'Call mum #home', 'Buy eggs #shop #errand'));
  expect(tags.map((tag) => tag.key)).toEqual(['#shop', '#home', '#errand']);
});

test('a case-folded duplicate is one tag that keeps the first spelling', () => {
  const tags = tagsOf(titles('Buy milk #Shop', 'Buy eggs #SHOP', 'Pay #shop'));
  expect(tags).toEqual([{ key: '#shop', label: '#Shop' }]);
});

test('finds a tag in a title by key, folding case', () => {
  expect(hasTag('Buy milk #Shop,', '#shop')).toBe(true);
  expect(hasTag('Buy milk #shopping', '#shop')).toBe(false);
  expect(hasTag('Learn C#', '#')).toBe(false);
});
