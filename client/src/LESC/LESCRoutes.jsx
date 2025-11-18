import { Routes, Route, Navigate } from 'react-router';

import Availability from './Availability';
import Holds from './Holds';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='availability' element={<Availability />} />
      <Route path='holds' element={<Holds />} />
      <Route path='' element={<Navigate to='availability' />} />
    </Routes>
  );
}

export default LESCRoutes;

