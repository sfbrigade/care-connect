import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

export default function useNow (interval = 1000, enabled = true) {
  const [now, setNow] = useState(DateTime.now());

  useEffect(() => {
    if (!enabled) return undefined;
    setNow(DateTime.now());
    const id = window.setInterval(() => setNow(DateTime.now()), interval);
    return () => window.clearInterval(id);
  }, [interval, enabled]);

  return now;
}
