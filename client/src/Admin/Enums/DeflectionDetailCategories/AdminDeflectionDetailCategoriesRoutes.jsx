import { Routes, Route } from 'react-router';

import AdminDeflectionDetailCategoriesForm from './AdminDeflectionDetailCategoriesForm';
import AdminDeflectionDetailCategoriesList from './AdminDeflectionDetailCategoriesList.jsx';

function AdminDeflectionDetailCategories () {
  return (
    <Routes>
      <Route path='new' element={<AdminDeflectionDetailCategoriesForm />} />
      <Route path=':reasonId' element={<AdminDeflectionDetailCategoriesForm />} />
      <Route path='' element={<AdminDeflectionDetailCategoriesList />} />
    </Routes>
  );
}

export default AdminDeflectionDetailCategories;
