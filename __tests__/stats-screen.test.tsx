import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, router } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import StatsScreen from '@/app/(tabs)/stats';
import { TODOS_KEY } from '@/lib/saved-todos';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());

const routes = {
  '(tabs)/_layout': () => (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'To-dos' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
    </Tabs>
  ),
  '(tabs)/index': () => <Text>home</Text>,
  '(tabs)/stats': StatsScreen,
};

function todos(total: number, done: number) {
  return Array.from({ length: total }, (_, i) => ({
    id: String(i),
    title: `To-do ${i}`,
    done: i < done,
    pinned: false,
  }));
}

async function save(list: unknown[]) {
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(list));
}

test('shows the counts for the saved list', async () => {
  await save(todos(5, 2));
  renderRouter(routes, { initialUrl: '/stats' });

  expect(await screen.findByText('5 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('2 done')).toBeOnTheScreen();
  expect(screen.getByText('3 left')).toBeOnTheScreen();
  expect(screen.getByText('40% done')).toBeOnTheScreen();
});

test('says so when the list is empty', async () => {
  renderRouter(routes, { initialUrl: '/stats' });

  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();
  expect(screen.queryByText(/% done/)).toBeNull();
});

test('counts a save from before to-dos could be pinned', async () => {
  await AsyncStorage.setItem(
    TODOS_KEY,
    JSON.stringify([
      { id: '1', title: 'Buy milk', done: true },
      { id: '2', title: 'Buy bread', done: false },
    ])
  );
  renderRouter(routes, { initialUrl: '/stats' });

  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
});

test('updates when you switch back after the list changed', async () => {
  await save(todos(5, 2));
  renderRouter(routes, { initialUrl: '/stats' });
  await screen.findByText('40% done');

  act(() => router.navigate('/'));
  await screen.findByText('home');
  await save(todos(2, 1));
  act(() => router.navigate('/stats'));

  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
});

test('shows nothing until the saved list has been read', async () => {
  let release: (raw: string | null) => void = () => {};
  jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  renderRouter(routes, { initialUrl: '/stats' });

  expect(screen.queryByText('No to-dos yet')).toBeNull();
  await act(async () => release(null));
  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();
});

test('says so when the saved list cannot be read', async () => {
  await AsyncStorage.setItem(TODOS_KEY, '{oops');
  renderRouter(routes, { initialUrl: '/stats' });

  expect(await screen.findByText("Couldn't read your saved to-dos")).toBeOnTheScreen();
  expect(screen.queryByText(/% done/)).toBeNull();
});

test('never writes to storage', async () => {
  const setItem = jest.spyOn(AsyncStorage, 'setItem');
  await save(todos(1, 0));
  setItem.mockClear();
  renderRouter(routes, { initialUrl: '/stats' });
  await screen.findByText('1 to-do');

  expect(setItem).not.toHaveBeenCalled();
});
