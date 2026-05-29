'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, initializeRealtimeListeners } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';

export default function HomePage() {
  const router = useRouter();
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await authService.autoSignIn();
        const userInfo = await authService.getUserInfo();
        setUserInfo(userInfo);
        initializeRealtimeListeners();
        router.push('/chats');
      } catch (error) {
        router.push('/auth/signin');
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router, setUserInfo]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}
