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

async function renderWith(...titles: string[]) {
  const view = render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  for (const title of titles) {
    fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  }
  return view;
}

async function relaunch(view: ReturnType<typeof render>) {
  view.unmount();
  render(<TodoScreen />);
  await screen.findByRole('button', { name: 'All' });
  await waitFor(() => expect(screen.queryByText('Nothing to do yet.')).toBeNull());
}

function shownTitles() {
  return screen.queryAllByRole('checkbox').map((box) => box.props.accessibilityLabel);
}

test('counts the to-dos left and hides the count when the list is empty', async () => {
  await renderWith();
  expect(screen.queryByText(/left$/)).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('1 item left')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Walk dog');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('2 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));
  expect(screen.getByText('0 items left')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));
  expect(screen.queryByText(/left$/)).toBeNull();
});

test('filters to all, active or done to-dos', async () => {
  const view = await renderWith('Buy milk', 'Walk dog');
  const all = screen.getByRole('button', { name: 'All' });
  const active = screen.getByRole('button', { name: 'Active' });
  const done = screen.getByRole('button', { name: 'Done' });
  expect(all).toBeSelected();
  expect(active).not.toBeSelected();
  expect(done).not.toBeSelected();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

  fireEvent.press(active);
  expect(active).toBeSelected();
  expect(all).not.toBeSelected();
  expect(shownTitles()).toEqual(['Walk dog']);

  fireEvent.press(done);
  expect(done).toBeSelected();
  expect(shownTitles()).toEqual(['Buy milk']);

  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Pay rent');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('2 items left')).toBeOnTheScreen();

  fireEvent.press(all);
  expect(shownTitles()).toEqual(['Buy milk', 'Walk dog', 'Pay rent']);

  fireEvent.press(done);
  await relaunch(view);
  expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
  expect(shownTitles()).toEqual(['Buy milk', 'Walk dog', 'Pay rent']);
});

test('clears completed to-dos and keeps the result after a relaunch', async () => {
  const view = await renderWith('Buy milk', 'Walk dog', 'Pay rent');
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Pay rent' }));
  fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));

  expect(shownTitles()).toEqual(['Walk dog']);
  expect(screen.queryByRole('button', { name: 'Clear completed' })).toBeNull();

  await relaunch(view);
  expect(shownTitles()).toEqual(['Walk dog']);
});

describe('undo delete', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('puts a deleted to-do back where it was and keeps it after a relaunch', async () => {
    const view = await renderWith('Buy milk', 'Walk dog', 'Pay rent');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));

    fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));
    expect(shownTitles()).toEqual(['Buy milk', 'Pay rent']);

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(shownTitles()).toEqual(['Buy milk', 'Walk dog', 'Pay rent']);
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

    await relaunch(view);
    expect(shownTitles()).toEqual(['Buy milk', 'Walk dog', 'Pay rent']);
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).toBeChecked();
  });

  test('puts a to-do back before its old neighbour after clearing completed ones', async () => {
    await renderWith('Buy milk', 'Walk dog', 'Pay rent');
    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

    fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));
    fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));
    expect(shownTitles()).toEqual(['Pay rent']);

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(shownTitles()).toEqual(['Walk dog', 'Pay rent']);
  });

  test('disappears after 5 seconds', async () => {
    await renderWith('Buy milk');
    fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));

    act(() => jest.advanceTimersByTime(4900));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(100));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  test('only undoes the latest delete', async () => {
    await renderWith('Buy milk', 'Walk dog');
    fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk' }));
    act(() => jest.advanceTimersByTime(4000));
    fireEvent.press(screen.getByRole('button', { name: 'Delete Walk dog' }));

    act(() => jest.advanceTimersByTime(4000));
    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(shownTitles()).toEqual(['Walk dog']);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});

test('keeps to-dos added in the same millisecond independent', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  await renderWith('Buy milk', 'Walk dog', 'Pay rent');
  jest.restoreAllMocks();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Walk dog' })).not.toBeChecked();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Walk dog' }));
  fireEvent.changeText(screen.getByLabelText('Edit Walk dog'), 'Walk cat');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(shownTitles()).toEqual(['Buy milk', 'Walk cat', 'Pay rent']);

  fireEvent.press(screen.getByRole('button', { name: 'Delete Pay rent' }));
  expect(shownTitles()).toEqual(['Buy milk', 'Walk cat']);
});

test('separates saved to-dos that share an id', async () => {
  await AsyncStorage.setItem(
    'todos',
    JSON.stringify([
      { id: '1', title: 'Buy milk', done: false },
      { id: '1', title: 'Walk dog', done: false },
    ])
  );
  render(<TodoScreen />);
  fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));

  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Walk dog' })).not.toBeChecked();
});
