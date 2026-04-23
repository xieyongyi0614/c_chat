import React from 'react';
import { RouterProvider, Navigate, createHashRouter, Outlet } from 'react-router-dom';
import AuthForm from '@c_chat/frontend/components/auth/AuthForm';
import { Chats } from '../pages/chats';
import { CheckAuth } from '../components/auth/CheckAuth';

const router = createHashRouter([
  {
    element: (
      <CheckAuth>
        <Outlet />
      </CheckAuth>
    ),
    children: [
      {
        path: '/auth',
        children: [
          {
            path: 'sign-in',
            element: <AuthForm />,
          },
          {
            path: 'sign-up',
            element: <AuthForm />,
          },
        ],
      },
      {
        path: '/',
        // element: <Layout />,
        children: [
          {
            index: true,
            element: <Navigate to="/chat" replace />,
          },
          {
            path: 'chat',
            element: <Chats />,
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/auth/sign-in" replace />,
      },
    ],
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
