import { useEffect } from 'react';
import { StatusCodes } from 'http-status-codes';
import { useQuery } from '@tanstack/react-query';

import { authContext, AuthContextValue } from './AuthContext';
import Api from './Api';

function AuthContextProvider ({ children }) {
  const value = AuthContextValue();

  // Fetch user on mount and keep it updated
  const { data, isSuccess } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => Api.users.me().then((response) => response.status === StatusCodes.OK ? response.data : null),
    retry: false, // Don't retry on 401 - user is just not logged in
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  useEffect(() => {
    if (isSuccess) {
      value.setUser(data);
    } else if (data === null) {
      // Explicitly set to null if API returns null (not logged in)
      value.setUser(null);
    }
  }, [data, isSuccess, value]);

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}

export default AuthContextProvider;
