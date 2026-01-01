import { facilityContext, FacilityContextValue } from './FacilityContext';

function FacilityContextProvider ({ children }) {
  const value = FacilityContextValue();
  return <facilityContext.Provider value={value}>{children}</facilityContext.Provider>;
}

export default FacilityContextProvider;
