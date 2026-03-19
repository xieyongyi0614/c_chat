declare global {
  interface Window {
    api?: {
      notifyLoggedIn?: () => void;
      notifyLoggedOut?: () => void;
      closeWindow?: () => void;
      openSettings?: () => void;
    };
  }
}

export {};
