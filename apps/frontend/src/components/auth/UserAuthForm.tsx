import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import {
  cn,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Input,
  IconFacebook,
  PasswordInput,
} from '@c_chat/ui';
import { IconGithub } from '@c_chat/ui';
import { Link, useNavigate } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { ipc } from '@c_chat/shared-utils';
import { useUserStore } from '@c_chat/frontend/stores';

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(6, 'Password must be at least 6 characters long'),
});
type FormSchema = z.infer<typeof formSchema>;

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string;
}

export function UserAuthForm({ className, redirectTo, ...props }: UserAuthFormProps) {
  const navigate = useNavigate();
  const { setUserInfo } = useUserStore();
  const { loading, run: signInRun } = useRequest(ipc.SignIn, {
    manual: true,
    onSuccess: async (data) => {
      console.log('登录成功', data);
      if (!data?.id) {
        toast.error('登录失败');
        return;
      }
      setUserInfo(data);
      toast.success('登录成功');
      navigate('/', { replace: true });
    },
    onError: (err) => {
      console.log('登录失败', err);
      toast.error('登录失败' + err.message);
    },
  });

  // const { auth } = useAuthStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '1796709584@qq.com', password: '123456' },
  });

  async function onSubmit(data: FormSchema) {
    console.log(data, 'onsubmit');
    if (loading) return;
    signInRun(data);
    // toast.promise(sleep(2000), {
    //   loading: 'Signing in...',
    //   success: () => {
    //     setIsLoading(false);

    //     // Mock successful authentication with expiry computed at success time
    //     const mockUser = {
    //       accountNo: 'ACC001',
    //       email: data.email,
    //       role: ['user'],
    //       exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
    //     };

    //     // Set user and access token
    //     // auth.setUser(mockUser);
    //     // auth.setAccessToken('mock-access-token');

    //     // Redirect to the stored location or default to dashboard
    //     const targetPath = redirectTo || '/';
    //     navigate({ to: targetPath, replace: true });

    //     return `Welcome back, ${data.email}!`;
    //   },
    //   error: 'Error',
    // });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to="/forgot-password"
                className="absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75"
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          Sign in
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" type="button" disabled={loading}>
            <IconGithub className="h-4 w-4" /> GitHub
          </Button>
          <Button variant="outline" type="button" disabled={loading}>
            <IconFacebook className="h-4 w-4" /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  );
}
