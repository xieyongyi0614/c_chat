'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@c_chat/ui';
import { authService, initializeRealtimeListeners } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';

export default function HomePage() {
  const router = useRouter();
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userInfo = await authService.autoSignIn();
        setUserInfo(userInfo);
        initializeRealtimeListeners();
        router.push('/chats');
      } catch {
        router.push('/auth/signin');
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router, setUserInfo]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}
