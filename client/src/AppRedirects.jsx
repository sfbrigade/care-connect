import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader, Container } from '@mantine/core';

import { useAuthContext } from '@/AuthContext';
import { useToast } from '@/components/ToastContext';
import { handleRedirects } from './AppRedirectsConfig';

const BLOCKED_TOAST = {
  title: "Couldn't update work mode",
  body: 'You have active field work. Transfer, hand off, or cancel active holds (or close out your arrival) before switching work modes.',
};

function AppRedirects ({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authContext = useAuthContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // When the work-mode guard redirected the user here, show a toast and
  // strip the marker so a refresh doesn't re-fire.
  useEffect(() => {
    if (location.state?.workModeBlocked) {
      showToast(BLOCKED_TOAST.title, 'error', 5000, BLOCKED_TOAST.body);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate, showToast]);

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

  const result = handleRedirects(
    authContext,
    location,
    location.pathname,
    (to, state) => {
      if (state) {
        return <Navigate to={to} state={state} replace />;
      }
      return <Navigate to={to} replace />;
    },
    { hasActiveFieldWork: !!data?.hasActiveFieldWork }
  );
  return result || children;
}

export default AppRedirects;
