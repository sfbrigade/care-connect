import { createContext, useContext, useState } from 'react';

import { useStaticContext } from './StaticContext';

export const authContext = createContext();

export function useAuthContext () {
  return useContext(authContext);
}

export function AuthContextValue () {
  const staticContext = useStaticContext();
  const [user, setUser] = useState(staticContext.authContext?.user);
  return {
    user,
    setUser,
  };
}
