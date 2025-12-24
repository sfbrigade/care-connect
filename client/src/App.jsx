import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHead } from '@unhead/react';

import './App.css';

import AuthContextProvider from './AuthContextProvider';
import PosthogProvider from './analytics/PosthogProvider';
import { useStaticContext } from './StaticContext';
import { ToastProvider } from './components/ToastContext';
import ToastContainer from './components/ToastContainer';
import LocationContextProvider from './LocationContextProvider';
import LocationSelector from './LocationSelector';

import AppTheme from './AppTheme';
import AppLayout from './AppLayout';

const queryClient = new QueryClient();

function App () {
  const staticContext = useStaticContext();

  useHead({
    titleTemplate: `%s - ${staticContext?.env?.VITE_SITE_TITLE ?? 'CareConnectSF'}`
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={AppTheme}>
        <ModalsProvider>
          <ToastProvider>
            <AuthContextProvider>
              <LocationContextProvider>
                <LocationSelector>
                  <PosthogProvider />
                  <ToastContainer />
                  <AppLayout />
                </LocationSelector>
              </LocationContextProvider>
            </AuthContextProvider>
          </ToastProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
