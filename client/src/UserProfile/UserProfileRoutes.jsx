import { Route, Routes } from 'react-router';

import EditUserProfilePage from './EditUserProfilePage';
import UserProfilePage from './UserProfilePage';

function UserProfileRoutes () {
  return (
    <Routes>
      <Route path='edit' element={<EditUserProfilePage />} />
      <Route path='' element={<UserProfilePage />} />
    </Routes>
  );
}

export default UserProfileRoutes;
