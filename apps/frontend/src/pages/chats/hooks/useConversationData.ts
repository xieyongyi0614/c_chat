import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type {
  GetConversationListParams,
  GetLocalConversationListParams,
} from '@c_chat/shared-types';
import { ipc, to, transformListParams } from '@c_chat/shared-utils';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const REMOTE_REFRESH_INTERVAL = 30_000;

/**
 * 会话列表数据获取：
 * - 进入页面时并行触发本地缓存与线上请求，远端优先；
 * - 周期 + 可见性变更时仅在线时刷新，并通过 lastSync 去重；
 * - 切换用户时复位 sequence，避免上一用户的回包污染当前数据。
 */
export const useConversationData = () => {
  const userId = useUserStore((s) => s.userInfo?.id);
  const setConversationData = useChatStore((s) => s.setConversationData);

  // 用于丢弃过期回包：每次会话切换或用户变更时自增。
  const requestSeqRef = useRef(0);
  // 远端是否已为当前 seq 写入过数据；写入后忽略后到的本地缓存。
  const remoteResolvedRef = useRef(false);

  const fetchLocalConversationData = useCallback(
    async (param?: GetLocalConversationListParams) => {
      const seq = requestSeqRef.current;
      const [err, res] = await to(ipc.GetLocalConversationList(param));
      if (seq !== requestSeqRef.current) return;
      if (err) {
        console.error('获取本地缓存会话列表失败:', err);
        toast.error('获取本地缓存会话列表失败');
        return;
      }
      if (res && !remoteResolvedRef.current) {
        setConversationData(res);
      }
    },
    [setConversationData],
  );

  const fetchConversationData = useCallback(
    async (params?: GetConversationListParams) => {
      const seq = requestSeqRef.current;
      const newParams = transformListParams(params);
      const [err, res] = await to(ipc.GetConversationList(newParams));
      if (seq !== requestSeqRef.current) return;
      if (err) {
        console.error('获取会话列表失败:', err);
        toast.error('获取会话列表失败');
        return;
      }
      if (res) {
        remoteResolvedRef.current = true;
        setConversationData(res);
      }
    },
    [setConversationData],
  );

  // 初次进入或用户切换：并行获取本地 + 远端。
  useEffect(() => {
    if (!userId) return;
    requestSeqRef.current += 1;
    remoteResolvedRef.current = false;
    fetchLocalConversationData();
    fetchConversationData();
  }, [userId, fetchLocalConversationData, fetchConversationData]);

  // 周期 + 可见性同步：仅在可见且距上次同步超过阈值时请求远端。
  useEffect(() => {
    if (!userId) return;

    let lastSyncAt = Date.now();
    const syncIfDue = (force = false) => {
      if (document.visibilityState !== 'visible') return;
      if (!force && Date.now() - lastSyncAt < REMOTE_REFRESH_INTERVAL) return;
      lastSyncAt = Date.now();
      fetchConversationData();
    };

    const onVisibilityChange = () => syncIfDue();
    const timer = window.setInterval(() => syncIfDue(true), REMOTE_REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, fetchConversationData]);

  return { fetchConversationData, fetchLocalConversationData };
};
