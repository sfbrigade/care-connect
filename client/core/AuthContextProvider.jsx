import { authContext, AuthContextValue } from './AuthContext';

function AuthContextProvider ({ children }) {
  const value = AuthContextValue();
  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}

export default AuthContextProvider;
