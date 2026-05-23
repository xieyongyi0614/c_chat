export interface WindowToolsEventType {
  closeWindowById: (windowId: number) => void;
  focusWindowById: (windowId: number) => void;
  minimizeCurrentWindow: () => void;
  toggleCurrentWindowMaximize: () => void;
  toggleCurrentWindowAlwaysOnTop: () => boolean;
}
