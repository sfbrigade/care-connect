import { Routes, Route } from 'react-router';

import AdminFacilityStatusReasonsList from './AdminFacilityStatusReasonsList';
import AdminFacilityStatusReasonForm from './AdminFacilityStatusReasonForm';

function AdminFacilityStatusReasonsRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminFacilityStatusReasonForm />} />
      <Route path=':reasonId' element={<AdminFacilityStatusReasonForm />} />
      <Route path='' element={<AdminFacilityStatusReasonsList />} />
    </Routes>
  );
}

export default AdminFacilityStatusReasonsRoutes;
