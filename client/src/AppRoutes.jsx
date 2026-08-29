import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { Container, Loader } from '@mantine/core';

import AppRedirects from './AppRedirects';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';
import { useFacilityContext } from './FacilityContext';
import { useStaticContext } from './StaticContext';

import Login from './Login';
import PasswordsRoutes from './Passwords/PasswordsRoutes';
import InvitesRoutes from './Invites/InvitesRoutes';
import Register from './Register';
import NotFound from './NotFound';

const UnitSelector = lazy(() => import('./UnitSelector'));
const FeedbackViewer = lazy(() => import('./Feedback/FeedbackViewer'));
const FeedbackList = lazy(() => import('./Feedback/FeedbackList'));
const UserProfileRoutes = lazy(() => import('./UserProfile/UserProfileRoutes'));
const ManageUsersRoutes = lazy(() => import('./ManageUsers/ManageUsersRoutes'));
const DIDORoutes = lazy(() => import('./dido/routes/DIDORoutes'));
const LESCRoutes = lazy(() => import('./lesc/routes/LESCRoutes'));
const AdminRoutes = lazy(() => import('./Admin/AdminRoutes'));

function AppRoutes () {
  const { facility } = useFacilityContext();
  const staticContext = useStaticContext();

  return (
    <Routes>
      <Route
        path='*'
        element={
          <AppRedirects>
            <ChunkErrorBoundary>
              <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                <Routes>
                  <Route path='/login' element={<Login />} />
                  <Route path='/units' element={<UnitSelector />} />
                  <Route path='/passwords/*' element={<PasswordsRoutes />} />
                  <Route path='/invites/*' element={<InvitesRoutes />} />
                  {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && <Route path='/register' element={<Register />} />}
                  <Route path='/feedback' element={<FeedbackViewer />} />
                  <Route path='/feedback/list' element={<FeedbackList />} />
                  <Route path='/profile/*' element={<UserProfileRoutes />} />
                  <Route path='/manage-users/*' element={<ManageUsersRoutes />} />
                  <Route path='/admin/*' element={<AdminRoutes />} />
                  {!facility && <Route path='/*' element={<DIDORoutes />} />}
                  {facility?.type === 'LESC' && <Route path='/*' element={<LESCRoutes />} />}
                  <Route path='/*' element={<NotFound />} />
                </Routes>
              </Suspense>
            </ChunkErrorBoundary>
          </AppRedirects>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
