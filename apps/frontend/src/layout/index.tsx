import { Outlet } from 'react-router-dom';
import { LeftSidebar } from './components/LeftSidebar';
import { useUserStore } from '@c_chat/frontend/stores';

const Layout: React.FC = () => {
  const userInfo = useUserStore((state) => state.userInfo);

  return (
    <div className="flex flex-1 overflow-hidden bg-muted/40 text-foreground">
      {userInfo && <LeftSidebar />}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
