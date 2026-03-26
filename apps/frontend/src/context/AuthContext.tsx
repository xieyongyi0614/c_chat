import React, { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@c_chat/frontend/stores';
import { ipc } from '@c_chat/shared-utils';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';

const AuthContext = React.createContext(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isSignedIn, setUserInfo } = useUserStore();

  useEffect(() => {
    ipc.AutoSignIn();
    window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, (data) => {
      if (data) {
        setUserInfo(data);
        const path = location.pathname;
        const isAuthPage = path.startsWith('/auth/');
        if (!isSignedIn() && !isAuthPage) {
          navigate('/auth/sign-in', { replace: true });
          return;
        }
        if (isSignedIn() && isAuthPage) {
          navigate('/', { replace: true });
        }
      }
    });
  }, []);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
};
