import { Routes, Route, Navigate } from 'react-router';

import { useAuthContext } from '@/AuthContext';
import { getDefaultPathForUser } from '@/AppRedirectsConfig';
import Holds from '../components/Holds';
import Care from '../components/care/Care';
import Custody from '../components/custody/Custody';
import CustodyDetail from '../components/custody/CustodyDetail';
import IncidentForm from '../components/IncidentForm';
import SubjectForm from '../components/SubjectForm';
import Deflection from '../components/Deflection';
import DeflectionForm from '../components/DeflectionForm';
import PropertyForm from '../components/PropertyForm';
import NarcoticsForm from '../components/NarcoticsForm';

function LESCRoutes () {
  const { user } = useAuthContext();
  const defaultPath = getDefaultPathForUser(user);

  return (
    <Routes>
      <Route path='holds/:id/deflection' element={<DeflectionForm />} />
      <Route path='holds/:id/narcotics' element={<NarcoticsForm />} />
      <Route path='holds/:id/property' element={<PropertyForm />} />
      <Route path='holds/:id/subject' element={<SubjectForm />} />
      <Route path='holds/:id' element={<Deflection />} />
      <Route path='holds' element={<Holds />} />
      <Route path='incident' element={<IncidentForm />} />
      <Route path='custody/:id/subject' element={<SubjectForm />} />
      <Route path='custody/:id' element={<CustodyDetail />} />
      <Route path='custody' element={<Custody />} />
      <Route path='care/:id' element={<CustodyDetail viewerMode='care' />} />
      <Route path='care' element={<Care />} />
      <Route path='' element={<Navigate to={defaultPath} />} />
    </Routes>
  );
}

export default LESCRoutes;
