import { useCallback } from 'react';
import { useRef } from 'react';

export const useLastCallback = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
) => {
  const ref = useStateRef(callback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: Parameters<T>) => ref.current?.(...args), []);
};

export const useStateRef = <T>(value: T) => {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
};
