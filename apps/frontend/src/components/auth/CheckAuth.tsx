import { useCallback, useEffect, type FC, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStore, useUserStore } from '@c_chat/frontend/stores';
import { ipc } from '@c_chat/shared-utils';
import { ELECTRON_TO_CLIENT_CHANNELS } from '@c_chat/shared-config';
import type { WebContentEventType } from '@c_chat/shared-types';

export const CheckAuth: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { setBackdropLoading, setBackdropLoadingText } = useGlobalStore();
  const { isSignedIn, setUserInfo } = useUserStore();

  const checkAuth = useCallback(() => {
    const path = location.pathname;
    const isAuthPage = path.startsWith('/auth/');
    if (!isSignedIn() && !isAuthPage) {
      navigate('/auth/sign-in', { replace: true });
      return;
    }
    if (isSignedIn() && isAuthPage) {
      navigate('/', { replace: true });
    }
  }, [isSignedIn, location.pathname, navigate]);

  useEffect(() => {
    setBackdropLoading(true);
    setBackdropLoadingText('Connecting...');
    ipc.AutoSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribeAll = (subscriptions: ReturnType<WebContentEventType['on']>[]) => {
    return () => subscriptions.forEach((unSub) => unSub());
  };

  useEffect(() => {
    const unSubscriptions = [
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketConnSuccess, (data) => {
        if (data) {
          console.log('socketConnSuccess', data);
          setUserInfo(data);
          checkAuth();
          setBackdropLoading(false);
        }
      }),
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketReconnecting, () => {
        console.log('socketReconnecting');
        setBackdropLoading(true);
      }),
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketError, () => {
        console.log('socketError');
        checkAuth();
        setBackdropLoading(false);
      }),
    ];

    return subscribeAll(unSubscriptions);
  }, [checkAuth, setBackdropLoading, setUserInfo]);

  return children;
};
