import { Routes, Route } from 'react-router';

import AdminFacilitiesList from './AdminFacilitiesList';
import AdminFacilityForm from './AdminFacilityForm';
import AdminFacilityStatusForm from './AdminFacilityStatusForm';
import AdminBedStatusesList from './BedStatuses/AdminBedStatusesList';
import AdminBedStatusForm from './BedStatuses/AdminBedStatusForm';

function AdminFacilitiesRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminFacilityForm />} />
      <Route path=':facilityId/status' element={<AdminFacilityStatusForm />} />
      <Route path=':facilityId/bed-statuses/new' element={<AdminBedStatusForm />} />
      <Route path=':facilityId/bed-statuses/:bedStatusId' element={<AdminBedStatusForm />} />
      <Route path=':facilityId/bed-statuses' element={<AdminBedStatusesList />} />
      <Route path=':facilityId' element={<AdminFacilityForm />} />
      <Route path='' element={<AdminFacilitiesList />} />
    </Routes>
  );
}

export default AdminFacilitiesRoutes;
