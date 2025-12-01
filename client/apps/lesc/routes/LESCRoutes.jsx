import { Routes, Route } from 'react-router';

import Availability from '../components/Availability';
import Holds from '../components/Holds';
import HoldSuccess from '../components/HoldSuccess';
import IntakeForm from '../components/IntakeForm';
import CheckIn from '../components/CheckIn';
import HoldsHistory from '../components/HoldsHistory';
import Unavailable from '../components/Unavailable';
import Facilities from '../components/Facilities';

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
      <Route path='' element={<Facilities />} />
    </Routes>
  );
}

export default LESCRoutes;
