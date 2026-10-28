import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const todo = (id: string, done: boolean) => ({ id, title: `Task ${id}`, done, pinned: false });

function renderApp() {
  return renderRouter(
    {
      '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
      '(tabs)/index': require('@/app/(tabs)/index').default,
      '(tabs)/stats': require('@/app/(tabs)/stats').default,
    },
    { initialUrl: '/' }
  );
}

beforeEach(() => AsyncStorage.clear());

test('shows the counts and rounded percentage for the saved list', async () => {
  await AsyncStorage.setItem(
    'todos',
    JSON.stringify([todo('1', true), todo('2', true), todo('3', false), todo('4', false), todo('5', false)])
  );
  renderApp();
  await screen.findByText('All');

  fireEvent.press(screen.getByRole('button', { name: /Stats/ }));

  expect(await screen.findByText('5 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('2 done')).toBeOnTheScreen();
  expect(screen.getByText('3 left')).toBeOnTheScreen();
  expect(screen.getByText('40% done')).toBeOnTheScreen();
});

test('rounds the percentage to a whole number', async () => {
  await AsyncStorage.setItem('todos', JSON.stringify([todo('1', true), todo('2', false), todo('3', false)]));
  renderApp();
  await screen.findByText('All');

  fireEvent.press(screen.getByRole('button', { name: /Stats/ }));

  expect(await screen.findByText('33% done')).toBeOnTheScreen();
});

test('says there are no to-dos when the list is empty', async () => {
  renderApp();
  await screen.findByText('All');

  fireEvent.press(screen.getByRole('button', { name: /Stats/ }));

  expect(await screen.findByText('No to-dos yet')).toBeOnTheScreen();
  expect(screen.queryByText(/% done/)).toBeNull();
});

test('updates when you switch back after changing the list', async () => {
  renderApp();
  await screen.findByText('All');

  fireEvent.press(screen.getByRole('button', { name: /Stats/ }));
  await screen.findByText('No to-dos yet');

  fireEvent.press(screen.getByRole('button', { name: /To-dos/ }));
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  fireEvent.changeText(screen.getByPlaceholderText('What needs doing?'), 'Buy bread');
  fireEvent.press(screen.getByRole('button', { name: 'Add' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));

  fireEvent.press(screen.getByRole('button', { name: /Stats/ }));

  expect(await screen.findByText('2 to-dos')).toBeOnTheScreen();
  expect(screen.getByText('1 done')).toBeOnTheScreen();
  expect(screen.getByText('1 left')).toBeOnTheScreen();
  expect(screen.getByText('50% done')).toBeOnTheScreen();
});
