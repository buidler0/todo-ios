import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const DUE_PLACEHOLDER = 'Due date (YYYY-MM-DD)';

beforeEach(() => {
  AsyncStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 10, 1, 12).getTime());
});
afterEach(() => jest.restoreAllMocks());

async function renderWithTodo(title = 'Buy milk') {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

function setDue(title: string, due: string) {
  fireEvent.press(screen.getByRole('button', { name: `Edit ${title}` }));
  fireEvent.changeText(screen.getByPlaceholderText(DUE_PLACEHOLDER), due);
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
}

test('a saved due date shows under the title and starts the next edit', async () => {
  await renderWithTodo();
  expect(screen.queryByText(/^Due /)).toBeNull();

  setDue('Buy milk', '2026-11-03');
  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText(DUE_PLACEHOLDER)).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  expect(screen.getByPlaceholderText(DUE_PLACEHOLDER).props.value).toBe('2026-11-03');
});

test('clearing the field removes the due date', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2026-11-03');
  setDue('Buy milk', '  ');
  expect(screen.queryByText(/^Due /)).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  expect(screen.getByPlaceholderText(DUE_PLACEHOLDER).props.value).toBe('');
});

test('a due date before today shows Overdue until the to-do is done', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2026-10-31');
  expect(screen.getByText('Overdue')).toBeOnTheScreen();
  expect(screen.queryByText('Due 2026-10-31')).toBeNull();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  expect(screen.queryByText('Overdue')).toBeNull();
  expect(screen.getByText('Due 2026-10-31')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  expect(screen.getByText('Overdue')).toBeOnTheScreen();
});

test('a due date of today is not overdue', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2026-11-01');
  expect(screen.getByText('Due 2026-11-01')).toBeOnTheScreen();
  expect(screen.queryByText('Overdue')).toBeNull();
});

test.each(['tomorrow', '2026-1-5', '2026-11-3', '11/03/2026', '2026-02-30', '2026-13-01', '2026-00-10', '2025-02-29'])(
  'refuses %s and keeps the edit open',
  async (bad) => {
    await renderWithTodo();
    setDue('Buy milk', bad);
    expect(screen.getByText('Use YYYY-MM-DD')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(DUE_PLACEHOLDER)).toBeOnTheScreen();
    expect(screen.queryByText(/^Due /)).toBeNull();
  }
);

test('accepts a real leap day', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2028-02-29');
  expect(screen.getByText('Due 2028-02-29')).toBeOnTheScreen();
});

test('the refusal clears when the date changes or the edit is cancelled', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2026-02-30');
  fireEvent.changeText(screen.getByPlaceholderText(DUE_PLACEHOLDER), '2026-02-2');
  expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText(DUE_PLACEHOLDER), 'nope');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  expect(screen.queryByText('Use YYYY-MM-DD')).toBeNull();
  expect(screen.getByPlaceholderText(DUE_PLACEHOLDER).props.value).toBe('');
});

test('a refused date leaves the title edit unsaved, then both save together', async () => {
  await renderWithTodo();
  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk'), 'Buy bread');
  fireEvent.changeText(screen.getByPlaceholderText(DUE_PLACEHOLDER), '2026-02-30');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.queryByText('Buy bread')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText(DUE_PLACEHOLDER), '2026-12-25');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Buy bread')).toBeOnTheScreen();
  expect(screen.getByText('Due 2026-12-25')).toBeOnTheScreen();
});

test('the due date is saved and survives a reload', async () => {
  await renderWithTodo();
  setDue('Buy milk', '2026-11-03');
  await waitFor(async () => expect(await AsyncStorage.getItem('todos')).toContain('2026-11-03'));
  screen.unmount();

  render(<TodoScreen />);
  expect(await screen.findByText('Due 2026-11-03')).toBeOnTheScreen();
});

test('a to-do saved before due dates existed loads without one', async () => {
  await AsyncStorage.setItem('todos', JSON.stringify([{ id: '1', title: 'Old', done: false }]));
  render(<TodoScreen />);
  expect(await screen.findByText('Old')).toBeOnTheScreen();
  expect(screen.queryByText(/^Due /)).toBeNull();
  expect(screen.queryByText('Overdue')).toBeNull();
});
