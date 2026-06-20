import { useState } from 'react';
import AdminLogin, { isAdminLoggedIn } from './AdminLogin';

export default function AdminGuard({ children }) {
  const [authenticated, setAuthenticated] = useState(() => isAdminLoggedIn());

  if (!authenticated) {
    return (
      <AdminLogin
        onLogin={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  return children;
}