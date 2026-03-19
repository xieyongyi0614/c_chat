import React from 'react';
import { RouterProvider, Navigate, createHashRouter, Outlet } from 'react-router-dom';
import Layout from '@c_chat/frontend/layout';
import Chat from '@c_chat/frontend/pages/chat';
import AuthForm from '@c_chat/frontend/components/auth/AuthForm';
import { AuthProvider } from '@c_chat/frontend/context/AuthContext';

const router = createHashRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
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
        element: <Layout />,
        children: [
          {
            index: true,
            element: <Navigate to="/chat" replace />,
          },
          {
            path: 'chat',
            element: <Chat />,
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
