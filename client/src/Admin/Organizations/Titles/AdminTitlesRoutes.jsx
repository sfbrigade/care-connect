import { Routes, Route } from 'react-router';

import AdminTitlesList from './AdminTitlesList';
import AdminTitleForm from './AdminTitleForm';

function AdminTitlesRoutes () {
  return (
    <Routes>
      <Route path='new' element={<AdminTitleForm />} />
      <Route path=':titleId' element={<AdminTitleForm />} />
      <Route path='' element={<AdminTitlesList />} />
    </Routes>
  );
}

export default AdminTitlesRoutes;
