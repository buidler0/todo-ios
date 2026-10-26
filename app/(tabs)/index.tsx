import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const STORAGE_KEY = 'todos';

type Todo = { id: string; title: string; done: boolean };

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setTodos(JSON.parse(saved));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Skip the first render so the empty initial list never overwrites saved to-dos.
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  function addTodo() {
    const title = draft.trim();
    if (!title) return;
    setTodos((current) => [...current, { id: Date.now().toString(), title, done: false }]);
    setDraft('');
  }

  function toggleTodo(id: string) {
    setTodos((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id: string) {
    setTodos((current) => current.filter((t) => t.id !== id));
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="What needs doing?"
          placeholderTextColor="#999"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTodo}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, { backgroundColor: Colors.light.tint }]}
          onPress={addTodo}
          accessibilityRole="button">
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing to do yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => toggleTodo(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done }}
              accessibilityLabel={item.title}>
              <Text style={styles.check}>{item.done ? '☑' : '☐'}</Text>
              <Text style={[styles.title, item.done && styles.done]}>{item.title}</Text>
            </Pressable>
            <Pressable
              onPress={() => deleteTodo(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              hitSlop={8}>
              <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    fontSize: 22,
  },
  title: {
    fontSize: 17,
  },
  done: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
