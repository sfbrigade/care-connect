import { Routes, Route } from 'react-router';

import AdminDeflectionCancelReasonsList from './AdminDeflectionCancelReasonsList';
import AdminDeflectionCancelReasonForm from './AdminDeflectionCancelReasonForm';

function AdminDeflectionCancelReasonsRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminDeflectionCancelReasonForm />} />
      <Route path=':reasonId' element={<AdminDeflectionCancelReasonForm />} />
      <Route path='' element={<AdminDeflectionCancelReasonsList />} />
    </Routes>
  );
}

export default AdminDeflectionCancelReasonsRoutes;
