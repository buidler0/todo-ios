import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { TODOS_KEY } from '@/constants/Storage';

type Counts = { total: number; done: number };

export default function StatsScreen() {
  const [counts, setCounts] = useState<Counts | null>(null);

  // Re-read the saved list each time the tab is shown, since the To-dos tab may have changed it.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(TODOS_KEY).then((saved) => {
        const todos: { done: boolean }[] = saved ? JSON.parse(saved) : [];
        if (active) setCounts({ total: todos.length, done: todos.filter((t) => t.done).length });
      });
      return () => {
        active = false;
      };
    }, [])
  );

  if (!counts) return <View style={styles.container} />;

  const { total, done } = counts;
  return (
    <View style={styles.container}>
      {total === 0 ? (
        <Text style={styles.empty}>No to-dos yet</Text>
      ) : (
        <>
          <Text style={styles.headline}>{`${total} ${total === 1 ? 'to-do' : 'to-dos'}`}</Text>
          <Text style={styles.stat}>{`${done} done`}</Text>
          <Text style={styles.stat}>{`${total - done} left`}</Text>
          <Text style={styles.stat}>{`${Math.round((done / total) * 100)}% done`}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
  },
  headline: {
    fontSize: 28,
    fontWeight: '600',
  },
  stat: {
    fontSize: 20,
  },
});
