import { Routes, Route, Navigate } from 'react-router';

import Availability from './Availability';
import Holds from './Holds';
import HoldSuccess from './HoldSuccess';
import IntakeForm from './IntakeForm';
import CheckIn from './CheckIn';
import HoldsHistory from './HoldsHistory';
import Unavailable from './Unavailable';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='availability' element={<Availability />} />
      <Route path='holds' element={<Holds />} />
      <Route path='success' element={<HoldSuccess />} />
      <Route path='intake' element={<IntakeForm />} />
      <Route path='intake/:holdId' element={<IntakeForm />} />
      <Route path='checkin/:holdId' element={<CheckIn />} />
      <Route path='history' element={<HoldsHistory />} />
      <Route path='unavailable' element={<Unavailable />} />
      <Route path='' element={<Navigate to='availability' />} />
    </Routes>
  );
}

export default LESCRoutes;
