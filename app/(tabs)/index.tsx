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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
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

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditDraft(todo.title);
  }

  function saveEdit() {
    const title = editDraft.trim();
    // An empty save keeps the old text rather than blanking the to-do.
    if (title) {
      setTodos((current) => current.map((t) => (t.id === editingId ? { ...t, title } : t)));
    }
    setEditingId(null);
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
        keyboardShouldPersistTaps="handled"
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing to do yet.</Text>}
        renderItem={({ item }) =>
          item.id === editingId ? (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={editDraft}
                onChangeText={setEditDraft}
                onSubmitEditing={saveEdit}
                returnKeyType="done"
                autoFocus
                accessibilityLabel={`Edit ${item.title}`}
              />
              <View style={styles.editActions}>
                <Pressable onPress={saveEdit} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Save</Text>
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Pressable
                onPress={() => toggleTodo(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done }}
                accessibilityLabel={item.title}
                hitSlop={8}>
                <Text style={styles.check}>{item.done ? '☑' : '☐'}</Text>
              </Pressable>
              <Pressable
                style={styles.titlePress}
                onPress={() => startEditing(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title}`}>
                <Text style={[styles.title, item.done && styles.done]}>{item.title}</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => deleteTodo(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              hitSlop={8}>
              <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Delete</Text>
            </Pressable>
          </View>
          )
        }
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
  titlePress: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 12,
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
