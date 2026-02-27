import { createContext, useContext, useState } from 'react';

import { useStaticContext } from './StaticContext';

export const facilityContext = createContext();

export function useFacilityContext () {
  return useContext(facilityContext);
}

export function FacilityContextValue () {
  const staticContext = useStaticContext();

  const [facility, setFacility] = useState(() => {
    if (import.meta.env.DEV && !!window) {
      try {
        const saved = window.localStorage.getItem('selectedFacility');
        return saved ? JSON.parse(saved) : staticContext.facility;
      } catch {
        // Corrupted localStorage, clear it and use default
        window.localStorage.removeItem('selectedFacility');
      }
    }
    return staticContext.facility;
  });

  const setFacilityWithPersistence = (newFacility) => {
    setFacility(newFacility);
    if (import.meta.env.DEV && !!window) {
      if (newFacility?.subdomain) {
        window.localStorage.setItem('selectedFacility', JSON.stringify(newFacility));
      } else {
        window.localStorage.removeItem('selectedFacility');
      }
    }
  };

  return {
    facility,
    setFacility: setFacilityWithPersistence,
  };
}
