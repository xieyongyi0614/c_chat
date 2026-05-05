import { useCallback, useEffect, type FC, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStore, useUserStore } from '@c_chat/frontend/stores';
import { ipc } from '@c_chat/shared-utils';
import { ELECTRON_TO_CLIENT_CHANNELS, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import type { WebContentEventType } from '@c_chat/shared-types';
import { toast } from 'sonner';

export const CheckAuth: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { setBackdropLoading, setBackdropLoadingText } = useGlobalStore();
  const { isSignedIn, setUserInfo } = useUserStore();

  const checkAuth = useCallback(() => {
    const path = location.pathname;
    const isAuthPage = path.startsWith('/auth/');
    const isSignIn = isSignedIn();
    if (!isSignIn && !isAuthPage) {
      navigate('/auth/sign-in', { replace: true });
      return;
    }
    if (isSignIn && isAuthPage) {
      navigate('/', { replace: true });
    }
  }, [isSignedIn, location.pathname, navigate]);

  const initSignIn = async () => {
    setBackdropLoading(true);
    setBackdropLoadingText('Connecting...');
    try {
      await ipc.AutoSignIn();
    } catch (err) {
      console.log('自动登录失败', err);
      checkAuth();
      setBackdropLoading(false);
    }
  };
  useEffect(() => {
    initSignIn();
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
          toast.success('登录成功');
        }
      }),
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketReconnecting, () => {
        console.log('socketReconnecting');
        setBackdropLoading(true);
      }),
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.ERROR, (data) => {
        console.log('error', data);
        if (data.errorCode === SOCKET_ERROR_CODE.UNAUTHORIZED) {
          checkAuth();
          setBackdropLoading(false);
        }
        toast.error(data.errorMessage);
      }),
    ];

    return subscribeAll(unSubscriptions);
  }, [checkAuth, setBackdropLoading, setUserInfo]);

  return children;
};
