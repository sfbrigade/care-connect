import { createContext, useContext, useState } from 'react';

import { useStaticContext } from './StaticContext';

export const locationContext = createContext();

export function useLocationContext () {
  return useContext(locationContext);
}

export function LocationContextValue () {
  const staticContext = useStaticContext();
  const [location, setLocation] = useState(staticContext.location);
  return {
    location,
    setLocation,
  };
}
