import { Routes, Route } from 'react-router';

import AdminUsersList from './AdminUsersList';
import AdminUserForm from './AdminUserForm';
import AdminUserSupportPage from './AdminUserSupportPage';

function AdminUsersRoutes () {
  return (
    <Routes>
      <Route path=':userId/support' element={<AdminUserSupportPage />} />
      <Route path=':userId' element={<AdminUserForm />} />
      <Route path='' element={<AdminUsersList />} />
    </Routes>
  );
}

export default AdminUsersRoutes;
