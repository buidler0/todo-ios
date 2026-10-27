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

const MAX_TITLE = 60;

type TitleError = 'tooLong' | 'duplicate';

const TITLE_ERROR_TEXT: Record<TitleError, string> = {
  tooLong: 'Keep it to 60 characters.',
  duplicate: 'Already on the list.',
};

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function titleProblem(title: string, others: readonly Todo[]): TitleError | null {
  const codePointCount = [...title].length;
  if (codePointCount > MAX_TITLE) return 'tooLong';
  if (others.some((t) => sameTitle(t.title, title))) return 'duplicate';
  return null;
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function withUniqueIds(list: Todo[]): Todo[] {
  const seen = new Set<string>();
  return list.map((t) => {
    const todo = seen.has(t.id) ? { ...t, id: newId() } : t;
    seen.add(todo.id);
    return todo;
  });
}

type Removed = { todo: Todo; index: number };

type Removal = { kind: 'delete' | 'clear'; removed: Removed[] };

function removeWhere(
  todos: readonly Todo[],
  pred: (t: Todo) => boolean
): { kept: Todo[]; removed: Removed[] } {
  const kept: Todo[] = [];
  const removed: Removed[] = [];
  todos.forEach((todo, index) => (pred(todo) ? removed.push({ todo, index }) : kept.push(todo)));
  return { kept, removed };
}

function restore(current: readonly Todo[], removed: readonly Removed[]): Todo[] {
  const next = [...current];
  for (const { todo, index } of [...removed].sort((x, y) => x.index - y.index)) {
    if (next.some((t) => t.id === todo.id)) continue;
    next.splice(Math.min(index, next.length), 0, todo);
  }
  return next;
}

function undoMessage({ kind, removed }: Removal): string {
  if (kind === 'delete') return 'To-do deleted.';
  return `${removed.length} completed ${removed.length === 1 ? 'to-do' : 'to-dos'} cleared.`;
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
  const [addError, setAddError] = useState<TitleError | null>(null);
  const [editError, setEditError] = useState<TitleError | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
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
    if (!removal) return;
    const timer = setTimeout(() => setRemoval(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removal]);

  function changeDraft(text: string) {
    setDraft(text);
    setAddError(null);
  }

  function changeEditDraft(text: string) {
    setEditDraft(text);
    setEditError(null);
  }

  function addTodo() {
    const title = draft.trim();
    if (!title) return;
    const problem = titleProblem(title, todos);
    if (problem) {
      setAddError(problem);
      return;
    }
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
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  function saveEdit() {
    const title = editDraft.trim();
    // An empty save keeps the old text rather than blanking the to-do.
    if (title) {
      const problem = titleProblem(title, todos.filter((t) => t.id !== editingId));
      if (problem) {
        setEditError(problem);
        return;
      }
      setTodos((current) => current.map((t) => (t.id === editingId ? { ...t, title } : t)));
    }
    cancelEdit();
  }

  function markAll(done: boolean) {
    setTodos((current) => current.map((t) => ({ ...t, done })));
  }

  function remove(kind: Removal['kind'], pred: (t: Todo) => boolean) {
    const { kept, removed } = removeWhere(todos, pred);
    setTodos(kept);
    setRemoval({ kind, removed });
  }

  function clearCompleted() {
    remove('clear', (t) => t.done);
  }

  function deleteTodo(id: string) {
    remove('delete', (t) => t.id === id);
  }

  function undo() {
    if (!removal) return;
    setTodos((current) => restore(current, removal.removed));
    setRemoval(null);
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
          {addError && <Text style={styles.error}>{TITLE_ERROR_TEXT[addError]}</Text>}
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
                {editError && <Text style={styles.error}>{TITLE_ERROR_TEXT[editError]}</Text>}
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
        {removal && (
          <View style={styles.undoBar}>
            <Text>{undoMessage(removal)}</Text>
            <Pressable onPress={undo} accessibilityRole="button" hitSlop={8}>
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
  error: {
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
