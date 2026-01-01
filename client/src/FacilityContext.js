import { createContext, useContext, useState } from 'react';

import { useStaticContext } from './StaticContext';

export const facilityContext = createContext();

export function useFacilityContext () {
  return useContext(facilityContext);
}

export function FacilityContextValue () {
  const staticContext = useStaticContext();
  const [facility, setFacility] = useState(staticContext.facility);
  return {
    facility,
    setFacility,
  };
}
