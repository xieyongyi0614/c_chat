import { useCallback, useEffect, useRef, type FC, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStore, useUserStore, useChatStore } from '@c_chat/frontend/stores';
import { ipc } from '@c_chat/shared-utils';
import { ELECTRON_TO_CLIENT_CHANNELS, SOCKET_ERROR_CODE } from '@c_chat/shared-config';
import type { WebContentEventType, LocalMessageListItem } from '@c_chat/shared-types';
import { toast } from 'sonner';

export const CheckAuth: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { setBackdropLoading, setBackdropLoadingText } = useGlobalStore();
  const { isSignedIn, setUserInfo, userInfo } = useUserStore();
  const { addMessage, updateConversationSnapshot } = useChatStore();

  // 使用 ref 追踪当前用户 ID，避免闭包问题
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (userInfo?.id) {
      currentUserIdRef.current = userInfo.id;
    }
  }, [userInfo?.id]);

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

  const initSignIn = async () => {
    setBackdropLoading(true);
    setBackdropLoadingText('Connecting...');
    try {
      await ipc.AutoSignIn();
    } catch (err) {
      console.log('autoSignIn 失败', err);
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
        console.log('error');
        if (data.errorCode === SOCKET_ERROR_CODE.UNAUTHORIZED) {
          checkAuth();
          setBackdropLoading(false);
        }
        toast.error(data.errorMessage);
      }),
      // 监听实时消息推送
      window.c_chat.on(ELECTRON_TO_CLIENT_CHANNELS.SocketMessage, (data) => {
        console.log('收到新消息:', data);
        if (data) {
          const message: LocalMessageListItem = {
            id: data.id,
            senderId: data.senderId,
            conversationId: data.conversationId,
            content: data.content,
            type: data.type,
            state: 0,
            createTime: Number(data.createTime),
            updateTime: Number(data.updateTime),
          };

          // 判断是否是自己发送的消息（使用 ref 避免闭包问题）
          const isOwnMessage = data.senderId === currentUserIdRef.current;

          if (isOwnMessage) {
            // 自己发的消息不重复添加（发送者已在 MiddleColumn 中处理）
            console.log('收到自己发送的消息推送，忽略重复添加');
          } else {
            // 他人发的消息：添加到消息列表
            addMessage(message);
            // 更新会话列表的快照和未读数
            updateConversationSnapshot(data.conversationId, data.content, Number(data.createTime));
          }
        }
      }),
    ];

    return subscribeAll(unSubscriptions);
  }, [addMessage, updateConversationSnapshot, checkAuth, setBackdropLoading, setUserInfo]);

  return children;
};
