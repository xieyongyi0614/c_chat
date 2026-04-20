import AppRouter from './router';
import { TitleBar } from './components/system/TitleBar';
import { Toaster } from 'sonner';
import { BackDropLoading } from '@c_chat/ui';
import { useGlobalStore } from './stores';
import { useGlobalSubscribe } from './hooks/useGolablSubscribe';
const App = () => {
  const { backdropLoading, backdropLoadingText } = useGlobalStore();
  useGlobalSubscribe();

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden h-screen">
      <TitleBar />

      <div className="flex flex-1 mt-10 overflow-hidden relative">
        <AppRouter />
        <BackDropLoading isLoading={backdropLoading} text={backdropLoadingText} />
      </div>
      <Toaster position="top-center" style={{ top: '45px' }} duration={3000} />
    </div>
  );
};

export default App;
