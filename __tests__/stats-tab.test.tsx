import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

const seed = (...done: boolean[]) =>
  AsyncStorage.setItem(
    'todos',
    JSON.stringify(done.map((d, i) => ({ id: `${i}`, title: `Task ${i}`, done: d, pinned: false })))
  );

const openTab = (name: 'Stats' | 'To-dos') =>
  fireEvent.press(screen.getByRole('button', { name }));

function addTodo(title: string) {
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), title);
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
}

test('opens on the to-do screen with both tabs in the bar', async () => {
  renderRouter('./app', { initialUrl: '/' });
  expect(await screen.findByText('Nothing to do yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'To-dos' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Stats' })).toBeOnTheScreen();
});

test('shows the counts for the saved list', async () => {
  await seed(true, true, false, false, false);
  renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('Task 0');
  openTab('Stats');

  expect(await screen.findByText('5 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('2 done')).toBeOnTheScreen();
  expect(screen.getByText('3 left')).toBeOnTheScreen();
  expect(screen.getByText('40% done')).toBeOnTheScreen();
  expect(screen.queryByText('No to-dos yet')).toBeNull();
});

test('says there are no to-dos for an empty list', async () => {
  renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('Nothing to do yet.');
  openTab('Stats');

  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();
  expect(screen.queryByText('0% done')).toBeNull();
});

test('reads the saved list when opened directly', async () => {
  await seed(true, false);
  renderRouter('./app', { initialUrl: '/stats' });

  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
});

test('updates when you switch back after changing the list', async () => {
  renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('Nothing to do yet.');
  openTab('Stats');
  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();

  openTab('To-dos');
  addTodo('Buy milk');
  addTodo('Walk dog');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
  openTab('Stats');

  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('1 done')).toBeOnTheScreen();
  expect(screen.getByText('1 left')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
  expect(screen.queryByText('No to-dos yet')).toBeNull();
});

test('says it could not read a saved list that is not valid JSON', async () => {
  await AsyncStorage.setItem('todos', 'not json');
  renderRouter('./app', { initialUrl: '/stats' });

  expect(await screen.findByText("Couldn't read your to-dos.")).toBeOnTheScreen();
  expect(screen.queryByText('No to-dos yet')).toBeNull();
});
