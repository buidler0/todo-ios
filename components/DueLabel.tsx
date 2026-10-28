import { StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import { dueLabel, isOverdue, type DueDate } from '@/utils/dueDate';

type Props = {
  todo: { due?: DueDate; done: boolean };
  today: DueDate;
  onPress: () => void;
};

export function DueLabel({ todo, today, onPress }: Props) {
  const label = dueLabel(todo, today);
  if (!label) return null;
  return (
    <Text
      onPress={onPress}
      style={[styles.label, isOverdue(todo, today) && styles.overdue, todo.done && styles.done]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  overdue: {
    color: '#c0392b',
    opacity: 1,
  },
  done: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
