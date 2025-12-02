import { Navigate, useLocation } from 'react-router';
import { useAuthContext } from '../core/AuthContext';
import { handleRedirects } from './AppRedirectsConfig';

function AppRedirects ({ children }) {
  const location = useLocation();
  const authContext = useAuthContext();
  const result = handleRedirects(authContext, location, location.pathname, (to, state) => {
    if (state) {
      return <Navigate to={to} state={state} replaces />;
    }
    return <Navigate to={to} />;
  });
  return result || children;
}
export default AppRedirects;
