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
  PasswordInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@c_chat/ui';
import { useRequest } from 'ahooks';
import { ipc } from '@c_chat/shared-utils';

const signUpSchema = z
  .object({
    email: z.email({ message: '请输入有效的电子邮件地址' }),
    username: z.string().min(1, '请输入用户名'),
    password: z.string().min(6, '密码长度必须至少为 6 个字符。'),
    confirmPassword: z.string().min(6, '请确认您的密码'),
    phone: z
      .string()
      .regex(/^1[3-9]\d{9}$/, '无效的电话号码')
      .or(z.literal('')),
    gender: z.enum(['0', '1', '2']).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: '密码不匹配',
    path: ['confirmPassword'],
  });

type SignUpFormSchema = z.infer<typeof signUpSchema>;

type UserSignUpFormProps = React.ComponentProps<'form'>;

export function UserSignUpForm({ className, ...props }: UserSignUpFormProps) {
  const { loading, run: signUpRun } = useRequest(ipc.SignUp, { manual: true });

  const form = useForm<SignUpFormSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: 'aa@qq.com',
      username: 'aa',
      password: '123456',
      confirmPassword: '123456',
      phone: '',
      gender: '2',
    },
  });

  async function onSubmit(data: SignUpFormSchema) {
    if (loading) return;
    const payload = {
      email: data.email,
      username: data.username,
      password: data.password,
      phone: data.phone || undefined,
      gender: Number(data.gender),
    };
    signUpRun(payload);
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>昵称</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>确认密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>手机号 (可选)</FormLabel>
              <FormControl>
                <Input placeholder="13800138000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>性别</FormLabel>
              <FormControl>
                <Select onValueChange={(v) => field.onChange(v)} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">女</SelectItem>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="2">暂不设置</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          注册
        </Button>
      </form>
    </Form>
  );
}
