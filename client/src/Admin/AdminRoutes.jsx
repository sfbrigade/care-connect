import { Navigate, Routes, Route } from 'react-router';

import AdminInvitesRoutes from './Invites/AdminInvitesRoutes';
import AdminUsersRoutes from './Users/AdminUsersRoutes';
import AdminFacilitiesRoutes from './Facilities/AdminFacilitiesRoutes';

function AdminRoutes () {
  return (
    <Routes>
      <Route path='invites/*' element={<AdminInvitesRoutes />} />
      <Route path='users/*' element={<AdminUsersRoutes />} />
      <Route path='facilities/*' element={<AdminFacilitiesRoutes />} />
      <Route path='' element={<Navigate to='users' />} />
    </Routes>
  );
}

export default AdminRoutes;
