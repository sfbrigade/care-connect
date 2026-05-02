import { Route, Routes } from 'react-router';

import EditManagedUserPage from './EditManagedUserPage';
import ManagedUserDetailsPage from './ManagedUserDetailsPage';
import ManageUsersPage from './ManageUsersPage';

function ManageUsersRoutes () {
  return (
    <Routes>
      <Route path=':userId/edit/:section' element={<EditManagedUserPage />} />
      <Route path=':userId' element={<ManagedUserDetailsPage />} />
      <Route path='' element={<ManageUsersPage />} />
    </Routes>
  );
}

export default ManageUsersRoutes;
