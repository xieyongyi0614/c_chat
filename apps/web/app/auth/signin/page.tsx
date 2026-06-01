'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from '@c_chat/ui';
import { authService, initializeRealtimeListeners } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';

export default function SignInPage() {
  const router = useRouter();
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let disposed = false;

    const restoreSession = async () => {
      try {
        const userInfo = await authService.autoSignIn();
        if (disposed) return;
        setUserInfo(userInfo);
        initializeRealtimeListeners();
        router.push('/chats');
      } catch {
        // Stay on the sign-in page when no saved session exists.
      }
    };

    void restoreSession();

    return () => {
      disposed = true;
    };
  }, [router, setUserInfo]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userInfo = await authService.signIn({ email, password });
      setUserInfo(userInfo);
      initializeRealtimeListeners();
      router.push('/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>Web 端 IM 系统</CardDescription>
        </CardHeader>
        <CardContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading && <Spinner />}
              {loading ? '登录中...' : '登录'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                立即注册
              </Link>
            </div>
          </div>
        </form>
        </CardContent>
      </Card>
    </main>
  );
}
