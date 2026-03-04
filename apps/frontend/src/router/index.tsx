import AuthForm from '../components/auth/AuthForm';
import { createHashRouter } from 'react-router-dom';
import App from '../App';

/** 路由配置 */
const router = createHashRouter(
  [
    {
      path: '/login',
      element: <AuthForm isLogin={true} />,
    },
    {
      path: '/register',
      element: <AuthForm isLogin={false} />,
    },
    {
      path: '/',
      element: <App />,
    },
  ],
  { basename: '/' },
);

export default router;
