import { Routes, Route } from 'react-router';

import AdminUnitsList from './AdminUnitsList';
import AdminUnitForm from './AdminUnitForm';

function AdminUnitsRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminUnitForm />} />
      <Route path=':unitId' element={<AdminUnitForm />} />
      <Route path='' element={<AdminUnitsList />} />
    </Routes>
  );
}

export default AdminUnitsRoutes;
