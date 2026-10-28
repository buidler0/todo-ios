import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import TabLayout from '@/app/(tabs)/_layout';
import TodoScreen from '@/app/(tabs)/index';
import StatsScreen from '@/app/(tabs)/stats';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

const save = (todos: { title: string; done: boolean }[]) =>
  AsyncStorage.setItem(
    'todos',
    JSON.stringify(todos.map((t, i) => ({ id: String(i), pinned: false, ...t })))
  );

function renderApp(initialUrl = '/stats') {
  return renderRouter(
    { '(tabs)/_layout': TabLayout, '(tabs)/index': TodoScreen, '(tabs)/stats': StatsScreen },
    { initialUrl }
  );
}

test('shows the totals and rounded percentage for the saved list', async () => {
  await save([
    { title: 'Buy milk', done: true },
    { title: 'Buy bread', done: true },
    { title: 'Buy eggs', done: false },
    { title: 'Walk dog', done: false },
    { title: 'Post letter', done: false },
  ]);
  renderApp();

  expect(await screen.findByText('5 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('2 done')).toBeOnTheScreen();
  expect(screen.getByText('3 left')).toBeOnTheScreen();
  expect(screen.getByText('40% done')).toBeOnTheScreen();
});

test('rounds the percentage to a whole number', async () => {
  await save([
    { title: 'Buy milk', done: true },
    { title: 'Buy bread', done: false },
    { title: 'Buy eggs', done: false },
  ]);
  renderApp();

  expect(await screen.findByText('33% done')).toBeOnTheScreen();
});

test('says one to-do in the singular', async () => {
  await save([{ title: 'Buy milk', done: false }]);
  renderApp();

  expect(await screen.findByText('1 to-do')).toBeOnTheScreen();
  expect(screen.getByText('0% done')).toBeOnTheScreen();
});

test('shows an empty message when nothing is saved', async () => {
  renderApp();

  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();
  expect(screen.queryByText(/done$/)).toBeNull();
});

test('updates when switching back after changing the list', async () => {
  await save([{ title: 'Buy milk', done: false }]);
  renderApp();
  expect(await screen.findByText('0% done')).toBeOnTheScreen();

  fireEvent.press(screen.getByLabelText(/^To-dos, tab/));
  fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy bread');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  await act(() => Promise.resolve());

  fireEvent.press(screen.getByLabelText(/^Stats, tab/));
  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('1 done')).toBeOnTheScreen();
  expect(screen.getByText('1 left')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
});
