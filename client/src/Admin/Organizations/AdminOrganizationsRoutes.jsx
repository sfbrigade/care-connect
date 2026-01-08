import { Routes, Route } from 'react-router';

import AdminOrganizationsList from './AdminOrganizationsList';
import AdminOrganizationForm from './AdminOrganizationForm';
import AdminTitlesRoutes from './Titles/AdminTitlesRoutes';
import AdminUnitsRoutes from './Units/AdminUnitsRoutes';

function AdminOrganizationsRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminOrganizationForm />} />
      <Route path=':organizationId/titles/*' element={<AdminTitlesRoutes />} />
      <Route path=':organizationId/units/*' element={<AdminUnitsRoutes />} />
      <Route path=':organizationId' element={<AdminOrganizationForm />} />
      <Route path='' element={<AdminOrganizationsList />} />
    </Routes>
  );
}

export default AdminOrganizationsRoutes;
