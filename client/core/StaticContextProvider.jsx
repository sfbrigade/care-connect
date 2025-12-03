import { staticContext } from './StaticContext';

function StaticContextProvider ({ value, children }) {
  return <staticContext.Provider value={value}>{children}</staticContext.Provider>;
}

export default StaticContextProvider;
