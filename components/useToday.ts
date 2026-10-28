import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { localToday, type DueDate } from '@/utils/dueDate';

function msUntilMidnight(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
}

// Re-reads the date at local midnight and when the app returns to the foreground,
// where a timer that was due while suspended may not have fired yet.
export function useToday(): DueDate {
  const [today, setToday] = useState(localToday);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      setToday(localToday());
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilMidnight());
    }
    timer = setTimeout(refresh, msUntilMidnight());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
