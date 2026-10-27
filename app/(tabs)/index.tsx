import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as NativeView,
} from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const STORAGE_KEY = 'todos';
const UNDO_MS = 5000;

type Todo = { id: string; title: string; done: boolean };

type Filter = 'All' | 'Active' | 'Done';

const FILTERS: Record<Filter, (t: Todo) => boolean> = {
  All: () => true,
  Active: (t) => !t.done,
  Done: (t) => t.done,
};
const FILTER_NAMES = Object.keys(FILTERS) as Filter[];

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function withUniqueIds(list: Todo[]): Todo[] {
  const seen = new Set<string>();
  return list.map((t) => {
    const todo = seen.has(t.id) ? { ...t, id: newId() } : t;
    seen.add(todo.id);
    return todo;
  });
}

function MoveButton({
  label,
  glyph,
  disabled,
  onPress,
  color,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}>
      <Text style={{ color, fontSize: 16, opacity: disabled ? 0.3 : 1 }}>{glyph}</Text>
    </Pressable>
  );
}

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [lastDeleted, setLastDeleted] = useState<{ todo: Todo; index: number } | null>(null);
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const contentRef = useRef<NativeView>(null);
  const [windowY, setWindowY] = useState(0);

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

  const term = query.trim().toLowerCase();
  const visibleTodos = todos
    .filter(FILTERS[filter])
    .filter((t) => t.title.toLowerCase().includes(term));
  // Only the unfiltered list is the full list, so a swap there is a swap in `todos`.
  const canReorder = filter === 'All' && !term;
  const remaining = todos.filter((t) => !t.done).length;

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

  function moveTodo(id: string, offset: -1 | 1) {
    setTodos((current) => {
      const from = current.findIndex((t) => t.id === id);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
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

  function clearCompleted() {
    setTodos((current) => current.filter((t) => !t.done));
    setLastDeleted(null);
  }

  function deleteTodo(id: string) {
    const index = todos.findIndex((t) => t.id === id);
    setLastDeleted({ todo: todos[index], index });
    setTodos(todos.filter((t) => t.id !== id));
  }

  function undoDelete() {
    if (!lastDeleted) return;
    const { todo, index } = lastDeleted;
    setTodos((current) => [...current.slice(0, index), todo, ...current.slice(index)]);
    setLastDeleted(null);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // KeyboardAvoidingView measures itself relative to its parent, so it needs its window top (the header).
      keyboardVerticalOffset={windowY}>
      <NativeView
        ref={contentRef}
        style={styles.container}
        onLayout={() => contentRef.current?.measureInWindow((_x, y) => setWindowY(y))}>
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
        <TextInput
          style={[styles.input, styles.search, { color: textColor }]}
          placeholder="Search to-dos"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={styles.filters}>
          {FILTER_NAMES.map((name) => {
            const selected = name === filter;
            return (
              <Pressable
                key={name}
                style={[
                  styles.filterButton,
                  selected && { backgroundColor: Colors.light.tint },
                ]}
                onPress={() => setFilter(name)}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text style={selected && styles.filterSelectedText}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
        <FlatList
          data={visibleTodos}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(t) => t.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {term
                ? 'No matching to-dos.'
                : todos.length
                  ? `No ${filter.toLowerCase()} to-dos.`
                  : 'Nothing to do yet.'}
            </Text>
          }
          renderItem={({ item, index }) =>
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
              {canReorder && (
                <View style={styles.moveActions}>
                  <MoveButton
                    label={`Move ${item.title} up`}
                    glyph="↑"
                    disabled={index === 0}
                    onPress={() => moveTodo(item.id, -1)}
                    color={Colors[colorScheme].tint}
                  />
                  <MoveButton
                    label={`Move ${item.title} down`}
                    glyph="↓"
                    disabled={index === todos.length - 1}
                    onPress={() => moveTodo(item.id, 1)}
                    color={Colors[colorScheme].tint}
                  />
                </View>
              )}
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
            <Text>{`${remaining} ${remaining === 1 ? 'item' : 'items'} left`}</Text>
            {remaining < todos.length && (
              <Pressable onPress={clearCompleted} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Clear completed</Text>
              </Pressable>
            )}
          </View>
        )}
        {lastDeleted && (
          <View style={styles.undoBar}>
            <Text>To-do deleted.</Text>
            <Pressable onPress={undoDelete} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Undo</Text>
            </Pressable>
          </View>
        )}
      </NativeView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  search: {
    flex: 0,
    marginBottom: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterSelectedText: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
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
  moveActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 12,
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
