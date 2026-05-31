export { authService } from './auth.service';
export { conversationService } from './conversation.service';
export { messageService } from './message.service';
export { httpService, uploadService } from './http.service';

import { messageService } from './message.service';
import { conversationService } from './conversation.service';

export function initializeRealtimeListeners() {
  messageService.setupRealtimeListeners();
  conversationService.setupRealtimeListeners();
}
