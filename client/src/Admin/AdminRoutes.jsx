import { Navigate, Routes, Route } from 'react-router';

import AdminInvitesRoutes from './Invites/AdminInvitesRoutes';
import AdminUsersRoutes from './Users/AdminUsersRoutes';
import AdminOrganizationsRoutes from './Organizations/AdminOrganizationsRoutes';
import AdminFacilitiesRoutes from './Facilities/AdminFacilitiesRoutes';
import AdminEnumsRoutes from './Enums/AdminEnumRoutes';
import AdminCanaryPage from './Canary/AdminCanaryPage';

function AdminRoutes () {
  return (
    <Routes>
      <Route path='invites/*' element={<AdminInvitesRoutes />} />
      <Route path='users/*' element={<AdminUsersRoutes />} />
      <Route path='organizations/*' element={<AdminOrganizationsRoutes />} />
      <Route path='facilities/*' element={<AdminFacilitiesRoutes />} />
      <Route path='enums/*' element={<AdminEnumsRoutes />} />
      <Route path='canary' element={<AdminCanaryPage />} />
      <Route path='' element={<Navigate to='users' />} />
    </Routes>
  );
}

export default AdminRoutes;
