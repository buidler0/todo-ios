import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => {
  AsyncStorage.clear();
  jest.mocked(AppState.addEventListener).mockClear();
  jest.useFakeTimers({ now: new Date(2026, 9, 28, 12) });
});
afterEach(() => {
  jest.useRealTimers();
});

const EDIT_DUE = 'Due date (YYYY-MM-DD)';

async function renderWithSaved(todos: object[]) {
  await AsyncStorage.setItem('todos', JSON.stringify(todos));
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: String((todos[0] as { title: string }).title) });
}

async function renderWithOneTodo() {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false }]);
}

function setDue(title: string, text: string) {
  fireEvent.press(screen.getByRole('button', { name: `Edit ${title}` }));
  fireEvent.changeText(screen.getByPlaceholderText(EDIT_DUE), text);
}

async function savedTodos() {
  return JSON.parse((await AsyncStorage.getItem('todos')) ?? '[]');
}

test('a due date set while editing shows under the title', async () => {
  await renderWithOneTodo();
  expect(screen.queryByText(/^Due /)).toBeNull();

  setDue('Buy milk', '2026-11-03');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText(EDIT_DUE)).toBeNull();
});

test('a date in the wrong shape is refused and the edit stays open', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', 'tomorrow');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText(EDIT_DUE)).toBeOnTheScreen();
});

test('a day that does not exist is refused', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', '2026-02-30');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText(EDIT_DUE)).toBeOnTheScreen();
});

test('submitting from either field refuses a bad date', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', '2026-13-01');
  fireEvent(screen.getByPlaceholderText(EDIT_DUE), 'submitEditing');
  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByPlaceholderText(EDIT_DUE), '2026-13-02');
  fireEvent(screen.getByLabelText('Edit Buy milk'), 'submitEditing');
  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText(EDIT_DUE)).toBeOnTheScreen();
});

test('a refused date keeps the title edit and saves once fixed', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', 'soon');
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy oat milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
  expect(screen.queryByText('Buy oat milk')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText(EDIT_DUE), '2028-02-29');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy oat milk')).toBeOnTheScreen();
  expect(screen.getByText('Due 2028-02-29')).toBeOnTheScreen();
});

test('the message goes away when the date is edited', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', 'tomorrow');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByPlaceholderText(EDIT_DUE), '2026-11-0');
  expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();
});

test('the message does not carry over to the next edit', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', 'tomorrow');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();
  expect(screen.getByPlaceholderText(EDIT_DUE).props.value).toBe('');
});

test('a title-only edit keeps the existing date', async () => {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-11-03' }]);

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy oat milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Buy oat milk')).toBeOnTheScreen();
  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
  await waitFor(async () =>
    expect(await savedTodos()).toEqual([
      { id: '1', title: 'Buy oat milk', done: false, pinned: false, due: '2026-11-03' },
    ])
  );
});

test('tapping the date line opens the editor', async () => {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-11-03' }]);

  fireEvent.press(screen.getByText('Due 2026-11-03'));

  expect(screen.getByPlaceholderText(EDIT_DUE).props.value).toBe('2026-11-03');
});

test('the field starts with the current date', async () => {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-11-03' }]);

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));

  expect(screen.getByPlaceholderText(EDIT_DUE).props.value).toBe('2026-11-03');
});

test('whitespace around a date is ignored', async () => {
  await renderWithOneTodo();

  setDue('Buy milk', '  2026-11-03 ');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
});

test('clearing the field removes the date', async () => {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-11-03' }]);

  setDue('Buy milk', '');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(screen.queryByText(/^Due /)).toBeNull();
  expect(screen.queryByText('Overdue')).toBeNull();
  expect(screen.getByText('Buy milk')).toBeOnTheScreen();
  await waitFor(async () =>
    expect(await savedTodos()).toEqual([{ id: '1', title: 'Buy milk', done: false, pinned: false }])
  );
});

test('the date is saved and shown again after a relaunch', async () => {
  await renderWithOneTodo();
  setDue('Buy milk', '2026-11-03');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  await waitFor(async () =>
    expect(await savedTodos()).toEqual([
      { id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-11-03' },
    ])
  );

  screen.unmount();
  render(<TodoScreen />);
  expect(await screen.findByText('Due 2026-11-03')).toBeOnTheScreen();
});

test('a stored date that is not a real day is ignored on load', async () => {
  await renderWithSaved([
    { id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-02-30' },
    { id: '2', title: 'Buy bread', done: false, pinned: false, due: 20261103 },
  ]);

  expect(screen.queryByText(/^Due /)).toBeNull();
  expect(screen.queryByText('Overdue')).toBeNull();
});

test('a to-do saved before due dates existed still loads', async () => {
  await renderWithSaved([{ id: '1', title: 'Buy milk', done: false }]);

  expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeOnTheScreen();
  expect(screen.queryByText(/^Due /)).toBeNull();
});

describe('today is 2026-10-28', () => {
  test('a not-done to-do due before today says Overdue instead of its date', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-27' }]);

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
    expect(screen.queryByText('Due 2026-10-27')).toBeNull();
  });

  test('a done to-do due before today shows its date', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: true, pinned: false, due: '2026-10-27' }]);

    expect(screen.getByText('Due 2026-10-27')).toBeOnTheScreen();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('a done to-do\'s date is dimmed and struck through like its title', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: true, pinned: false, due: '2026-10-27' }]);

    expect(screen.getByText('Due 2026-10-27')).toHaveStyle({
      textDecorationLine: 'line-through',
      opacity: 0.5,
    });
  });

  test('ticking an overdue to-do swaps Overdue for its date', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-27' }]);

    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

    expect(screen.getByText('Due 2026-10-27')).toBeOnTheScreen();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('a to-do due today is not overdue', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-28' }]);

    expect(screen.getByText('Due 2026-10-28')).toBeOnTheScreen();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('a to-do due later is not overdue', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-29' }]);

    expect(screen.getByText('Due 2026-10-29')).toBeOnTheScreen();
    expect(screen.queryByText('Overdue')).toBeNull();
  });

  test('a late-evening local time still counts as today', async () => {
    jest.setSystemTime(new Date(2026, 9, 28, 23, 59));
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-28' }]);

    expect(screen.getByText('Due 2026-10-28')).toBeOnTheScreen();
  });
});

describe('the day changes while the screen is open', () => {
  const HALF_DAY_MS = 12 * 60 * 60 * 1000;
  const DAY_MS = 2 * HALF_DAY_MS;

  test('a to-do due today turns Overdue after midnight', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-28' }]);
    expect(screen.getByText('Due 2026-10-28')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(HALF_DAY_MS));

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });

  test('the midnight timer is set again for the day after', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-29' }]);

    act(() => jest.advanceTimersByTime(HALF_DAY_MS));
    expect(screen.getByText('Due 2026-10-29')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(DAY_MS));
    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });

  test('returning to the app after midnight shows Overdue', async () => {
    await renderWithSaved([{ id: '1', title: 'Buy milk', done: false, pinned: false, due: '2026-10-28' }]);
    const onChange = jest
      .mocked(AppState.addEventListener)
      .mock.calls.find(([type]) => type === 'change')![1];

    jest.setSystemTime(new Date(2026, 9, 29, 8));
    act(() => onChange('active'));

    expect(screen.getByText('Overdue')).toBeOnTheScreen();
  });
});
