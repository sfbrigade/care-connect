import { Routes, Route } from 'react-router';

import AdminFacilitiesList from './AdminFacilitiesList';
import AdminFacilityForm from './AdminFacilityForm';
import AdminFacilityStatusForm from './AdminFacilityStatusForm';
import AdminBedTypesList from './BedTypes/AdminBedTypesList';
import AdminBedTypeForm from './BedTypes/AdminBedTypeForm';

function AdminFacilitiesRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminFacilityForm />} />
      <Route path=':facilityId/status' element={<AdminFacilityStatusForm />} />
      <Route path=':facilityId/bed-types/new' element={<AdminBedTypeForm />} />
      <Route path=':facilityId/bed-types/:bedTypeId' element={<AdminBedTypeForm />} />
      <Route path=':facilityId/bed-types' element={<AdminBedTypesList />} />
      <Route path=':facilityId' element={<AdminFacilityForm />} />
      <Route path='' element={<AdminFacilitiesList />} />
    </Routes>
  );
}

export default AdminFacilitiesRoutes;
