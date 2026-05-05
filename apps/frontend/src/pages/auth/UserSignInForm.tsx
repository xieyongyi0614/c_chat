import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';

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
import { Link } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { ipc } from '@c_chat/shared-utils';

const formSchema = z.object({
  email: z.email({ message: '请输入有效的电子邮件地址' }),
  password: z.string().min(6, '密码长度必须至少为 6 个字符。'),
});
type FormSchema = z.infer<typeof formSchema>;

type UserSignInFormProps = React.ComponentProps<'form'>;

export function UserSignInForm({ className, ...props }: UserSignInFormProps) {
  const { loading, run: signInRun } = useRequest(ipc.SignIn, { manual: true });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: 'corner@qq.com', password: '123456' },
  });

  async function onSubmit(data: FormSchema) {
    if (loading) return;
    signInRun(data);
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
              <FormLabel>邮箱</FormLabel>
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
              <FormLabel>密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
              <Link
                // to="/forgot-password"
                to="#"
                className="absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75"
              >
                忘记密码?
              </Link>
            </FormItem>
          )}
        />
        <Button className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          登录
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
