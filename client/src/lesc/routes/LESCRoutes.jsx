import { Routes, Route, Navigate } from 'react-router';

import { useAuthContext } from '@/AuthContext';
import { getDefaultPathForUser } from '@/AppRedirectsConfig';
import Holds from '../components/Holds';
import Care from '../components/care/Care';
import CareExitDetails from '../components/care/CareExitDetails';
import Custody from '../components/custody/Custody';
import CustodyDetail from '../components/custody/CustodyDetail';
import LegalReleaseQuestions from '../components/custody/LegalReleaseQuestions';
import RecordPropertyReturn from '../components/custody/RecordPropertyReturn';
import IncidentForm from '../components/IncidentForm';
import SubjectForm from '../components/SubjectForm';
import Deflection from '../components/Deflection';
import HandoffScreen from '../components/HandoffScreen';
import DeflectionForm from '../components/DeflectionForm';
import PropertyForm from '../components/PropertyForm';
import SubstanceForm from '../components/SubstanceForm';
import ManageCapacity from '../components/ManageCapacity/ManageCapacity';
import FormPage from '@/forms/FormPage';
import FormPreview from '@/forms/FormPreview';

function LESCRoutes () {
  const { user } = useAuthContext();
  const defaultPath = getDefaultPathForUser(user);

  return (
    <Routes>
      <Route path='holds/:id/substance' element={<SubstanceForm />} />
      <Route path='holds/:id/deflection' element={<DeflectionForm />} />
      <Route path='holds/:id/property' element={<PropertyForm />} />
      <Route path='holds/:id/subject' element={<SubjectForm />} />
      <Route path='holds/:id' element={<Deflection />} />
      <Route path='holds' element={<Holds />} />
      <Route path='incident' element={<IncidentForm />} />
      <Route path='incident/handoff' element={<HandoffScreen />} />
      <Route path='custody/:id/subject' element={<SubjectForm />} />
      <Route path='custody/:id/legal-release' element={<LegalReleaseQuestions />} />
      <Route path='custody/:id/property-return' element={<RecordPropertyReturn />} />
      <Route path='custody/:id' element={<CustodyDetail />} />
      <Route path='custody' element={<Custody />} />
      <Route path='care/:id' element={<CustodyDetail viewerMode='care' />} />
      <Route path='care/:id/exit' element={<CareExitDetails />} />
      <Route path='care' element={<Care />} />
      <Route path='manage-capacity' element={<ManageCapacity />} />
      <Route path='forms/:formId/:deflectionId' element={<FormPage />} />
      <Route path='forms/preview/:formId/:deflectionId' element={<FormPreview />} />
      <Route path='' element={<Navigate to={defaultPath} />} />
    </Routes>
  );
}

export default LESCRoutes;
