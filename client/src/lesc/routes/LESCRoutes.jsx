import { Routes, Route, Navigate } from 'react-router';

import Holds from '../components/Holds';
import IntakeForm from '../components/IntakeForm';
import CheckIn from '../components/CheckIn';
import ClientView from '../components/ClientView';
import IncidentForm from '../components/IncidentForm';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='holds' element={<Holds />} />
      <Route path='intake' element={<IntakeForm />} />
      <Route path='intake/:holdId' element={<IntakeForm />} />
      <Route path='checkin/:holdId' element={<CheckIn />} />
      <Route path='checkin' element={<CheckIn />} />
      <Route path='client/:clientId' element={<ClientView />} />
      <Route path='client' element={<ClientView />} />
      <Route path='incident' element={<IncidentForm />} />
      <Route path='clients/:clientId' element={<IntakeForm />} />
      <Route path='' element={<Navigate to='holds' />} />
    </Routes>
  );
}

export default LESCRoutes;
