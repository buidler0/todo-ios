import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AppState } from 'react-native';

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

test('edits a to-do, ignoring cancel', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy bread');
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
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
  await screen.findByRole('button', { name: 'Done', disabled: false });
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

test('pins and unpins a to-do, and the button name follows', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy bread' }));

  expect(screen.queryByRole('button', { name: 'Pin Buy bread' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Unpin Buy bread' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Pin Buy milk' })).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Unpin Buy bread' }));
  expect(screen.getByRole('button', { name: 'Pin Buy bread' })).toBeOnTheScreen();
});

test('pinned to-dos show first in every view, each group in list order', async () => {
  await renderWithThree();
  addTodo('Buy jam');
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy eggs' }));
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));

  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy eggs', 'Buy bread', 'Buy jam']);

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(titlesInOrder()).toEqual(['Buy eggs', 'Buy jam']);

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread']);

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'buy');
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy eggs', 'Buy bread', 'Buy jam']);

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'JAM');
  expect(titlesInOrder()).toEqual(['Buy jam']);
});

test('pins can be changed in a filtered view', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('button', { name: 'Active' }));

  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy eggs' }));

  expect(titlesInOrder()).toEqual(['Buy eggs', 'Buy milk', 'Buy bread']);
});

test('saves pins and shows them again after a relaunch', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy eggs' }));
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([
    { title: 'Buy milk', pinned: false },
    { title: 'Buy bread', pinned: false },
    { title: 'Buy eggs', pinned: true },
  ]);

  screen.unmount();
  render(<TodoScreen />);
  await screen.findByRole('button', { name: 'Unpin Buy eggs' });

  expect(titlesInOrder()).toEqual(['Buy eggs', 'Buy milk', 'Buy bread']);
});

test('a saved list without pins loads unpinned', async () => {
  await AsyncStorage.setItem(
    'todos',
    JSON.stringify([
      { id: '1', title: 'Buy milk', done: false },
      { id: '2', title: 'Buy bread', done: true },
    ])
  );
  render(<TodoScreen />);

  await screen.findByRole('button', { name: 'Pin Buy milk' });
  expect(screen.getByRole('button', { name: 'Pin Buy bread' })).toBeOnTheScreen();
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread']);
});

test('move buttons swap only within a pin group', async () => {
  await renderWithThree();
  addTodo('Buy jam');
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy bread' }));
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy jam' }));
  expect(titlesInOrder()).toEqual(['Buy bread', 'Buy jam', 'Buy milk', 'Buy eggs']);

  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy bread down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy jam up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy jam down' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy milk up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy milk down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy eggs up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy eggs down' })).toBeDisabled();

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy eggs up' }));
  expect(titlesInOrder()).toEqual(['Buy bread', 'Buy jam', 'Buy eggs', 'Buy milk']);

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy bread down' }));
  expect(titlesInOrder()).toEqual(['Buy jam', 'Buy bread', 'Buy eggs', 'Buy milk']);
});

test('unpinning puts a to-do back in its old place', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy eggs' }));
  expect(titlesInOrder()).toEqual(['Buy eggs', 'Buy milk', 'Buy bread']);

  fireEvent.press(screen.getByRole('button', { name: 'Unpin Buy eggs' }));

  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);
});

test('undoing a delete brings a pinned to-do back pinned, in the pinned group', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('button', { name: 'Pin Buy bread' }));

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy bread' }));
  expect(screen.queryByText('Buy bread')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(screen.getByRole('button', { name: 'Unpin Buy bread' })).toBeOnTheScreen();
  expect(titlesInOrder()).toEqual(['Buy bread', 'Buy milk', 'Buy eggs']);
});

function checkedStates() {
  return screen.getAllByRole('checkbox').map((box) => box.props.accessibilityState.checked);
}

test('undoes mark all done, giving each to-do its previous state and saving', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));

  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  expect(screen.getByText('Marked all done.')).toBeOnTheScreen();
  expect(checkedStates()).toEqual([true, true, true]);
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(checkedStates()).toEqual([false, true, false]);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved.map((t: { done: boolean }) => t.done)).toEqual([false, true, false]);
});

test('undoing mark all leaves a to-do added after it as it is', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  addTodo('Buy jam');

  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs', 'Buy jam']);
  expect(checkedStates()).toEqual([false, true, false, false]);
});

test('undoes mark all not done', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy eggs' }));
  fireEvent.press(screen.getByRole('button', { name: 'Mark all not done' }));
  expect(screen.getByText('Marked all not done.')).toBeOnTheScreen();
  expect(checkedStates()).toEqual([false, false, false]);

  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(checkedStates()).toEqual([true, true, true]);
  const saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved.map((t: { done: boolean }) => t.done)).toEqual([true, true, true]);
});

test('the mark all undo offer expires after 5 seconds', async () => {
  await renderWithThree();
  jest.useFakeTimers();

  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  act(() => jest.advanceTimersByTime(4999));
  expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();

  act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('only the latest of a delete and a mark all can be undone', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  expect(screen.getByText('To-do deleted.')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);
  expect(checkedStates()).toEqual([true, true, true]);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy eggs' }));
  fireEvent.press(screen.getByRole('button', { name: 'Mark all not done' }));
  expect(screen.getByText('Marked all not done.')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread']);
  expect(checkedStates()).toEqual([true, true]);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
});

test('a mark all restarts the 5 second undo timer', async () => {
  await renderWithThree();
  jest.useFakeTimers();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  act(() => jest.advanceTimersByTime(3000));
  fireEvent.press(screen.getByRole('button', { name: 'Mark all done' }));
  act(() => jest.advanceTimersByTime(4999));

  expect(screen.getByText('Marked all done.')).toBeOnTheScreen();
});

test('selects the saved filter again on the next launch', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));
  fireEvent.press(screen.getByRole('button', { name: 'Done' }));

  screen.unmount();
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: 'Buy bread' });

  expect(screen.getByRole('button', { name: 'Done' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'All' })).not.toBeSelected();
  expect(titlesInOrder()).toEqual(['Buy bread']);
});

test('falls back to All when the saved filter is not one of the filters', async () => {
  await AsyncStorage.multiSet([
    ['todos', JSON.stringify([{ id: '1', title: 'Buy milk', done: false, pinned: false }])],
    ['filter', 'Archived'],
  ]);
  render(<TodoScreen />);

  await screen.findByRole('checkbox', { name: 'Buy milk' });
  expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
});

test('saves the filter but still never the search text', async () => {
  await renderWithThree();

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'milk');

  expect(await AsyncStorage.getItem('filter')).toBe('Active');
  expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['filter', 'todos']);
  screen.unmount();
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: 'Buy milk' });
  expect(screen.getByPlaceholderText('Search to-dos').props.value).toBe('');
  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);
});

test('the filter buttons are disabled until the saved data has loaded', async () => {
  let finishLoading: (saved: [string, string | null][]) => void = () => {};
  jest.spyOn(AsyncStorage, 'multiGet').mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    })
  );
  render(<TodoScreen />);

  for (const name of ['All', 'Active', 'Done']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }

  await act(async () => finishLoading([['todos', null], ['filter', 'Done']]));

  for (const name of ['All', 'Active', 'Done']) {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  }
  expect(screen.getByRole('button', { name: 'Done' })).toBeSelected();
});

test('saving an edit empty deletes the to-do and offers Undo', async () => {
  await renderWithThree();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy bread' }));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy bread' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), '   ');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy eggs']);
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  expect(screen.getByText('To-do deleted.')).toBeOnTheScreen();
  let saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toHaveLength(2);

  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

  expect(titlesInOrder()).toEqual(['Buy milk', 'Buy bread', 'Buy eggs']);
  expect(checkedStates()).toEqual([false, true, false]);
  saved = JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  expect(saved).toMatchObject([{ title: 'Buy milk' }, { title: 'Buy bread' }, { title: 'Buy eggs' }]);
});

test('saving an empty edit of the only to-do leaves an empty list with Undo', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  addTodo('Buy milk');

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), '');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Nothing to do yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();
});

test('a to-do added before the saved list loads is kept after it', async () => {
  await AsyncStorage.setItem('todos', JSON.stringify([{ id: 'old-1', title: 'Old', done: false }]));
  render(<TodoScreen />);
  addTodo('New');

  expect(await screen.findByText('Old')).toBeOnTheScreen();
  expect(screen.getByText('New')).toBeOnTheScreen();
  const stored = JSON.parse((await AsyncStorage.getItem('todos'))!);
  expect(stored.map((t: { title: string }) => t.title)).toEqual(['Old', 'New']);
});

test('a to-do added before load that repeats a saved title is dropped', async () => {
  await AsyncStorage.setItem('todos', JSON.stringify([{ id: 'old-1', title: 'Old', done: true }]));
  render(<TodoScreen />);
  addTodo('old');

  expect(await screen.findByText('Old')).toBeOnTheScreen();
  expect(screen.queryByText('old')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Old' })).toBeChecked();
});

describe('due dates', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 3, 12) });
  });

  const withDue = (title: string, due: string | null, done = false) => ({
    id: title,
    title,
    done,
    due,
  });

  async function openSaved(...todos: ReturnType<typeof withDue>[]) {
    await AsyncStorage.setItem('todos', JSON.stringify(todos));
    render(<TodoScreen />);
    await screen.findByText(todos[0].title);
  }

  function editDue(title: string, text: string) {
    fireEvent.press(screen.getByRole('button', { name: `Edit ${title}` }));
    fireEvent.changeText(screen.getByLabelText(`Due date for ${title}`), text);
  }

  const dateField = (title: string) => screen.getByLabelText(`Due date for ${title}`);

  async function savedTodos() {
    return JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
  }

  test('sets a due date in the edit form and shows it under the title', async () => {
    render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');
    addTodo('Buy milk');
    expect(screen.queryByText(/^Due /)).toBeNull();

    editDue('Buy milk', '2026-11-05');
    expect(screen.getByPlaceholderText('Due date (YYYY-MM-DD)')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Due 2026-11-05')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit Buy milk' })).toBeOnTheScreen();
    expect(await savedTodos()).toMatchObject([{ title: 'Buy milk', due: '2026-11-05' }]);
  });

  test('the date field starts with the current date, and saving it unchanged keeps it', async () => {
    await openSaved(withDue('Buy milk', '2026-11-05'));

    fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
    expect(dateField('Buy milk').props.value).toBe('2026-11-05');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Due 2026-11-05')).toBeOnTheScreen();
  });

  test('clearing the date field removes the date', async () => {
    await openSaved(withDue('Buy milk', '2026-11-05'));

    editDue('Buy milk', '');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText(/^Due /)).toBeNull();
    expect((await savedTodos())[0].due).toBeNull();
  });

  test('a to-do that is not done and due before today shows Overdue instead of its date', async () => {
    await openSaved(withDue('Buy milk', '2026-11-02'));

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
    expect(screen.queryByText('Due 2026-11-02')).toBeNull();
  });

  test('a to-do due today is not overdue', async () => {
    await openSaved(withDue('Buy milk', '2026-11-03'));

    expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('a done to-do past its date shows the date, and Overdue returns when it is ticked back', async () => {
    await openSaved(withDue('Buy milk', '2026-11-02', true));
    expect(screen.getByText('Due 2026-11-02')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });

  test.each(['3 Nov', '2026-1-3', '2026-02-30'])(
    'refuses %j with a message and keeps the edit open',
    async (text) => {
      await openSaved(withDue('Buy milk', '2026-11-05'));

      editDue('Buy milk', text);
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
      expect(dateField('Buy milk').props.value).toBe(text);
      expect((await savedTodos())[0].due).toBe('2026-11-05');
    }
  );

  test('the date message goes away on typing in the date field and on cancel', async () => {
    await openSaved(withDue('Buy milk', null));

    editDue('Buy milk', 'soon');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    fireEvent.changeText(dateField('Buy milk'), '2026-11');
    expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
    expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();
  });

  test('ignores spaces around the date and saves it trimmed', async () => {
    await openSaved(withDue('Buy milk', null));

    editDue('Buy milk', '  2026-11-05 ');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect((await savedTodos())[0].due).toBe('2026-11-05');
  });

  test('pressing return in the date field saves the edit', async () => {
    await openSaved(withDue('Buy milk', null));

    editDue('Buy milk', '2026-11-05');
    fireEvent(dateField('Buy milk'), 'submitEditing');

    expect(screen.getByText('Due 2026-11-05')).toBeOnTheScreen();
  });

  test('a bad date and a duplicate title show both messages', async () => {
    await openSaved(withDue('Buy milk', null), withDue('Buy bread', null));

    editDue('Buy bread', 'soon');
    fireEvent.changeText(screen.getByLabelText('Edit Buy bread'), 'buy milk');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
    expect(screen.getByText('Already on the list.')).toBeOnTheScreen();
  });

  test('saving the title empty deletes the to-do even with a date typed, and Undo restores its date', async () => {
    await openSaved(withDue('Buy milk', '2026-11-05'));

    editDue('Buy milk', 'soon');
    fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), '');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Nothing to do yet.')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Due 2026-11-05')).toBeOnTheScreen();
  });

  test('a saved date shows again on the next launch', async () => {
    const first = render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');
    addTodo('Buy milk');
    editDue('Buy milk', '2026-11-05');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    first.unmount();

    render(<TodoScreen />);

    expect(await screen.findByText('Due 2026-11-05')).toBeOnTheScreen();
  });

  test('a saved list without dates, or with a broken date, loads with no date lines', async () => {
    await AsyncStorage.setItem(
      'todos',
      JSON.stringify([
        { id: '1', title: 'Old', done: false },
        { id: '2', title: 'Odd', done: false, due: '2026-02-30' },
        { id: '3', title: 'Num', done: false, due: 20261103 },
      ])
    );
    render(<TodoScreen />);
    await screen.findByText('Old');

    expect(screen.queryByText(/^Due /)).toBeNull();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('Overdue appears when the app stays open past midnight', async () => {
    jest.setSystemTime(new Date(2026, 10, 3, 23, 59));
    await openSaved(withDue('Buy milk', '2026-11-03'));
    expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });

  test('Overdue appears when the app resumes the next day', async () => {
    const addListener = jest.spyOn(AppState, 'addEventListener');
    await openSaved(withDue('Buy milk', '2026-11-03'));
    expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
    const onChange = addListener.mock.calls.at(-1)![1] as (state: string) => void;

    jest.setSystemTime(new Date(2026, 10, 4, 8));
    act(() => onChange('active'));

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });

  test('a date-only edit saves when the title repeats another to-do', async () => {
    await AsyncStorage.setItem(
      'todos',
      JSON.stringify([
        { ...withDue('Buy milk', null), id: 'first' },
        { ...withDue('Buy milk', null), id: 'second' },
      ])
    );
    render(<TodoScreen />);
    await screen.findAllByText('Buy milk');

    fireEvent.press(screen.getAllByRole('button', { name: 'Edit Buy milk' })[1]);
    fireEvent.changeText(dateField('Buy milk'), '2026-11-05');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText('Already on the list.')).toBeNull();
    expect(screen.getByText('Due 2026-11-05')).toBeOnTheScreen();
    expect(await savedTodos()).toMatchObject([
      { id: 'first', due: null },
      { id: 'second', due: '2026-11-05' },
    ]);
  });
});
