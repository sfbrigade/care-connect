import { Navigate, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { StatusCodes } from 'http-status-codes';
import { Loader, Container } from '@mantine/core';

import { useAuthContext } from '../core/AuthContext';
import { handleRedirects } from './AppRedirectsConfig';
import Api from '../core/Api';

function AppRedirects ({ children }) {
  const location = useLocation();
  const authContext = useAuthContext();

  // Ensure user state is loaded before checking auth
  const { isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => Api.users.me().then((response) => response.status === StatusCodes.OK ? response.data : null),
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Show loading while checking auth state
  if (isLoading && !authContext.user) {
    return (
      <Container ta="center" py="xl">
        <Loader />
      </Container>
    );
  }

  const result = handleRedirects(authContext, location, location.pathname, (to, state) => {
    if (state) {
      return <Navigate to={to} state={state} replace />;
    }
    return <Navigate to={to} replace />;
  });
  return result || children;
}
export default AppRedirects;
