import { useState } from 'react';

export function useSessionState (id, defaultValue) {
  const [value, setValue] = useState(window.sessionStorage.getItem(`_session-${id}`) || defaultValue);
  return [value, (newValue) => {
    window.sessionStorage.setItem(`_session-${id}`, newValue);
    setValue(newValue);
  }];
}

export default useSessionState;
