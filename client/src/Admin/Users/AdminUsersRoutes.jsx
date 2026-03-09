import { Routes, Route } from 'react-router';

import AdminUsersList from './AdminUsersList';
import AdminUserForm from './AdminUserForm';

function AdminUsersRoutes () {
  return (
    <Routes>
      <Route path=':userId' element={<AdminUserForm />} />
      <Route path='' element={<AdminUsersList />} />
    </Routes>
  );
}

export default AdminUsersRoutes;
