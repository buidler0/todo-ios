import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

const STORAGE_KEY = 'todos';

type Stats = { total: number; done: number };

function readStats(saved: string | null): Stats {
  const list: { done?: boolean }[] = saved ? JSON.parse(saved) : [];
  return { total: list.length, done: list.filter((t) => t.done === true).length };
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);

  // The to-do tab stays mounted, so reload from storage each time this tab is focused.
  useFocusEffect(
    useCallback(() => {
      let current = true;
      AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
        if (current) setStats(readStats(saved));
      });
      return () => {
        current = false;
      };
    }, [])
  );

  if (!stats) return <View style={styles.container} />;

  if (stats.total === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No to-dos yet</Text>
      </View>
    );
  }

  const percent = Math.round((stats.done / stats.total) * 100);
  return (
    <View style={styles.container}>
      <Text style={styles.line}>{`${stats.total} ${stats.total === 1 ? 'to-do' : 'to-dos'}`}</Text>
      <Text style={styles.line}>{`${stats.done} done`}</Text>
      <Text style={styles.line}>{`${stats.total - stats.done} left`}</Text>
      <Text style={styles.line}>{`${percent}% done`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  line: {
    fontSize: 22,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
  },
});
