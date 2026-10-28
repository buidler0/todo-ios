import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

export type TagFilter = {
  readonly tags: readonly string[];
  readonly selected: string | null;
  readonly toggle: (tag: string) => void;
  readonly matches: (todo: { readonly title: string }) => boolean;
};

const keyOf = (tag: string) => tag.toLowerCase();

const TRAILING_PUNCTUATION = /[.,;:!?)'"’”]+$/;
const HASH_THEN_NAME = /^#[^#]/;

function tagsIn(title: string): string[] {
  return title
    .split(/\s+/)
    .map((word) => word.replace(TRAILING_PUNCTUATION, ''))
    .filter((word) => HASH_THEN_NAME.test(word));
}

export function useTagFilter(todos: readonly { readonly title: string }[]): TagFilter {
  const [picked, setPicked] = useState<string | null>(null);

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const todo of todos) {
    for (const tag of tagsIn(todo.title)) {
      if (!seen.has(keyOf(tag))) {
        seen.add(keyOf(tag));
        tags.push(tag);
      }
    }
  }

  const selected = tags.find((tag) => keyOf(tag) === picked) ?? null;
  // Forget a tag once no title has it, so a later to-do with that tag doesn't narrow the list by surprise.
  if (picked !== null && selected === null) setPicked(null);

  return {
    tags,
    selected,
    toggle: (tag) => setPicked(keyOf(tag) === picked ? null : keyOf(tag)),
    matches: (todo) => selected === null || tagsIn(todo.title).some((tag) => keyOf(tag) === picked),
  };
}

export function TagBar({ tagFilter, disabled }: { tagFilter: TagFilter; disabled: boolean }) {
  if (tagFilter.tags.length === 0) return null;
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}>
      {tagFilter.tags.map((tag) => {
        const selected = tag === tagFilter.selected;
        return (
          <Pressable
            key={keyOf(tag)}
            style={[styles.tagButton, selected && { backgroundColor: Colors.light.tint }]}
            onPress={() => tagFilter.toggle(tag)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Tag ${tag}`}
            accessibilityState={{ selected, disabled }}>
            <Text style={selected && styles.tagSelectedText}>{tag}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 8,
  },
  content: {
    gap: 8,
  },
  tagButton: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagSelectedText: {
    color: '#fff',
  },
});
