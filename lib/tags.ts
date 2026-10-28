export type Tag = { readonly key: string; readonly label: string };

const TRAILING_PUNCTUATION = /[\p{P}\p{S}]+$/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

function tagsIn(title: string): Tag[] {
  const tags: Tag[] = [];
  for (const word of title.split(/\s+/)) {
    if (!word.startsWith('#')) continue;
    const label = word.replace(TRAILING_PUNCTUATION, '');
    if (LETTER_OR_NUMBER.test(label.slice(1))) tags.push({ key: label.toLowerCase(), label });
  }
  return tags;
}

export function tagsOf(list: readonly { title: string }[]): Tag[] {
  const byKey = new Map<string, Tag>();
  for (const { title } of list) {
    for (const tag of tagsIn(title)) if (!byKey.has(tag.key)) byKey.set(tag.key, tag);
  }
  return [...byKey.values()];
}

export function hasTag(title: string, key: string): boolean {
  return tagsIn(title).some((tag) => tag.key === key);
}
