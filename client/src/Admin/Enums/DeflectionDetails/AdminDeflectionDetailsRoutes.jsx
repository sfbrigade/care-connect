import { Routes, Route } from 'react-router';

import AdminDeflectionDetailsList from './AdminDeflectionDetailsList.jsx';
import AdminDeflectionDetailForm from './AdminDeflectionDetailForm';

function AdminDeflectionDetailsRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminDeflectionDetailForm />} />
      <Route path=':reasonId' element={<AdminDeflectionDetailForm />} />
      <Route path='' element={<AdminDeflectionDetailsList />} />
    </Routes>
  );
}

export default AdminDeflectionDetailsRoutes;
