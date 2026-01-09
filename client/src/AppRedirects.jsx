import { Navigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader, Container } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';
import { handleRedirects } from './AppRedirectsConfig';

function AppRedirects ({ children }) {
  const location = useLocation();
  const authContext = useAuthContext();
  const queryClient = useQueryClient();

  // Ensure user state is loaded before checking auth
  const data = queryClient.getQueryData(['users', 'me']);
  // Show loading while checking auth state
  if (data === undefined) {
    return (
      <Container ta='center' py='xl'>
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
