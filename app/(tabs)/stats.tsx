import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { TODOS_KEY, parseSavedTodos } from '@/lib/saved-todos';
import { summarize, summaryLines } from '@/lib/summary';

export default function StatsScreen() {
  const [lines, setLines] = useState<string[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      AsyncStorage.getItem(TODOS_KEY)
        .then(parseSavedTodos)
        .then((todos) => {
          if (live) setLines(summaryLines(summarize(todos)));
        })
        .catch(() => {
          if (live) setLines(["Couldn't read your saved to-dos"]);
        });
      return () => {
        live = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      {lines?.map((line) => (
        <Text key={line} style={styles.line}>
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
  },
  line: {
    fontSize: 20,
    marginBottom: 8,
  },
});
