import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@c_chat/ui';
import { AuthLayout } from './auth-layout';
import { UserAuthForm } from './user-auth-form';

// 定义表单验证 schema
const loginSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    username: z.string().min(2, '用户名至少 2 个字符'),
    email: z.email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string().min(6, '请再次输入密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

type SignupFormData = z.infer<typeof signupSchema>;

const AuthForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignUp = location.pathname.endsWith('/sign-up');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData | SignupFormData>({
    resolver: zodResolver(isSignUp ? signupSchema : loginSchema),
    defaultValues: isSignUp
      ? {
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
        }
      : {
          email: '',
          password: '',
        },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        const token = result.token || result.access_token;
        if (!isSignUp && token) {
          localStorage.setItem('token', token);
          navigate('/');
        } else if (isSignUp) {
          navigate('/auth/sign-in');
        } else {
          navigate('/');
        }
      } else {
        setError(result.message || (isSignUp ? '注册失败' : '登录失败'));
      }
    } catch (err) {
      setError(isSignUp ? '注册失败，请检查网络连接' : '登录失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
        <CardAction>
          <Button variant="link">Sign Up</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" required />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          Login
        </Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
    // <AuthLayout>
    //   <Card>
    //     <CardHeader>
    //       <CardTitle className="text-lg tracking-tight">Sign in</CardTitle>
    //       <CardDescription>
    //         Enter your email and password below to <br />
    //         log into your account
    //       </CardDescription>
    //     </CardHeader>
    //     <CardContent>
    //       <UserAuthForm />
    //     </CardContent>
    //     <CardFooter>
    //       <p className="px-8 text-center text-sm text-muted-foreground">
    //         By clicking sign in, you agree to our{' '}
    //         <a href="/terms" className="underline underline-offset-4 hover:text-primary">
    //           Terms of Service
    //         </a>{' '}
    //         and{' '}
    //         <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
    //           Privacy Policy
    //         </a>
    //         .
    //       </p>
    //     </CardFooter>
    //   </Card>
    // </AuthLayout>
  );
};

export default AuthForm;
