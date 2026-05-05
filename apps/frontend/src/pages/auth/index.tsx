import { UserSignInForm } from './UserSignInForm';
import { UserSignUpForm } from './UserSignUpForm';
import { Link, useLocation } from 'react-router-dom';

import logo from '../../assets/logo.png';

const AuthPage = () => {
  const location = useLocation();
  const isSignUpPage = location.pathname.endsWith('/sign-up');

  return (
    <div className="flex items-center justify-center flex-col gap-6 bg-muted p-6 w-full">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="grid md:grid-cols-2">
          <div className="hidden md:flex items-center justify-center bg-muted/40 p-10">
            <img src={logo} alt="logo" className="max-w-[120px] h-auto object-contain" />
          </div>

          <div className="flex items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm space-y-6">
              {isSignUpPage ? (
                <UserSignUpForm />
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-semibold">欢迎回来</h1>
                    <p className="text-sm text-muted-foreground">登录你的c chat账号</p>
                  </div>
                  <UserSignInForm />
                </>
              )}

              <div className="text-center text-sm">
                {isSignUpPage ? (
                  <>
                    已有账号？{' '}
                    <Link to="/auth/sign-in" className="underline">
                      登录
                    </Link>
                  </>
                ) : (
                  <>
                    还没有账号？{' '}
                    <Link to="/auth/sign-up" className="underline">
                      注册
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground px-6 flex items-center gap-1">
        登录即表示你同意我们的
        <Link to="#" className="underline">
          Terms
        </Link>
        和
        <Link to="#" className="underline">
          Privacy
        </Link>
      </p>
    </div>
  );
};

export default AuthPage;
