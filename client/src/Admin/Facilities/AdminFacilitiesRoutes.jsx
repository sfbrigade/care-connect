import { Routes, Route } from 'react-router';

import AdminFacilitiesList from './AdminFacilitiesList';
import AdminFacilityForm from './AdminFacilityForm';
import AdminFacilityStatusForm from './AdminFacilityStatusForm';

function AdminFacilitiesRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminFacilityForm />} />
      <Route path=':facilityId/status' element={<AdminFacilityStatusForm />} />
      <Route path=':facilityId' element={<AdminFacilityForm />} />
      <Route path='' element={<AdminFacilitiesList />} />
    </Routes>
  );
}

export default AdminFacilitiesRoutes;
