import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { Container, Loader } from '@mantine/core';

import AppRedirects from './AppRedirects';
import { useFacilityContext } from './FacilityContext';
import { useStaticContext } from './StaticContext';

import Login from './Login';
import UnitSelector from './UnitSelector';
import PasswordsRoutes from './Passwords/PasswordsRoutes';
import InvitesRoutes from './Invites/InvitesRoutes';
import Register from './Register';
import UsersRoutes from './Users/UsersRoutes';
import FeedbackViewer from './Feedback/FeedbackViewer';
import FeedbackList from './Feedback/FeedbackList';
import NotFound from './NotFound';
import UserProfileRoutes from './UserProfile/UserProfileRoutes';

import DIDORoutes from './dido/routes/DIDORoutes';
import LESCRoutes from './lesc/routes/LESCRoutes';
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
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/units' element={<UnitSelector />} />
              <Route path='/passwords/*' element={<PasswordsRoutes />} />
              <Route path='/invites/*' element={<InvitesRoutes />} />
              {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && <Route path='/register' element={<Register />} />}
              <Route path='/account/*' element={<UsersRoutes />} />
              <Route path='/feedback' element={<FeedbackViewer />} />
              <Route path='/feedback/list' element={<FeedbackList />} />
              <Route path='/profile/*' element={<UserProfileRoutes />} />
              <Route
                path='/admin/*' element={
                  <Suspense fallback={<Container ta='center'><Loader /></Container>}>
                    <AdminRoutes />
                  </Suspense>
                }
              />
              {!facility && <Route path='/*' element={<DIDORoutes />} />}
              {facility?.type === 'LESC' && <Route path='/*' element={<LESCRoutes />} />}
              <Route path='/*' element={<NotFound />} />
            </Routes>
          </AppRedirects>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
