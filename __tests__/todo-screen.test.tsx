import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('adds a to-do and ticks it done', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));

  const todo = screen.getByRole('checkbox', { name: 'Buy milk' });
  expect(todo).not.toBeChecked();
  expect(screen.getByText('☐')).toBeOnTheScreen();

  fireEvent.press(todo);

  expect(todo).toBeChecked();
  expect(screen.getByText('☑')).toBeOnTheScreen();
  expect(screen.getByText('Buy milk')).toHaveStyle({ textDecorationLine: 'line-through' });
});

test('edits a to-do, ignoring cancel and empty saves', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy bread');
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), '   ');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy oat milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy oat milk')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk')).toBeNull();
});

function addTodo(title: string) {
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

test('to-dos added in the same millisecond stay independent', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1000);
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  addTodo('Buy milk');
  addTodo('Buy bread');
  addTodo('Buy eggs');

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Buy bread' })).not.toBeChecked();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy bread' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), 'Buy rye');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy rye')).toBeOnTheScreen();
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.getByText('Buy eggs')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy rye' }));
  expect(screen.queryByText('Buy rye')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Buy eggs' })).not.toBeChecked();
});

test('repairs a saved list whose to-dos share an id', async () => {
  await AsyncStorage.setItem(
    'todos',
    JSON.stringify([
      { id: '1', title: 'Buy milk', done: false },
      { id: '1', title: 'Buy bread', done: false },
    ])
  );
  render(<TodoScreen />);

  fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));

  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Buy bread' })).not.toBeChecked();
});

test('counts the to-dos still left', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  expect(screen.queryByText(/left/)).toBeNull();

  addTodo('Buy milk');
  expect(screen.getByText('1 item left')).toBeOnTheScreen();

  addTodo('Buy bread');
  expect(screen.getByText('2 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  expect(screen.getByText('1 item left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  expect(screen.getByText('0 items left')).toBeOnTheScreen();
});

test('filters the list by active and done', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Active' })).not.toBeSelected();
  expect(screen.getByRole('button', { name: 'Done' })).not.toBeSelected();

  addTodo('Buy milk');
  addTodo('Buy bread');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByRole('button', { name: 'Active' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'All' })).not.toBeSelected();
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.queryByText('Buy bread')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
});

test('says so when a filter matches nothing', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  addTodo('Buy milk');

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText('No done to-dos.')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByText('No active to-dos.')).toBeOnTheScreen();
});

test('adds a to-do while Done is selected without changing the filter', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  fireEvent.press(screen.getByRole('button', { name: 'Done' }));

  addTodo('Buy milk');

  expect(screen.getByRole('button', { name: 'Done' })).toBeSelected();
  expect(screen.getByText('1 item left')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked();
});

test('clears completed to-dos and saves the rest', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  addTodo('Buy milk');
  addTodo('Buy bread');
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));

  expect(screen.queryByText('Buy milk')).toBeNull();
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([{ title: 'Buy bread', done: false }]);
});

async function renderWithThree() {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  addTodo('Buy milk');
  addTodo('Buy bread');
  addTodo('Buy eggs');
}

test('undoes a delete at the old position, keeping its done state', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy bread' }));
  expect(screen.queryByText('Buy bread')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  const [, restored] = screen.getAllByRole('checkbox');
  expect(restored).toHaveAccessibleName('Buy bread');
  expect(restored).toBeChecked();
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([
    { title: 'Buy milk', done: false },
    { title: 'Buy bread', done: true },
    { title: 'Buy eggs', done: false },
  ]);
});

test('the undo offer expires after 5 seconds', async () => {
  await renderWithThree();
  jest.useFakeTimers();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  act(() => jest.advanceTimersByTime(4999));
  expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();

  act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('only the latest delete can be undone', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy eggs' }));
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(screen.getByText('Buy eggs')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('clearing completed to-dos dismisses the undo offer', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));

  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('searches by title, ignoring case and outer spaces, within the filter', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), '  BUY B ');
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk')).toBeNull();
  expect(screen.queryByText('Buy eggs')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'buy');
  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.getByText('Buy eggs')).toBeOnTheScreen();
  expect(screen.queryByText('Buy bread')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk')).toBeNull();
});

test('says so when the search matches nothing, and still counts every to-do', async () => {
  await renderWithThree();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'zzz');
  expect(screen.getByText('No matching to-dos.')).toBeOnTheScreen();
  expect(screen.getByText('3 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText('No matching to-dos.')).toBeOnTheScreen();
  expect(screen.queryByText('No done to-dos.')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), '   ');
  expect(screen.getByText('No done to-dos.')).toBeOnTheScreen();
});

test('never saves the search text', async () => {
  await renderWithThree();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'milk');

  const saved = await AsyncStorage.getItem('todos');
  expect(JSON.parse(saved ?? '[]')).toMatchObject([
    { title: 'Buy milk' },
    { title: 'Buy bread' },
    { title: 'Buy eggs' },
  ]);
  expect(await AsyncStorage.getAllKeys()).toEqual(['todos']);
});

function titlesInOrder() {
  return screen.getAllByRole('checkbox').map((box) => box.props.accessibilityLabel);
}

test('moves a to-do up or down and saves the new order', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy eggs up' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy eggs', 'Buy bread']);

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy milk down' }));
  expect(titlesInOrder()).toEqual(['Buy eggs', 'Buy milk', 'Buy bread']);

  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([
    { title: 'Buy eggs' },
    { title: 'Buy milk' },
    { title: 'Buy bread' },
  ]);
});

test('the first to-do cannot move up and the last cannot move down', async () => {
  await renderWithThree();
  expect(screen.getByRole('button', { name: 'Move Buy milk up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy eggs down' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy milk down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy eggs up' })).toBeEnabled();

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy milk up' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy bread down' }));
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy bread down' })).toBeDisabled();
});

test('moving is only offered on the unfiltered, unsearched list', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeOnTheScreen();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'bread');
  expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), '  ');
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeOnTheScreen();
});

async function renderSaved(todos: { title: string; done?: boolean }[]) {
  await AsyncStorage.setItem(
    'todos',
    JSON.stringify(todos.map(({ title, done = false }, i) => ({ id: String(i), title, done })))
  );
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: todos[0].title });
}

test('sorts A to Z ignoring case, keeps equal titles in order, and saves the order', async () => {
  await renderSaved([
    { title: 'cherry' },
    { title: 'Banana' },
    { title: 'Apple' },
    { title: 'date' },
    { title: 'apple' },
  ]);

  fireEvent.press(screen.getByRole('button', { name: 'Sort A to Z' }));

  expect(titlesInOrder()).toEqual(['Apple', 'apple', 'Banana', 'cherry', 'date']);
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved.map((t: { title: string }) => t.title)).toEqual([
    'Apple',
    'apple',
    'Banana',
    'cherry',
    'date',
  ]);
});

test('sorting is only offered on the unfiltered, unsearched list', async () => {
  await renderWithThree();
  expect(screen.getByRole('button', { name: 'Sort A to Z' })).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.queryByRole('button', { name: 'Sort A to Z' })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('button', { name: 'Sort A to Z' })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'buy');
  expect(screen.queryByRole('button', { name: 'Sort A to Z' })).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), '  ');
  expect(screen.getByRole('button', { name: 'Sort A to Z' })).toBeOnTheScreen();
});

test('sorting needs at least two to-dos', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  expect(screen.queryByRole('button', { name: 'Sort A to Z' })).toBeNull();

  addTodo('Buy milk');
  expect(screen.queryByRole('button', { name: 'Sort A to Z' })).toBeNull();

  addTodo('Buy bread');
  expect(screen.getByRole('button', { name: 'Sort A to Z' })).toBeOnTheScreen();
});

test('marks every to-do done, then every to-do not done', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  expect(screen.queryByRole('button', { name: 'Mark all not done' })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked();
  expect(screen.getByText('0 items left')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mark all done' })).toBeNull();
  let saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved.map((t: { done: boolean }) => t.done)).toEqual([true, true, true]);

  fireEvent.press(screen.getByRole('button', { name: 'Mark all not done' }));
  for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked();
  expect(screen.getByText('3 items left')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Mark all done' })).toBeOnTheScreen();
  saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved.map((t: { done: boolean }) => t.done)).toEqual([false, false, false]);
});

test('offers no mark-all button on an empty list', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  expect(screen.queryByRole('button', { name: /^Mark all/ })).toBeNull();
});

test('refuses a duplicate add, keeps the draft, and clears the message on typing', async () => {
  await renderWithThree();
  expect(screen.queryByText('Already on the list.')).toBeNull();

  addTodo('  BUY MILK ');

  expect(screen.getByText('Already on the list.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('What needs doing?').props.value).toBe('  BUY MILK ');
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toHaveLength(3);

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk 2');
  expect(screen.queryByText('Already on the list.')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs', 'Buy milk 2']);
});

test('refuses an edit that duplicates another to-do and stays in editing', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy bread' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), ' buy EGGS');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Already on the list.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Edit Buy bread')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([
    { title: 'Buy milk' },
    { title: 'Buy bread' },
    { title: 'Buy eggs' },
  ]);

  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), 'Buy rye');
  expect(screen.queryByText('Already on the list.')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy rye')).toBeOnTheScreen();
});

test('the edit duplicate message goes away on cancel or when another edit starts', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy bread' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Already on the list.')).toBeNull();
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy bread' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy eggs' }));
  expect(screen.queryByText('Already on the list.')).toBeNull();
  expect(screen.getByLabelText('Edit Buy eggs').props.value).toBe('Buy eggs');
});

test('a to-do can change its own title to a different case', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'BUY MILK');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.queryByText('Already on the list.')).toBeNull();
  expect(screen.getByText('BUY MILK')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/^Edit Buy milk$/)).toBeNull();
});
