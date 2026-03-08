declare global {
  interface Window {
    api?: {
      notifyLoggedIn?: () => void
      notifyLoggedOut?: () => void
    }
  }
}
export {}
