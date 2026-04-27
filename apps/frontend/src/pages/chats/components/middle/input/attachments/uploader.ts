import { useAttachmentStore, type Attachment } from './store';

const UPLOAD_BASE_URL = 'http://localhost:3001/api/upload';

interface IpcResponse<T = any> {
  id: string;
  data?: T;
  error?: string;
}

const createIpcMessage = (method: string, params: any[] = []) => ({
  method,
  params,
  id: `${method}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
});

const electronIpcCall = async <T = any>(method: string, params: any[] = []): Promise<T> => {
  if (!window.c_chat?.ipcCall) {
    throw new Error('Electron IPC not available');
  }

  const response = (await window.c_chat.ipcCall(
    createIpcMessage(method, params),
  )) as IpcResponse<T>;
  if (response.error) {
    throw new Error(response.error);
  }

  return response.data as T;
};

export const selectFilesByNativeDialog = async () => {
  const data = await electronIpcCall<string[]>('SelectUploadFiles', [
    {
      allowMultiSelect: true,
    },
  ]);
  return data || [];
};

export const uploadAttachment = async (attachment: Attachment) => {
  const { update } = useAttachmentStore.getState();
  update(attachment.id, { status: 'uploading', progress: 0, error: undefined });

  try {
    if (attachment.filePath) {
      const result = await electronIpcCall<any>('UploadFileByChunks', [
        {
          filePath: attachment.filePath,
          chunkSize: 2 * 1024 * 1024,
        },
      ]);

      const url =
        result?.serverResponse?.file?.url || result?.serverResponse?.url || result?.file?.url || '';
      update(attachment.id, {
        status: 'done',
        progress: 100,
        url,
      });
      return;
    }

    if (!attachment.file) {
      throw new Error('缺少待上传文件');
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${UPLOAD_BASE_URL}/single`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          update(attachment.id, { progress });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const body = JSON.parse(xhr.responseText);
            const url = body?.data?.url || body?.url || '';
            update(attachment.id, {
              status: 'done',
              progress: 100,
              url,
            });
            resolve();
          } catch (error) {
            reject(new Error('上传结果解析失败'));
          }
        } else {
          reject(new Error(xhr.statusText || '上传失败'));
        }
      };

      xhr.onerror = () => reject(new Error('上传请求失败'));
      xhr.onabort = () => reject(new Error('上传已取消'));

      const formData = new FormData();
      formData.append('file', attachment.file);
      xhr.send(formData);
    });
  } catch (error) {
    update(attachment.id, {
      status: 'error',
      error: (error as Error).message,
    });
    throw error;
  }
};

export const uploadAllAttachments = async () => {
  const { list } = useAttachmentStore.getState();
  const pending = list.filter((item) => item.status === 'idle' || item.status === 'error');
  for (const attachment of pending) {
    await uploadAttachment(attachment);
  }
};
