import { Routes, Route, Navigate } from 'react-router';

import Home from '../components/Home';

function DIDORoutes () {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default DIDORoutes;

