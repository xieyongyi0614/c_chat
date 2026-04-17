import { useChatStore, useUserStore } from '@c_chat/frontend/stores';
import type { GetConversationListParams } from '@c_chat/shared-types';
import { ipc, to, transformListParams } from '@c_chat/shared-utils';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const useChatsData = () => {
  const { userInfo } = useUserStore();
  const { conversationData, setConversationData, selectedConversation, setMessageData } =
    useChatStore();
  const [search, setSearch] = useState('');

  const filteredChatList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return conversationData.list;
    return (
      conversationData.list.filter((item) => item.targetId.toLowerCase().includes(keyword)) ?? []
    );
  }, [conversationData.list, search]);

  const fetchConversationData = async (params?: GetConversationListParams) => {
    const newParams = transformListParams(params);
    const [err, res] = await to(ipc.GetConversationList(newParams));
    if (err) {
      console.error('Failed to fetch conversation list:', err);
      toast.error('获取会话列表失败');
      return;
    }

    if (res) {
      // const newData = { list: newList, pagination: transformPagination(res.pagination) };
      setConversationData(res);
      console.log(res, 'ConversationData');
    }
  };

  const fetchLocalMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(ipc.GetLocalMessageHistory({ conversationId }));
    if (err) {
      toast.error('获取本地消息失败');
      return;
    }
    console.log(err, res, 'fetchLocalMessageHistory');
    // if (res && res.list) setMessages(res.list);
    setMessageData(res);
  };

  const fetchMessageHistory = async (conversationId: string) => {
    const [err, res] = await to(
      ipc.GetMessageHistory({
        conversationId,
        pagination: { page: 1, pageSize: 50 },
      }),
    );
    console.log('fetchMessageHistory', res, err);
    if (res) {
      setMessageData(res);
    }
  };

  // const handleSendMessage = async (e?: React.FormEvent) => {
  //   e?.preventDefault();
  //   if ((!selectedConversation && !selectedUserForDraft) || !inputMessage.trim()) return;

  //   let convoId = selectedConversation?.id;

  //   // 如果是临时会话，先创建
  //   if (!convoId && selectedUserForDraft) {
  //     try {
  //       const newConvoRaw = await ipc.CreateConversation({ targetId: selectedUserForDraft.id });
  //       const newConvo: ConversationInfo = {
  //         id: newConvoRaw.id,
  //         type: newConvoRaw.type,
  //         targetId: newConvoRaw.target_id,
  //         lastMsgContent: newConvoRaw.last_msg_content ?? '',
  //         lastMsgTime: Number(newConvoRaw.last_msg_time ?? 0),
  //         updateTime: Number(newConvoRaw.update_time ?? 0),
  //         createTime: Number(newConvoRaw.create_time ?? 0),
  //         userNickname: newConvoRaw.user?.nickname,
  //         userAvatar: newConvoRaw.user?.avatarUrl,
  //         groupName: newConvoRaw.group_name,
  //         groupAvatar: newConvoRaw.group_avatar,
  //       };
  //       convoId = newConvo.id;
  //       setSelectedConversation(newConvo);
  //       setSelectedUserForDraft(null);
  //     } catch (error) {
  //       console.error('Failed to create conversation on first message:', error);
  //       return;
  //     }
  //   }

  //   try {
  //     const res = await ipc.SendMessage({
  //       conversationId: convoId!,
  //       content: inputMessage,
  //       type: 0, // Text
  //     });
  //     console.log('Sent message:', res);
  //     setInputMessage('');
  //     setMessages((prev) => [...prev, res]);
  //   } catch (error) {
  //     console.error('Failed to send message:', error);
  //   }
  // };

  useEffect(() => {
    if (userInfo?.id) {
      fetchConversationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  useEffect(() => {
    if (selectedConversation) {
      fetchLocalMessageHistory(selectedConversation.id);
      fetchMessageHistory(selectedConversation.id);
      // setSelectedUserForDraft(null);
    }
    // else if (!selectedUserForDraft) {
    //   setMessages([]);
    // }
  }, [selectedConversation]);

  return {
    conversationData,
    filteredChatList,
    fetchConversationData,
    search,
    setSearch,
  };
};
