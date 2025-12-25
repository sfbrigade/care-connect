import { locationContext, LocationContextValue } from './LocationContext';

function LocationContextProvider ({ children }) {
  const value = LocationContextValue();
  return <locationContext.Provider value={value}>{children}</locationContext.Provider>;
}

export default LocationContextProvider;
