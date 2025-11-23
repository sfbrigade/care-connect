import { Routes, Route } from 'react-router';

import AdminFacilitiesList from './AdminFacilitiesList';
import AdminFacilityDetail from './AdminFacilityDetail';

function AdminFacilitiesRoutes () {
  return (
    <Routes>
      <Route path='' element={<AdminFacilitiesList />} />
      <Route path=':id' element={<AdminFacilityDetail />} />
    </Routes>
  );
}

export default AdminFacilitiesRoutes;
