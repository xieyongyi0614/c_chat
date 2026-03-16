import React from 'react';
import { RouterProvider, Navigate, createHashRouter } from 'react-router-dom';
import Layout from '@frontend/layout';
import Chat from '@frontend/pages/chat';
import AuthForm from '@frontend/components/auth/AuthForm';

const router = createHashRouter([
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
      // {
      //   path: 'settings',
      //   element: <Settings />,
      // },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/chat" replace />,
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
