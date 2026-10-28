import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => {
  AsyncStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 10, 1, 12).getTime());
});
afterEach(() => jest.restoreAllMocks());

function addTodo(title: string) {
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

async function renderWith(...titles: string[]) {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  titles.forEach(addTodo);
}

function press(name: string) {
  fireEvent.press(screen.getByRole('button', { name }));
}

function setDue(title: string, due: string) {
  press(`Edit ${title}`);
  fireEvent.changeText(screen.getByPlaceholderText('Due date (YYYY-MM-DD)'), due);
  press('Save');
}

const titlesInOrder = () =>
  screen.getAllByRole('checkbox').map((box) => box.props.accessibilityLabel);

test('a tag filter combines with A-Z, keeping pinned to-dos on top', async () => {
  await renderWith('pear #fruit', 'Buy milk #shop', 'apple #fruit', 'Banana #fruit');
  press('Pin Banana #fruit');

  press('Tag #fruit');
  expect(titlesInOrder()).toEqual(['Banana #fruit', 'pear #fruit', 'apple #fruit']);

  press('Sort: Manual');
  expect(titlesInOrder()).toEqual(['Banana #fruit', 'apple #fruit', 'pear #fruit']);
});

test('move arrows are hidden while a tag is selected, in every sort order', async () => {
  await renderWith('Buy milk #shop', 'Buy bread #shop');

  press('Tag #shop');
  expect(screen.queryByRole('button', { name: 'Move Buy milk #shop down' })).toBeNull();
  press('Sort: Manual');
  expect(screen.queryByRole('button', { name: 'Move Buy milk #shop down' })).toBeNull();

  press('Tag #shop');
  expect(screen.getByRole('button', { name: 'Move Buy milk #shop down' })).toBeDisabled();
});

test('due dates and Overdue show in a sorted list', async () => {
  await renderWith('pear', 'Banana', 'apple');
  setDue('pear', '2026-11-03');
  setDue('apple', '2026-10-31');

  press('Sort: Manual');
  expect(titlesInOrder()).toEqual(['apple', 'Banana', 'pear']);
  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
  expect(screen.getByText('Overdue')).toBeOnTheScreen();

  fireEvent.press(screen.getByRole('checkbox', { name: 'apple' }));
  press('Sort: A-Z');
  expect(titlesInOrder()).toEqual(['pear', 'Banana', 'apple']);
  expect(screen.getByText('Due 2026-10-31')).toBeOnTheScreen();
  expect(screen.queryByText('Overdue')).toBeNull();
});

test('editing a tagged to-do in a sorted list keeps its due date and tag', async () => {
  await renderWith('pear #fruit', 'apple #fruit');
  press('Sort: Manual');
  press('Tag #fruit');
  setDue('pear #fruit', '2026-11-03');

  expect(titlesInOrder()).toEqual(['apple #fruit', 'pear #fruit']);
  expect(screen.getByText('Due 2026-11-03')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tag #fruit' })).toBeSelected();
});
