import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export const tagKey = (tag: string) => tag.toLowerCase();

export function titleTags(title: string): string[] {
  return title.split(/\s+/).filter((word) => word.length > 1 && word.startsWith('#'));
}

/** Every tag across the titles once, in first-seen order, spelled as first seen. */
export function listTags(titles: string[]): string[] {
  const seen = new Map<string, string>();
  for (const tag of titles.flatMap(titleTags)) {
    if (!seen.has(tagKey(tag))) seen.set(tagKey(tag), tag);
  }
  return [...seen.values()];
}

export function TagFilter({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.tags}>
      {tags.map((tag) => {
        const isSelected = selected !== null && tagKey(tag) === tagKey(selected);
        return (
          <Pressable
            key={tagKey(tag)}
            style={[styles.tagButton, isSelected && { backgroundColor: Colors.light.tint }]}
            onPress={() => onSelect(isSelected ? null : tag)}
            accessibilityRole="button"
            accessibilityLabel={`Tag ${tag}`}
            accessibilityState={{ selected: isSelected }}>
            <Text style={isSelected && styles.tagSelectedText}>{tag}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
