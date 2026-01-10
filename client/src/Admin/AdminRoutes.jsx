import { Navigate, Routes, Route } from 'react-router';

import AdminInvitesRoutes from './Invites/AdminInvitesRoutes';
import AdminUsersRoutes from './Users/AdminUsersRoutes';
import AdminOrganizationsRoutes from './Organizations/AdminOrganizationsRoutes';
import AdminFacilitiesRoutes from './Facilities/AdminFacilitiesRoutes';
import AdminFacilityStatusReasonsRoutes from './FacilityStatusReasons/AdminFacilityStatusReasonsRoutes';

function AdminRoutes () {
  return (
    <Routes>
      <Route path='invites/*' element={<AdminInvitesRoutes />} />
      <Route path='users/*' element={<AdminUsersRoutes />} />
      <Route path='organizations/*' element={<AdminOrganizationsRoutes />} />
      <Route path='facilities/*' element={<AdminFacilitiesRoutes />} />
      <Route path='facility-status-reasons/*' element={<AdminFacilityStatusReasonsRoutes />} />
      <Route path='' element={<Navigate to='users' />} />
    </Routes>
  );
}

export default AdminRoutes;
