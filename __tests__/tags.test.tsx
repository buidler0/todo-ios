import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

function addTodo(title: string) {
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

async function renderWith(...titles: string[]) {
  const view = render(<TodoScreen />);
  await screen.findByText('Nothing to do yet.');
  titles.forEach(addTodo);
  return view;
}

const tagButtons = () =>
  screen.queryAllByRole('button').filter((b) => String(b.props.accessibilityLabel).startsWith('Tag '));
const tagLabels = () => tagButtons().map((b) => b.props.accessibilityLabel);

test('lists each tag once, in first-seen order', async () => {
  await renderWith('Buy milk #shop', 'Call mum #family #shop', 'Plan #trip', 'No tag here');
  expect(tagLabels()).toEqual(['Tag #shop', 'Tag #family', 'Tag #trip']);
});

test('shows no tag buttons when no title has a tag', async () => {
  await renderWith('Buy milk', 'Fix C# parser', 'Issue#12', 'Lone # hash');
  expect(tagButtons()).toHaveLength(0);
});

test('pressing a tag shows only its to-dos, and pressing it again clears it', async () => {
  await renderWith('Buy milk #shop', 'Call mum #family', 'Buy bread #shop', 'Plain');

  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));
  expect(screen.getByRole('button', { name: 'Tag #shop' })).toBeSelected();
  expect(screen.getByText('Buy milk #shop')).toBeOnTheScreen();
  expect(screen.getByText('Buy bread #shop')).toBeOnTheScreen();
  expect(screen.queryByText('Call mum #family')).toBeNull();
  expect(screen.queryByText('Plain')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));
  expect(screen.getByRole('button', { name: 'Tag #shop' })).not.toBeSelected();
  expect(screen.getByText('Call mum #family')).toBeOnTheScreen();
  expect(screen.getByText('Plain')).toBeOnTheScreen();
});

test('pressing another tag switches to it', async () => {
  await renderWith('Buy milk #shop', 'Call mum #family');
  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));
  fireEvent.press(screen.getByRole('button', { name: 'Tag #family' }));
  expect(screen.queryByText('Buy milk #shop')).toBeNull();
  expect(screen.getByText('Call mum #family')).toBeOnTheScreen();
});

test('a tag narrows the All, Active and Done filters', async () => {
  await renderWith('Buy milk #shop', 'Buy bread #shop', 'Call mum #family');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk #shop' }));
  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByText('Buy bread #shop')).toBeOnTheScreen();
  expect(screen.queryByText('Buy milk #shop')).toBeNull();
  expect(screen.queryByText('Call mum #family')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByText('Buy milk #shop')).toBeOnTheScreen();
  expect(screen.queryByText('Buy bread #shop')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByText('Buy milk #shop')).toBeOnTheScreen();
  expect(screen.getByText('Buy bread #shop')).toBeOnTheScreen();
  expect(screen.queryByText('Call mum #family')).toBeNull();
});

test('tags match regardless of case and keep the first spelling', async () => {
  await renderWith('Buy milk #Shop', 'Buy bread #shop', 'Call mum #family');
  expect(tagLabels()).toEqual(['Tag #Shop', 'Tag #family']);
  fireEvent.press(screen.getByRole('button', { name: 'Tag #Shop' }));
  expect(screen.getByText('Buy bread #shop')).toBeOnTheScreen();
  expect(screen.queryByText('Call mum #family')).toBeNull();
});

test('editing a title updates the tag list', async () => {
  await renderWith('Buy milk #shop', 'Call mum');
  fireEvent.press(screen.getByRole('button', { name: 'Edit Call mum' }));
  fireEvent.changeText(screen.getByLabelText('Edit Call mum'), 'Call mum #family');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(tagLabels()).toEqual(['Tag #shop', 'Tag #family']);
});

test('removing the last to-do with the selected tag shows the whole list again', async () => {
  await renderWith('Buy milk #shop', 'Call mum');
  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));
  expect(screen.queryByText('Call mum')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk #shop' }));
  expect(tagButtons()).toHaveLength(0);
  expect(screen.getByText('Call mum')).toBeOnTheScreen();
});

test('the selected tag is not saved between launches', async () => {
  const first = await renderWith('Buy milk #shop', 'Call mum');
  fireEvent.press(screen.getByRole('button', { name: 'Tag #shop' }));
  await first.unmountAsync();

  render(<TodoScreen />);
  await screen.findByText('Call mum');
  expect(screen.getByRole('button', { name: 'Tag #shop' })).not.toBeSelected();
  expect(screen.getByText('Buy milk #shop')).toBeOnTheScreen();
});
