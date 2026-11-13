import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHead } from '@unhead/react';
import { Route, Routes } from 'react-router';

import './App.css';

import AuthContextProvider from './AuthContextProvider';
import PosthogProvider from './analytics/PosthogProvider';
import { useStaticContext } from './StaticContext';
import { ToastProvider } from './components/ToastContext';
import ToastContainer from './components/ToastContainer';
import FacilityContextProvider from './FacilityContextProvider';
import FacilitySelector from './FacilitySelector';
import SmsTermsPage from './SmsTermsPage';

import AppTheme from './AppTheme';
import AppLayout from './AppLayout';

const queryClient = new QueryClient();

// The core app: auth/facility providers, the facility gate, and the header/layout
// shell (with per-user chrome like the mute status). Everything except standalone
// public pages renders here.
function CoreApp () {
  return (
    <ModalsProvider>
      <ToastProvider>
        <AuthContextProvider>
          <FacilityContextProvider>
            <FacilitySelector>
              <PosthogProvider />
              <ToastContainer />
              <AppLayout />
            </FacilitySelector>
          </FacilityContextProvider>
        </AuthContextProvider>
      </ToastProvider>
    </ModalsProvider>
  );
}

function App () {
  const staticContext = useStaticContext();

  useHead({
    titleTemplate: `%s - ${staticContext?.env?.VITE_SITE_TITLE ?? 'CareConnectSF'}`
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={AppTheme} forceColorScheme='light'>
        <Routes>
          {/* Standalone public legal page: no app chrome, auth, facility, or user data.
              Rendered above the app shell so it's reachable while logged out (e.g. for
              carrier / toll-free verification review). */}
          <Route path='/sms-terms' element={<SmsTermsPage />} />
          <Route path='*' element={<CoreApp />} />
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
