import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const STORAGE_KEY = 'todos';
const UNDO_MS = 5000;

type Todo = { id: string; title: string; done: boolean };
type Filter = 'All' | 'Active' | 'Done';

const FILTERS: Filter[] = ['All', 'Active', 'Done'];

// Date.now() alone repeats when two to-dos are added in the same millisecond.
let idCount = 0;
function newId() {
  return `${Date.now()}-${idCount++}`;
}

// Older saves can hold repeated ids from that bug; give each repeat its own id.
function withUniqueIds(todos: Todo[]) {
  const seen = new Set<string>();
  return todos.map((t) => {
    const todo = seen.has(t.id) ? { ...t, id: newId() } : t;
    seen.add(todo.id);
    return todo;
  });
}

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [lastDeleted, setLastDeleted] = useState<{ todo: Todo; index: number } | null>(null);
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setTodos(withUniqueIds(JSON.parse(saved)));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Skip the first render so the empty initial list never overwrites saved to-dos.
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  useEffect(() => {
    if (!lastDeleted) return;
    const timer = setTimeout(() => setLastDeleted(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastDeleted]);

  function addTodo() {
    const title = draft.trim();
    if (!title) return;
    setTodos((current) => [...current, { id: newId(), title, done: false }]);
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
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    setLastDeleted({ todo: todos[index], index });
    setTodos((current) => current.filter((t) => t.id !== id));
  }

  function undoDelete() {
    if (!lastDeleted) return;
    const { todo, index } = lastDeleted;
    setTodos((current) =>
      current.some((t) => t.id === todo.id)
        ? current
        : [...current.slice(0, index), todo, ...current.slice(index)]
    );
    setLastDeleted(null);
  }

  function clearCompleted() {
    setTodos((current) => current.filter((t) => !t.done));
  }

  const itemsLeft = todos.filter((t) => !t.done).length;
  const visibleTodos = todos.filter((t) =>
    filter === 'All' ? true : filter === 'Done' ? t.done : !t.done
  );

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
      <View style={styles.filterRow}>
        {FILTERS.map((name) => (
          <Pressable
            key={name}
            style={[
              styles.filterButton,
              { borderColor: Colors[colorScheme].tint },
              filter === name && { backgroundColor: Colors[colorScheme].tint },
            ]}
            onPress={() => setFilter(name)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === name }}>
            <Text
              style={[
                styles.filterText,
                filter === name && { color: Colors[colorScheme].background },
              ]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={visibleTodos}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(t) => t.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {todos.length === 0 ? 'Nothing to do yet.' : `No ${filter.toLowerCase()} to-dos.`}
          </Text>
        }
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
      {todos.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {itemsLeft} {itemsLeft === 1 ? 'item' : 'items'} left
          </Text>
          {itemsLeft < todos.length && (
            <Pressable onPress={clearCompleted} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Clear completed</Text>
            </Pressable>
          )}
        </View>
      )}
      {lastDeleted && (
        <View style={styles.footer}>
          <Text style={styles.footerText} numberOfLines={1}>
            Deleted {lastDeleted.todo.title}
          </Text>
          <Pressable onPress={undoDelete} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Undo</Text>
          </Pressable>
        </View>
      )}
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  footerText: {
    flexShrink: 1,
    opacity: 0.7,
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
