import { AudioService } from '@c_chat/electron_client/services/audioService';
import { addActionHandler } from '../util';

const audioService = new AudioService();

addActionHandler('saveVoice', (params) => {
  return audioService.saveVoice(params.buffer, params.metadata);
});
