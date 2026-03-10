import { useState } from 'react';

export function useTabState (id, defaultValue) {
  const [value, setValue] = useState(window.sessionStorage.getItem(`_tabs-${id}`) || defaultValue);
  return [value, (newValue) => {
    window.sessionStorage.setItem(`_tabs-${id}`, newValue);
    setValue(newValue);
  }];
}

export default useTabState;
