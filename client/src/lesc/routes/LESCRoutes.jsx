import { Routes, Route, Navigate } from 'react-router';

import Holds from '../components/Holds';
import HoldSuccess from '../components/HoldSuccess';
import IntakeForm from '../components/IntakeForm';
import CheckIn from '../components/CheckIn';
import HoldsHistory from '../components/HoldsHistory';
import Unavailable from '../components/Unavailable';
import ClientView from '../components/ClientView';
import IncidentView from '../components/IncidentView';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='holds' element={<Holds />} />
      <Route path='success' element={<HoldSuccess />} />
      <Route path='intake' element={<IntakeForm />} />
      <Route path='intake/:holdId' element={<IntakeForm />} />
      <Route path='checkin/:holdId' element={<CheckIn />} />
      <Route path='checkin' element={<CheckIn />} />
      <Route path='history' element={<HoldsHistory />} />
      <Route path='unavailable' element={<Unavailable />} />
      <Route path='client/:clientId' element={<ClientView />} />
      <Route path='client' element={<ClientView />} />
      <Route path='incident/:incidentId' element={<IncidentView />} />
      <Route path='incident' element={<IncidentView />} />
      <Route path='clients/:clientId' element={<IntakeForm />} />
      <Route path='' element={<Navigate to='holds' />} />
    </Routes>
  );
}

export default LESCRoutes;
