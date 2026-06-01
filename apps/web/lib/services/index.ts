export { authService } from './auth.service';
export { conversationService } from './conversation.service';
export { messageService } from './message.service';
export { groupService } from './group.service';
export { httpService, uploadService } from './http.service';
export { uploadManager } from './upload.service';

import { realtimeListenersService } from './realtime-listeners.service';

export function initializeRealtimeListeners() {
  realtimeListenersService.register();
}
