import { MediaPreviewWindowManager } from '../../main/windows';
import { addActionHandler } from '../util';

addActionHandler('OpenMediaPreview', async (params) => {
  return MediaPreviewWindowManager.getInstance().open({
    ...params,
    sourceWindowId: params.sourceWindowId ?? params.windowId,
  });
});

addActionHandler('GetMediaPreviewPayload', async () => {
  return MediaPreviewWindowManager.getInstance().getPayload();
});
