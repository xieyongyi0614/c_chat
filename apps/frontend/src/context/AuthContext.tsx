import React, { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@c_chat/frontend/stores';
import { ipc } from '@c_chat/shared-utils';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { WebContentEvents } from '@c_chat/shared-types';

const AuthContext = React.createContext(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isSignedIn, setUserInfo } = useUserStore();

  const handleSocketConnSuccess = useCallback<WebContentEvents['socketConnSuccess']>(
    (data) => {
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
        console.log('socketConnSuccess', data);
      }
    },
    [isSignedIn, location.pathname, navigate, setUserInfo],
  );

  useEffect(() => {
    ipc.AutoSignIn();
  }, []);

  useEffect(() => {
    window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, handleSocketConnSuccess);
    console.log('socketConnSuccess');
    return () => {
      window.c_chat.off(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, handleSocketConnSuccess);
    };
  }, [handleSocketConnSuccess]);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
};
