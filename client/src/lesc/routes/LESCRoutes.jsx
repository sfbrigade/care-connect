import { Routes, Route, Navigate } from 'react-router';

import Holds from '../components/Holds';
import IncidentForm from '../components/IncidentForm';
import SubjectForm from '../components/SubjectForm';
import Deflection from '../components/Deflection';
import DeflectionForm from '../components/DeflectionForm';
import PropertyForm from '../components/PropertyForm';
import NarcoticsForm from '../components/NarcoticsForm';

function LESCRoutes () {
  return (
    <Routes>
      <Route path='holds/:id/deflection' element={<DeflectionForm />} />
      <Route path='holds/:id/narcotics' element={<NarcoticsForm />} />
      <Route path='holds/:id/property' element={<PropertyForm />} />
      <Route path='holds/:id/subject' element={<SubjectForm />} />
      <Route path='holds/:id' element={<Deflection />} />
      <Route path='holds' element={<Holds />} />
      <Route path='incident' element={<IncidentForm />} />
      <Route path='' element={<Navigate to='holds' />} />
    </Routes>
  );
}

export default LESCRoutes;
