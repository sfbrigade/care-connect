import { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import '@mantine/core/styles.css';
import { AppShell, Container, Loader, MantineProvider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHead } from '@unhead/react';

import './App.css';

import AuthContextProvider from '../core/AuthContextProvider';
import PosthogProvider from './analytics/PosthogProvider';
import { useStaticContext } from '../core/StaticContext';
import { getLocation } from '../core/utils/location';
import { ToastProvider } from '../core/components/ToastContext';
import ToastContainer from '../core/components/ToastContainer';
import AppRedirects from './AppRedirects';
import AppTheme from './AppTheme';
import Header from './Header';
import MobileNavbar from './MobileNavbar';
import Login from './Login';
import Home from './Home';
import InvitesRoutes from './Invites/InvitesRoutes';
import PasswordsRoutes from './Passwords/PasswordsRoutes';
import Register from './Register';
import UsersRoutes from './Users/UsersRoutes';
import FeedbackViewer from './Feedback/FeedbackViewer';
import FeedbackList from './Feedback/FeedbackList';
import NotFound from './NotFound';

const AdminRoutes = lazy(() => import('./Admin/AdminRoutes'));
const LESCRoutes = lazy(() => import('../apps/lesc/routes/LESCRoutes'));
const DIDORoutes = lazy(() => import('../apps/dido/routes/DIDORoutes'));
const DIDOHeader = lazy(() => import('../apps/dido/components/DIDOHeader'));
const LESCHeader = lazy(() => import('../apps/lesc/components/LESCHeader'));
const DIDOMobileNavbar = lazy(() => import('../apps/dido/components/DIDOMobileNavbar'));
const LESCMobileNavbar = lazy(() => import('../apps/lesc/components/LESCMobileNavbar'));

const queryClient = new QueryClient();

function App () {
  const [opened, { close, toggle }] = useDisclosure();
  const staticContext = useStaticContext();
  const location = useMemo(() => getLocation(staticContext), [staticContext]);
  const routeLocation = useLocation();
  
  useHead({
    titleTemplate: `%s - ${staticContext?.env?.VITE_SITE_TITLE ?? 'CareConnectSF'}`
  });

  // Determine which app routes to use based on location
  const AppRoutes = useMemo(() => {
    if (!location) return null; // No location found - will show 404
    return location.appType === 'lesc' ? LESCRoutes : DIDORoutes;
  }, [location]);

  // Determine which header and navbar to use based on location
  const HeaderComponent = useMemo(() => {
    if (!location) return Header; // Default header for shared routes (login, account, etc.)
    return location.appType === 'lesc' ? LESCHeader : DIDOHeader;
  }, [location]);

  const MobileNavbarComponent = useMemo(() => {
    if (!location) return MobileNavbar; // Default navbar for shared routes
    return location.appType === 'lesc' ? LESCMobileNavbar : DIDOMobileNavbar;
  }, [location]);

  // Check if we're on a DIDO route
  const isDIDORoute = routeLocation.pathname.startsWith('/dido') || (location && location.appType === 'dido');

  const appContent = (
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
                          <Route path='/feedback' element={<FeedbackViewer />} />
                          <Route path='/feedback/list' element={<FeedbackList />} />
                          {/* DIDO routes - support both subdomain and path-based routing */}
                          <Route
                            path='/dido/*' element={
                              <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                                <DIDORoutes />
                              </Suspense>
                            }
                          />
                          {/* LESC routes - support both subdomain and path-based routing */}
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
                          {/* App routes - location-aware routing for subdomain-based access */}
                          {AppRoutes ? (
                              <Route
                              path='/*' element={
                                <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                                  <AppRoutes />
                                </Suspense>
                              }
                            />
                          ) : (
                            <Route path='/*' element={<NotFound />} />
                          )}
                        </Routes>
                      </AppRedirects>
                    }
                  />
                </Routes>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={AppTheme}>
        <ModalsProvider>
          <ToastProvider>
            <AuthContextProvider>
              <PosthogProvider />
              <ToastContainer />
              {isDIDORoute ? (
                <AppShell
                  header={{ height: 60 }}
                  padding='md'
                >
                  <AppShell.Header>
                    <Suspense fallback={<Container h='100%'><Loader /></Container>}>
                      <HeaderComponent opened={opened} close={close} toggle={toggle} />
                    </Suspense>
                  </AppShell.Header>
                  <AppShell.Main px={0} style={{ paddingTop: '3px' }}>
                    {appContent}
                  </AppShell.Main>
                </AppShell>
              ) : (
                <AppShell
                  header={{ height: 60 }}
                  navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
                  padding='md'
                >
                  <AppShell.Header>
                    <Suspense fallback={<Container h='100%'><Loader /></Container>}>
                      <HeaderComponent opened={opened} close={close} toggle={toggle} />
                    </Suspense>
                  </AppShell.Header>
                  <AppShell.Navbar p='md'>
                    <Suspense fallback={<Loader />}>
                      <MobileNavbarComponent close={close} />
                    </Suspense>
                  </AppShell.Navbar>
                  <AppShell.Main px={0} style={{ paddingTop: '3px' }}>
                    {appContent}
                  </AppShell.Main>
                </AppShell>
              )}
            </AuthContextProvider>
          </ToastProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
