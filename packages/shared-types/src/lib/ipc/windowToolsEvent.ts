export interface WindowToolsEventType {
  closeWindowById: (windowId: number) => void;
  focusWindowById: (windowId: number) => void;
  minimizeCurrentWindow: () => void;
}
