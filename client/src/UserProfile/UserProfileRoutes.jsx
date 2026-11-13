import { Route, Routes } from 'react-router';

import EditContactDetailsPage from './EditContactDetailsPage';
import EditUserProfilePage from './EditUserProfilePage';
import NotificationSettingsPage from './NotificationSettingsPage';
import SmsEnrollmentPage from './SmsEnrollmentPage';
import UserProfilePage from './UserProfilePage';

function UserProfileRoutes () {
  return (
    <Routes>
      <Route path='edit' element={<EditUserProfilePage />} />
      <Route path='contact' element={<EditContactDetailsPage />} />
      <Route path='notifications/enroll' element={<SmsEnrollmentPage />} />
      <Route path='notifications' element={<NotificationSettingsPage />} />
      <Route path='' element={<UserProfilePage />} />
    </Routes>
  );
}

export default UserProfileRoutes;
