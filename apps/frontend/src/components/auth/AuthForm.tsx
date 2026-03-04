import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@c_chat/ui';
import { Mail, Lock, User, Phone, Github } from 'lucide-react';

// 定义表单验证 schema
const loginSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

const registerSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码长度至少为6位'),
  phone: z.string().optional(),
  gender: z.number().min(0).max(2).optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface AuthFormProps {
  isLogin?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ isLogin = true }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData | RegisterFormData>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isLogin ? {} : { username: '', phone: '', gender: 2 }),
    },
  });

  const onSubmit = async (data: LoginFormData | RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // 保存 token 到 localStorage
        if (result.token) {
          localStorage.setItem('token', result.token);
        }
        // 跳转到主页
        navigate('/');
      } else {
        setError(result.message || (isLogin ? '登录失败' : '注册失败'));
      }
    } catch (err) {
      setError(isLogin ? '登录失败，请检查网络连接' : '注册失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isLogin ? '欢迎回来' : '创建账户'}
          </CardTitle>
          <CardDescription>
            {isLogin ? '请输入您的邮箱和密码登录' : '填写信息注册新账户'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="pl-9"
                {...form.register('email')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  className="pl-9"
                  {...form.register('username')}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                className="pl-9"
                {...form.register('password')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号（可选）"
                    className="pl-9"
                    {...form.register('phone')}
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">性别</Label>
                <Select
                  onValueChange={(value) => form.setValue('gender', Number(value))}
                  defaultValue="2"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">其他</SelectItem>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="0">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或通过以下方式继续</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" disabled={isLoading}>
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? '还没有账户？' : '已有账户？'}
            <button
              type="button"
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="ml-1 font-medium text-primary hover:underline"
              disabled={isLoading}
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthForm;
