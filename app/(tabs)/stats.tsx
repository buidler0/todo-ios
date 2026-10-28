import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { statLines, statsFromSaved, TODOS_KEY, type TodoStats } from '@/lib/todo-stats';

type SavedStats =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly stats: TodoStats }
  | { readonly status: 'unreadable' };

// Tabs stay mounted once opened, so a mount-only read would go stale.
function useSavedStats(): SavedStats {
  const [saved, setSaved] = useState<SavedStats>({ status: 'loading' });
  useFocusEffect(
    useCallback(() => {
      let current = true;
      AsyncStorage.getItem(TODOS_KEY)
        .then((raw): SavedStats => ({ status: 'ready', stats: statsFromSaved(raw) }))
        .catch((): SavedStats => ({ status: 'unreadable' }))
        .then((next) => {
          if (current) setSaved(next);
        });
      return () => {
        current = false;
      };
    }, [])
  );
  return saved;
}

export default function StatsScreen() {
  const saved = useSavedStats();
  const lines =
    saved.status === 'ready'
      ? statLines(saved.stats)
      : saved.status === 'unreadable'
        ? ["Couldn't read your to-dos."]
        : [];
  return (
    <View style={styles.container}>
      {lines.map((line, i) => (
        <Text key={line} style={i === 0 ? styles.headline : styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: '600',
  },
  line: {
    fontSize: 17,
  },
});
