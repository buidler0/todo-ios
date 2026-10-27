import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

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

async function savedTodos() {
  return JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
}

test('counts the to-dos left and hides the count when the list is empty', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  expect(screen.queryByText(/left$/)).toBeNull();

  addTodo('Buy milk');
  expect(screen.getByText('1 item left')).toBeOnTheScreen();

  addTodo('Walk dog');
  expect(screen.getByText('2 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));
  expect(screen.getByText('0 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));
  expect(screen.queryByText(/left$/)).toBeNull();
});

test('filters to-dos by All, Active and Done', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  const all = screen.getByRole('button', { name: 'All' });
  const active = screen.getByRole('button', { name: 'Active' });
  const done = screen.getByRole('button', { name: 'Done' });
  expect(all).toBeSelected();
  expect(active).not.toBeSelected();
  expect(done).not.toBeSelected();

  addTodo('Buy milk');
  addTodo('Walk dog');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

  fireEvent.press(active);
  expect(active).toBeSelected();
  expect(all).not.toBeSelected();
  expect(screen.queryByText('Buy milk')).toBeNull();
  expect(screen.getByText('Walk dog')).toBeOnTheScreen();

  fireEvent.press(done);
  expect(done).toBeSelected();
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.queryByText('Walk dog')).toBeNull();

  addTodo('Feed cat');
  expect(screen.queryByText('Feed cat')).toBeNull();
  expect(screen.getByText('2 items left')).toBeOnTheScreen();

  fireEvent.press(all);
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  expect(screen.getByText('Walk dog')).toBeOnTheScreen();
  expect(screen.getByText('Feed cat')).toBeOnTheScreen();
});

test('starts on All each launch', async () => {
  const first = render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  first.unmount();

  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
});

test('clears completed to-dos and saves the result', async () => {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');

  addTodo('Buy milk');
  addTodo('Walk dog');
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));

  expect(screen.queryByText('Buy milk')).toBeNull();
  expect(screen.getByText('Walk dog')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();
  await waitFor(async () =>
    expect((await savedTodos()).map((t: { title: string }) => t.title)).toEqual(['Walk dog'])
  );
});

describe('undo delete', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('restores the to-do in its old place with its done state, and saves', async () => {
    render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');

    addTodo('Buy milk');
    addTodo('Walk dog');
    addTodo('Feed cat');
    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));
    expect(screen.queryByText('Walk dog')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.getAllByRole('checkbox').map((c) => c.props.accessibilityLabel)).toEqual([
      'Buy milk',
      'Walk dog',
      'Feed cat',
    ]);
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).toBeChecked();
    await waitFor(async () =>
      expect(await savedTodos()).toMatchObject([
        { title: 'Buy milk', done: false },
        { title: 'Walk dog', done: true },
        { title: 'Feed cat', done: false },
      ])
    );
  });

  test('disappears after 5 seconds', async () => {
    render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');

    addTodo('Buy milk');
    fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));

    act(() => jest.advanceTimersByTime(4999));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  test('only undoes the latest delete', async () => {
    render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');

    addTodo('Buy milk');
    addTodo('Walk dog');
    fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));

    // The second delete starts a fresh 5 seconds.
    act(() => jest.advanceTimersByTime(3000));
    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Walk dog')).toBeOnTheScreen();
    expect(screen.queryByText('Buy milk')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});

describe('to-dos added in the same millisecond', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000));
  afterEach(() => jest.restoreAllMocks());

  test('tick, edit and delete independently', async () => {
    render(<TodoScreen />);
    await screen.findByText('Nothing to do yet.');

    addTodo('Buy milk');
    addTodo('Walk dog');
    addTodo('Feed cat');

    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).not.toBeChecked();

    fireEvent.press(screen.getByRole('button', { name: 'Edit Walk dog' }));
    fireEvent.changeText(screen.getByLabelText('Edit Walk dog'), 'Walk the dog');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Buy milk')).toBeOnTheScreen();
    expect(screen.getByText('Walk the dog')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Delete Feed cat' }));
    expect(screen.getByText('Buy milk')).toBeOnTheScreen();
    expect(screen.getByText('Walk the dog')).toBeOnTheScreen();
    expect(screen.queryByText('Feed cat')).toBeNull();
  });

  test('saved to-dos that share an id are separated on load', async () => {
    await AsyncStorage.setItem(
      'todos',
      JSON.stringify([
        { id: '1', title: 'Buy milk', done: false },
        { id: '1', title: 'Walk dog', done: false },
      ])
    );
    render(<TodoScreen />);
    await screen.findByText('Buy milk');

    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked();
  });
});
