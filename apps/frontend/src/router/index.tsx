import React from 'react';
import { RouterProvider, Navigate, createHashRouter, Outlet } from 'react-router-dom';
import { Chats } from '../pages/chats';
import { CheckAuth } from '../pages/auth/CheckAuth';
import AuthPage from '../pages/auth';

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
            element: <AuthPage />,
          },
          {
            path: 'sign-up',
            element: <AuthPage />,
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
