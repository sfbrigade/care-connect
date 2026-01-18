import { Routes, Route, Navigate } from 'react-router';

import Holds from '../components/Holds';
import CheckIn from '../components/CheckIn';
import ClientView from '../components/ClientView';
import IncidentForm from '../components/IncidentForm';
import SubjectForm from '../components/SubjectForm';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='holds/:id/subject' element={<SubjectForm />} />
      <Route path='holds' element={<Holds />} />
      <Route path='checkin/:holdId' element={<CheckIn />} />
      <Route path='checkin' element={<CheckIn />} />
      <Route path='client/:clientId' element={<ClientView />} />
      <Route path='client' element={<ClientView />} />
      <Route path='incident' element={<IncidentForm />} />
      <Route path='' element={<Navigate to='holds' />} />
    </Routes>
  );
}

export default LESCRoutes;
