import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

function addTodo(title: string) {
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

function titlesInOrder() {
  return screen.getAllByRole('checkbox').map((box) => box.props.accessibilityLabel);
}

function press(name: string) {
  fireEvent.press(screen.getByRole('button', { name }));
}

async function renderWith(titles: string[]) {
  render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  titles.forEach(addTodo);
}

test('the sort button cycles Manual, A-Z, Done last and back', async () => {
  await renderWith(['Buy milk']);

  expect(screen.getByRole('button', { name: 'Sort: Manual' })).toBeOnTheScreen();
  press('Sort: Manual');
  expect(screen.getByRole('button', { name: 'Sort: A-Z' })).toBeOnTheScreen();
  press('Sort: A-Z');
  expect(screen.getByRole('button', { name: 'Sort: Done last' })).toBeOnTheScreen();
  press('Sort: Done last');
  expect(screen.getByRole('button', { name: 'Sort: Manual' })).toBeOnTheScreen();
});

test('A-Z sorts by title, ignoring case, and Manual restores the list order', async () => {
  await renderWith(['pear', 'Banana', 'apple', 'Cherry']);

  press('Sort: Manual');
  expect(titlesInOrder()).toEqual(['apple', 'Banana', 'Cherry', 'pear']);

  press('Sort: A-Z');
  press('Sort: Done last');
  expect(titlesInOrder()).toEqual(['pear', 'Banana', 'apple', 'Cherry']);
});

test('Done last keeps list order but moves done to-dos after the others', async () => {
  await renderWith(['Buy milk', 'Buy bread', 'Buy eggs', 'Buy jam']);
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy eggs' }));

  press('Sort: Manual');
  press('Sort: A-Z');

  expect(titlesInOrder()).toEqual(['Buy bread', 'Buy jam', 'Buy milk', 'Buy eggs']);
});

test('pinned to-dos stay above the rest in every order', async () => {
  await renderWith(['pear', 'Banana', 'apple', 'Cherry']);
  fireEvent.press(screen.getByRole('button', { name: 'Pin pear' }));
  fireEvent.press(screen.getByRole('button', { name: 'Pin Cherry' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'pear' }));

  expect(titlesInOrder()).toEqual(['pear', 'Cherry', 'Banana', 'apple']);

  press('Sort: Manual');
  expect(titlesInOrder()).toEqual(['Cherry', 'pear', 'apple', 'Banana']);

  press('Sort: A-Z');
  expect(titlesInOrder()).toEqual(['Cherry', 'pear', 'Banana', 'apple']);
});

test('move buttons are disabled unless the order is Manual', async () => {
  await renderWith(['Buy milk', 'Buy bread', 'Buy eggs']);

  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Buy bread down' })).toBeEnabled();

  press('Sort: Manual');
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Buy bread down' })).toBeDisabled();

  press('Sort: A-Z');
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeDisabled();

  press('Sort: Done last');
  expect(screen.getByRole('button', { name: 'Move Buy bread up' })).toBeEnabled();
});

test('sorting leaves the manual order untouched for a later move', async () => {
  await renderWith(['Buy milk', 'Buy bread', 'Buy eggs']);
  press('Sort: Manual');
  press('Sort: A-Z');
  press('Sort: Done last');

  fireEvent.press(screen.getByRole('button', { name: 'Move Buy bread up' }));

  expect(titlesInOrder()).toEqual(['Buy bread', 'Buy milk', 'Buy eggs']);
});

test('the sort order combines with the filter and the search', async () => {
  await renderWith(['pear', 'Banana', 'apple', 'Apricot']);
  fireEvent.press(screen.getByRole('checkbox', { name: 'pear' }));

  press('Sort: Manual');
  press('Active');
  expect(titlesInOrder()).toEqual(['apple', 'Apricot', 'Banana']);

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'ap');
  expect(titlesInOrder()).toEqual(['apple', 'Apricot']);
});

test('saves the sort order and applies it again on the next launch', async () => {
  await renderWith(['pear', 'apple']);
  press('Sort: Manual');
  expect(await AsyncStorage.getItem('sort')).toBe('A-Z');

  screen.unmount();
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: 'apple' });

  expect(screen.getByRole('button', { name: 'Sort: A-Z' })).toBeOnTheScreen();
  expect(titlesInOrder()).toEqual(['apple', 'pear']);
});

test('starts on Manual and writes nothing when no order was chosen', async () => {
  await renderWith(['Buy milk']);

  expect(screen.getByRole('button', { name: 'Sort: Manual' })).toBeOnTheScreen();
  expect(await AsyncStorage.getAllKeys()).toEqual(['todos']);
});

test('falls back to Manual when the saved order is not one of the orders', async () => {
  await AsyncStorage.multiSet([
    ['todos', JSON.stringify([{ id: '1', title: 'Buy milk', done: false, pinned: false }])],
    ['sort', 'Newest'],
  ]);
  render(<TodoScreen />);

  await screen.findByRole('checkbox', { name: 'Buy milk' });
  expect(screen.getByRole('button', { name: 'Sort: Manual' })).toBeOnTheScreen();
});

test('the sort button is disabled until the saved data has loaded', async () => {
  let finishLoading: (saved: [string, string | null][]) => void = () => {};
  jest.spyOn(AsyncStorage, 'multiGet').mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    })
  );
  render(<TodoScreen />);
  expect(screen.getByRole('button', { name: 'Sort: Manual' })).toBeDisabled();

  await act(async () => finishLoading([['todos', null], ['filter', null], ['sort', 'A-Z']]));

  expect(screen.getByRole('button', { name: 'Sort: A-Z' })).toBeEnabled();
  jest.restoreAllMocks();
});
