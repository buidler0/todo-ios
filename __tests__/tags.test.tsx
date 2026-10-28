import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodoScreen from '@/app/(tabs)/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => AsyncStorage.clear());
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

function titlesInOrder() {
  return screen.getAllByRole('checkbox').map((box) => box.props.accessibilityLabel);
}

function tagButtons() {
  return screen.queryAllByRole('button', { name: /^Tag / }).map((b) => b.props.accessibilityLabel);
}

const tagButton = (tag: string) => screen.getByRole('button', { name: `Tag ${tag}` });

test('lists each tag once in first-seen order, ignoring case and trailing punctuation', async () => {
  await renderWith(
    'Buy milk #shop',
    'Call mum',
    'Pay rent #Home.',
    'Buy eggs #SHOP, #home',
    'Not tags: # ## a#b (#paren) #!',
    'Fix bike #to-do!',
    'Café #café',
    'Compile #c++',
    "Ends #a) #b\" #c' #d; #e: #f? #g’ #h”"
  );

  expect(tagButtons()).toEqual([
    'Tag #shop',
    'Tag #Home',
    'Tag #to-do',
    'Tag #café',
    'Tag #c++',
    ...['#a', '#b', '#c', '#d', '#e', '#f', '#g', '#h'].map((tag) => `Tag ${tag}`),
  ]);
});

test('shows no tag row when no title has a tag', async () => {
  await renderWith('Buy milk', 'Walk dog');

  expect(tagButtons()).toEqual([]);
});

test('pressing a tag shows only its to-dos, and pressing it again shows them all', async () => {
  await renderWith('Buy milk #shop', 'Walk dog', 'Buy eggs #SHOP');
  expect(tagButton('#shop')).not.toBeSelected();

  fireEvent.press(tagButton('#shop'));
  expect(tagButton('#shop')).toBeSelected();
  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Buy eggs #SHOP']);

  fireEvent.press(tagButton('#shop'));
  expect(tagButton('#shop')).not.toBeSelected();
  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Walk dog', 'Buy eggs #SHOP']);
});

test('a selected tag stays selected when its first spelling is deleted', async () => {
  await renderWith('Buy milk #shop', 'Walk dog', 'Buy eggs #SHOP');
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk #shop' }));

  expect(tagButtons()).toEqual(['Tag #SHOP']);
  expect(tagButton('#SHOP')).toBeSelected();
  expect(titlesInOrder()).toEqual(['Buy eggs #SHOP']);
});

test('pressing another tag switches to it', async () => {
  await renderWith('Buy milk #shop', 'Walk dog #home', 'Buy eggs #shop');

  fireEvent.press(tagButton('#shop'));
  fireEvent.press(tagButton('#home'));

  expect(tagButton('#home')).toBeSelected();
  expect(tagButton('#shop')).not.toBeSelected();
  expect(titlesInOrder()).toEqual(['Walk dog #home']);
});

test('a tag narrows the All, Active and Done filters', async () => {
  await renderWith('Buy milk #shop', 'Walk dog', 'Buy eggs #shop');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk #shop' }));
  fireEvent.press(tagButton('#shop'));

  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Buy eggs #shop']);

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));
  expect(titlesInOrder()).toEqual(['Buy eggs #shop']);

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(titlesInOrder()).toEqual(['Buy milk #shop']);
  expect(tagButton('#shop')).toBeSelected();
});

test('a tag and a search both apply', async () => {
  await renderWith('Buy milk #shop', 'Walk dog', 'Buy eggs #shop');
  fireEvent.press(tagButton('#shop'));

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'MILK');
  expect(titlesInOrder()).toEqual(['Buy milk #shop']);

  fireEvent.changeText(screen.getByPlaceholderText('Search to-dos'), 'dog');
  expect(screen.getByText('No matching to-dos.')).toBeOnTheScreen();
});

test('says when the filter hides every to-do with the tag', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk #shop' }));
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Active' }));

  expect(screen.getByText('No active to-dos tagged #shop.')).toBeOnTheScreen();
  expect(tagButton('#shop')).toBeSelected();
});

test('keeps the tag button when the Done filter has no to-do with it', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Walk dog' }));

  fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(tagButton('#shop')).toBeOnTheScreen();
  fireEvent.press(tagButton('#shop'));

  expect(screen.getByText('No done to-dos tagged #shop.')).toBeOnTheScreen();
});

test('moving is not offered while a tag is selected', async () => {
  await renderWith('Buy milk #shop', 'Walk dog', 'Buy eggs #shop');
  expect(screen.getByRole('button', { name: 'Move Walk dog up' })).toBeOnTheScreen();

  fireEvent.press(tagButton('#shop'));
  expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();

  fireEvent.press(tagButton('#shop'));
  expect(screen.getByRole('button', { name: 'Move Walk dog up' })).toBeOnTheScreen();
});

test('the tag row keeps list order when a to-do is pinned', async () => {
  await renderWith('Buy milk #shop', 'Walk dog #home');

  fireEvent.press(screen.getByRole('button', { name: 'Pin Walk dog #home' }));

  expect(titlesInOrder()).toEqual(['Walk dog #home', 'Buy milk #shop']);
  expect(tagButtons()).toEqual(['Tag #shop', 'Tag #home']);
});

test('the tag row follows a moved to-do', async () => {
  await renderWith('Buy milk #shop', 'Walk dog #home');
  expect(tagButtons()).toEqual(['Tag #shop', 'Tag #home']);

  fireEvent.press(screen.getByRole('button', { name: 'Move Walk dog #home up' }));

  expect(tagButtons()).toEqual(['Tag #home', 'Tag #shop']);
});

test('deleting the last to-do with the tag shows the whole list, and Undo brings it back unselected', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk #shop' }));
  expect(tagButtons()).toEqual([]);
  expect(titlesInOrder()).toEqual(['Walk dog']);

  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Walk dog']);
  expect(tagButton('#shop')).not.toBeSelected();
});

test('saving the last tagged title empty, then Undo, brings it back unselected', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk #shop' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk #shop'), '  ');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(tagButtons()).toEqual([]);
  expect(titlesInOrder()).toEqual(['Walk dog']);

  fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Walk dog']);
  expect(tagButton('#shop')).not.toBeSelected();
});

test('editing the tag out of the last title removes the button and shows the whole list', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Edit Buy milk #shop' }));
  fireEvent.changeText(screen.getByLabelText('Edit Buy milk #shop'), 'Buy milk');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(tagButtons()).toEqual([]);
  expect(titlesInOrder()).toEqual(['Buy milk', 'Walk dog']);
});

test('clearing completed to-dos can remove the selected tag', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk #shop' }));
  fireEvent.press(tagButton('#shop'));

  fireEvent.press(screen.getByRole('button', { name: 'Clear completed' }));

  expect(tagButtons()).toEqual([]);
  expect(titlesInOrder()).toEqual(['Walk dog']);
});

test('adding a to-do with a forgotten tag does not narrow the list', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(tagButton('#shop'));
  fireEvent.press(screen.getByRole('button', { name: 'Delete Buy milk #shop' }));

  addTodo('Buy jam #shop');

  expect(tagButton('#shop')).not.toBeSelected();
  expect(titlesInOrder()).toEqual(['Walk dog', 'Buy jam #shop']);
});

test('a tag added in an edit gets a button', async () => {
  await renderWith('Buy milk', 'Walk dog');
  expect(tagButtons()).toEqual([]);

  fireEvent.press(screen.getByRole('button', { name: 'Edit Walk dog' }));
  fireEvent.changeText(screen.getByLabelText('Edit Walk dog'), 'Walk dog #home');
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(tagButtons()).toEqual(['Tag #home']);
});

test('the tag buttons are disabled until the saved data has loaded', async () => {
  let finishLoading: (saved: [string, string | null][]) => void = () => {};
  jest.spyOn(AsyncStorage, 'multiGet').mockReturnValueOnce(
    new Promise((resolve) => {
      finishLoading = resolve;
    })
  );
  render(<TodoScreen />);
  addTodo('Buy milk #shop');

  expect(tagButton('#shop')).toBeDisabled();

  await act(async () => finishLoading([['todos', null], ['filter', null], ['sort', null]]));

  expect(tagButton('#shop')).toBeEnabled();
});

test('never saves the selected tag', async () => {
  await renderWith('Buy milk #shop', 'Walk dog');
  fireEvent.press(tagButton('#shop'));

  screen.unmount();
  render(<TodoScreen />);
  await screen.findByRole('checkbox', { name: 'Buy milk #shop' });

  expect(tagButton('#shop')).not.toBeSelected();
  expect(titlesInOrder()).toEqual(['Buy milk #shop', 'Walk dog']);
  expect(await AsyncStorage.getAllKeys()).toEqual(['todos']);
});
