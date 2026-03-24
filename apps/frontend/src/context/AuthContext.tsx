import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@c_chat/frontend/stores';

const AuthContext = React.createContext(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isSignedIn, autoSignIn } = useUserStore();

  const checkAuth = async () => {
    await autoSignIn();

    const path = location.pathname;
    const isAuthPage = path.startsWith('/auth/');

    if (!isSignedIn() && !isAuthPage) {
      navigate('/auth/sign-in', { replace: true });
      return;
    }

    if (isSignedIn() && isAuthPage) {
      navigate('/', { replace: true });
    }
  };
  useEffect(() => {
    checkAuth();
  }, []);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
};
