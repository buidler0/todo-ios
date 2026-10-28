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
const FILTER_KEY = 'filter';
const UNDO_MS = 5000;

type Todo = { id: string; title: string; done: boolean; pinned: boolean };

type Undo =
  | { kind: 'delete'; todo: Todo; index: number }
  | { kind: 'markAll'; done: boolean; before: Map<string, boolean> };

type Filter = 'All' | 'Active' | 'Done';

const FILTERS: Record<Filter, (t: Todo) => boolean> = {
  All: () => true,
  Active: (t) => !t.done,
  Done: (t) => t.done,
};
const FILTER_NAMES = Object.keys(FILTERS) as Filter[];
const isFilter = (value: string | null | undefined): value is Filter =>
  FILTER_NAMES.some((name) => name === value);

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function withUniqueIds(list: Todo[]): Todo[] {
  const seen = new Set<string>();
  return list.map((t) => {
    const todo = seen.has(t.id) ? { ...t, id: newId() } : t;
    seen.add(todo.id);
    return todo;
  });
}

const pinnedFirst = (list: Todo[]) => [
  ...list.filter((t) => t.pinned),
  ...list.filter((t) => !t.pinned),
];

function groupNeighbour(list: Todo[], id: string, offset: -1 | 1): number {
  const from = list.findIndex((t) => t.id === id);
  if (from < 0) return -1;
  for (let i = from + offset; i >= 0 && i < list.length; i += offset) {
    if (list[i].pinned === list[from].pinned) return i;
  }
  return -1;
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
  const [duplicateIn, setDuplicateIn] = useState<'add' | 'edit' | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const contentRef = useRef<NativeView>(null);
  const [windowY, setWindowY] = useState(0);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, FILTER_KEY]).then((entries) => {
      const stored = new Map(entries);
      const saved = stored.get(STORAGE_KEY);
      const savedFilter = stored.get(FILTER_KEY);
      if (isFilter(savedFilter)) setFilter(savedFilter);
      if (saved) {
        const savedTodos: (Omit<Todo, 'pinned'> & { pinned?: boolean })[] = JSON.parse(saved);
        const loadedTodos = savedTodos.map((t) => ({ ...t, pinned: t.pinned === true }));
        // Keep to-dos added while the load was in flight, unless they repeat a saved title.
        setTodos((early) =>
          withUniqueIds([
            ...loadedTodos,
            ...early.filter((t) => !loadedTodos.some((s) => sameTitle(s.title, t.title))),
          ])
        );
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Skip the first render so the empty initial list never overwrites saved to-dos.
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  const term = query.trim().toLowerCase();
  const visibleTodos = pinnedFirst(todos)
    .filter(FILTERS[filter])
    .filter((t) => t.title.toLowerCase().includes(term));
  // Only the unfiltered list is the full list, so a swap there is a swap in `todos`.
  const canReorder = filter === 'All' && !term;
  const remaining = todos.filter((t) => !t.done).length;

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  function selectFilter(name: Filter) {
    setFilter(name);
    AsyncStorage.setItem(FILTER_KEY, name);
  }

  function clearDuplicate(source: 'add' | 'edit') {
    setDuplicateIn((current) => (current === source ? null : current));
  }

  function changeDraft(text: string) {
    setDraft(text);
    clearDuplicate('add');
  }

  function changeEditDraft(text: string) {
    setEditDraft(text);
    clearDuplicate('edit');
  }

  function addTodo() {
    const title = draft.trim();
    if (!title) return;
    if (todos.some((t) => sameTitle(t.title, title))) {
      setDuplicateIn('add');
      return;
    }
    setTodos((current) => [...current, { id: newId(), title, done: false, pinned: false }]);
    setDraft('');
  }

  function toggleTodo(id: string) {
    setTodos((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function togglePin(id: string) {
    setTodos((current) => current.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
  }

  function moveTodo(id: string, offset: -1 | 1) {
    setTodos((current) => {
      const to = groupNeighbour(current, id, offset);
      if (to < 0) return current;
      const from = current.findIndex((t) => t.id === id);
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditDraft(todo.title);
    clearDuplicate('edit');
  }

  function cancelEdit() {
    setEditingId(null);
    clearDuplicate('edit');
  }

  function saveEdit() {
    if (editingId === null) return;
    const title = editDraft.trim();
    if (!title) {
      deleteTodo(editingId);
      cancelEdit();
      return;
    }
    if (todos.some((t) => t.id !== editingId && sameTitle(t.title, title))) {
      setDuplicateIn('edit');
      return;
    }
    setTodos((current) => current.map((t) => (t.id === editingId ? { ...t, title } : t)));
    cancelEdit();
  }

  function markAll(done: boolean) {
    setUndo({
      kind: 'markAll',
      done,
      before: new Map(todos.map((t) => [t.id, t.done])),
    });
    setTodos(todos.map((t) => ({ ...t, done })));
  }

  function clearCompleted() {
    setTodos((current) => current.filter((t) => !t.done));
    setUndo(null);
  }

  function deleteTodo(id: string) {
    const index = todos.findIndex((t) => t.id === id);
    if (index < 0) return;
    setUndo({ kind: 'delete', todo: todos[index], index });
    setTodos(todos.filter((t) => t.id !== id));
  }

  function undoLast() {
    if (!undo) return;
    if (undo.kind === 'delete') {
      const { todo, index } = undo;
      setTodos((current) => [...current.slice(0, index), todo, ...current.slice(index)]);
    } else {
      const { before } = undo;
      setTodos((current) =>
        current.map((t) => {
          const previous = before.get(t.id);
          return previous === undefined ? t : { ...t, done: previous };
        })
      );
    }
    setUndo(null);
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
        <View style={styles.addSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="What needs doing?"
              placeholderTextColor="#999"
              value={draft}
              onChangeText={changeDraft}
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
          {duplicateIn === 'add' && <Text style={styles.duplicate}>Already on the list.</Text>}
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
                onPress={() => selectFilter(name)}
                disabled={!loaded}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !loaded }}>
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
          renderItem={({ item }) =>
            item.id === editingId ? (
              <View>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { color: textColor }]}
                    value={editDraft}
                    onChangeText={changeEditDraft}
                    onSubmitEditing={saveEdit}
                    returnKeyType="done"
                    autoFocus
                    accessibilityLabel={`Edit ${item.title}`}
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={saveEdit} accessibilityRole="button" hitSlop={8}>
                      <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Save</Text>
                    </Pressable>
                    <Pressable onPress={cancelEdit} accessibilityRole="button" hitSlop={8}>
                      <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
                {duplicateIn === 'edit' && <Text style={styles.duplicate}>Already on the list.</Text>}
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
                    disabled={groupNeighbour(todos, item.id, -1) < 0}
                    onPress={() => moveTodo(item.id, -1)}
                    color={Colors[colorScheme].tint}
                  />
                  <MoveButton
                    label={`Move ${item.title} down`}
                    glyph="↓"
                    disabled={groupNeighbour(todos, item.id, 1) < 0}
                    onPress={() => moveTodo(item.id, 1)}
                    color={Colors[colorScheme].tint}
                  />
                </View>
              )}
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => togglePin(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.pinned ? 'Unpin' : 'Pin'} ${item.title}`}
                  hitSlop={8}>
                  <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteTodo(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.title}`}
                  hitSlop={8}>
                  <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Delete</Text>
                </Pressable>
              </View>
            </View>
            )
          }
        />
        {todos.length > 0 && (
          <View style={styles.footer}>
            <Text>{`${remaining} ${remaining === 1 ? 'item' : 'items'} left`}</Text>
            <View style={styles.footerActions}>
              <Pressable
                onPress={() => markAll(remaining > 0)}
                accessibilityRole="button"
                hitSlop={8}>
                <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>
                  {remaining > 0 ? 'Mark all done' : 'Mark all not done'}
                </Text>
              </Pressable>
              {remaining < todos.length && (
                <Pressable onPress={clearCompleted} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: Colors[colorScheme].tint, fontSize: 16 }}>Clear completed</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        {undo && (
          <View style={styles.undoBar}>
            <Text>
              {undo.kind === 'delete'
                ? 'To-do deleted.'
                : undo.done
                  ? 'Marked all done.'
                  : 'Marked all not done.'}
            </Text>
            <Pressable onPress={undoLast} accessibilityRole="button" hitSlop={8}>
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
  addSection: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  duplicate: {
    color: '#c0392b',
    marginTop: 6,
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
  footerActions: {
    flexDirection: 'row',
    gap: 16,
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
  rowActions: {
    flexDirection: 'row',
    gap: 12,
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
