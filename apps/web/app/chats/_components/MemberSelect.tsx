'use client';

import { useEffect, useState } from 'react';
import { Badge, ChatAvatar, Input, ScrollArea, Spinner, cn } from '@c_chat/ui';
import { authService } from '@/lib/services';

type UserListItem = Awaited<ReturnType<typeof authService.getUserList>>['list'][number];

interface MemberSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
}

export function MemberSelect({ selectedIds, onChange, excludeIds = [] }: MemberSelectProps) {
  const [word, setWord] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;

    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      authService
        .getUserList({ word: word.trim() || undefined, pagination: { page: 1, pageSize: 30 } })
        .then((res) => {
          if (disposed) return;
          setUsers(res.list);
        })
        .catch((err: unknown) => {
          if (disposed) return;
          setError(err instanceof Error ? err.message : '加载用户失败');
        })
        .finally(() => {
          if (!disposed) setLoading(false);
        });
    }, 300);

    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [word]);

  const excluded = new Set(excludeIds);
  const visibleUsers = users.filter((user) => !excluded.has(user.id));
  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    if (selected.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={word}
        onChange={(event) => setWord(event.target.value)}
        placeholder="搜索昵称或邮箱"
      />
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          已选 <Badge variant="secondary">{selectedIds.length}</Badge>
        </div>
      )}
      <ScrollArea className="h-64 rounded-md border border-border">
        {loading && visibleUsers.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Spinner />
            加载中...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-destructive">{error}</div>
        ) : visibleUsers.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">没有匹配的用户</div>
        ) : (
          <div className="flex flex-col">
            {visibleUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                aria-pressed={selected.has(user.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent',
                  selected.has(user.id) && 'bg-accent',
                )}
              >
                <ChatAvatar
                  id={user.id}
                  title={user.nickname || user.email}
                  avatarUrl={user.avatarUrl}
                  alt={user.nickname ?? ''}
                  className="size-9 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {user.nickname || user.email}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
