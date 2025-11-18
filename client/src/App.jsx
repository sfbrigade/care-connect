import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router';
import '@mantine/core/styles.css';
import { AppShell, Container, Loader, MantineProvider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHead } from '@unhead/react';

import './App.css';

import AuthContextProvider from './AuthContextProvider';
import PosthogProvider from './analytics/PosthogProvider';
import { useStaticContext } from './StaticContext';
import AppRedirects from './AppRedirects';
import AppTheme from './AppTheme';
import Header from './Header';
import MobileNavbar from './MobileNavbar';
import Home from './Home';
import Login from './Login';
import InvitesRoutes from './Invites/InvitesRoutes';
import PasswordsRoutes from './Passwords/PasswordsRoutes';
import Register from './Register';
import UsersRoutes from './Users/UsersRoutes';

const AdminRoutes = lazy(() => import('./Admin/AdminRoutes'));
const LESCRoutes = lazy(() => import('./LESC/LESCRoutes'));

const queryClient = new QueryClient();

function App () {
  const [opened, { close, toggle }] = useDisclosure();
  const staticContext = useStaticContext();
  useHead({
    titleTemplate: `%s - ${staticContext?.env?.VITE_SITE_TITLE ?? 'CareConnectSF'}`
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={AppTheme}>
        <ModalsProvider>
          <AuthContextProvider>
            <PosthogProvider />
            <AppShell
              header={{ height: 60 }}
              navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
              padding='md'
            >
              <AppShell.Header>
                <Header opened={opened} close={close} toggle={toggle} />
              </AppShell.Header>
              <AppShell.Navbar p='md'>
                <MobileNavbar close={close} />
              </AppShell.Navbar>
              <AppShell.Main px={0}>
                <Routes>
                  <Route
                    path='*'
                    element={
                      <AppRedirects>
                        <Routes>
                          <Route path='/' element={<Home />} />
                          <Route path='/login' element={<Login />} />
                          <Route path='/passwords/*' element={<PasswordsRoutes />} />
                          <Route path='/invites/*' element={<InvitesRoutes />} />
                          {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && <Route path='/register' element={<Register />} />}
                          <Route path='/account/*' element={<UsersRoutes />} />
                          <Route
                            path='/lesc/*' element={
                              <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                                <LESCRoutes />
                              </Suspense>
                            }
                          />
                          <Route
                            path='/admin/*' element={
                              <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                                <AdminRoutes />
                              </Suspense>
                            }
                          />
                        </Routes>
                      </AppRedirects>
                    }
                  />
                </Routes>
              </AppShell.Main>
            </AppShell>
          </AuthContextProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
