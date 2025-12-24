import { Routes, Route } from 'react-router';

import Home from '../components/Home';

function DIDORoutes () {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
    </Routes>
  );
}

export default DIDORoutes;
