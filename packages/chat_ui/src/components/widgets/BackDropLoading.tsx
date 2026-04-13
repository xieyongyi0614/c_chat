import React, { FC, PropsWithChildren } from 'react';
import { Spinner } from '../spinner';

interface BackDropLoadingProps {
  isLoading?: boolean;
  text?: string | React.ReactNode;
}
export const BackDropLoading: FC<PropsWithChildren<BackDropLoadingProps>> = (props) => {
  const { children, isLoading = false, text = '加载中...' } = props;
  return (
    <>
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center gap-4 text-white bg-black/50 backdrop-blur-sm pointer-events-auto">
          <Spinner className="size-8 text-white" />
          {text}
        </div>
      )}
    </>
  );
};
