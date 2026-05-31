'use client';

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@c_chat/ui';
import { authService, initializeRealtimeListeners } from '@/lib/services';
import { useUserStore } from '@/lib/stores/user.store';

export default function SignUpPage() {
  const router = useRouter();
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signUp({
        email,
        username,
        password,
        phone: phone || undefined,
        gender: gender ? Number(gender) : undefined,
      });
      const userInfo = await authService.getUserInfo();
      setUserInfo(userInfo);
      initializeRealtimeListeners();
      router.push('/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>创建新账号</CardDescription>
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
                <Label htmlFor="email">邮箱 *</Label>
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
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号（可选）"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gender">性别</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="选择性别（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未知</SelectItem>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="2">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Spinner />}
                {loading ? '注册中...' : '注册'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                已有账号？{' '}
                <Link href="/auth/signin" className="text-primary hover:underline">
                  立即登录
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
