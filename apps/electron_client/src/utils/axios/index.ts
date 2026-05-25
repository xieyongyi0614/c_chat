import * as https from 'https';
import { createApiClient, type ApiClientBundle, type UploadService } from '@c_chat/shared-api';
import { electronAdapters } from './adapters';
import { downloadFile, uploadFileByPath } from './fileOps';

/**
 * Electron 端 upload service：在 shared-api 的 UploadService 上挂两个本地文件方法
 * （downloadFile / uploadFileByPath），保留旧调用点 `ApiClient.upload.uploadFileByPath(...)` 的签名。
 */
type ElectronUploadService = UploadService & {
  uploadFileByPath: (filePath: string) => ReturnType<typeof uploadFileByPath>;
  downloadFile: (
    url: string,
    destinationPath: string,
    onProgress?: (progress: number) => void,
  ) => ReturnType<typeof downloadFile>;
};

let _bundle: ApiClientBundle | null = null;
let _electronUpload: ElectronUploadService | null = null;

/**
 * Electron 主进程的 HTTP 入口。
 * 业务侧继续用 `ApiClient.auth.signIn(...)` / `ApiClient.upload.uploadInit(...)`，
 * adapter 在 init 时一次性注入；windowId 透过 ActionCtx (AsyncLocalStorage) 自动解析。
 */
export class ApiClient {
  static init(baseURL: string = 'http://localhost:3001/api') {
    if (_bundle) return;

    _bundle = createApiClient({
      baseURL,
      timeout: 15000,
      headers: {
        'X-Requested-With': 'Electron-Client',
      },
      ...electronAdapters,
      axiosOverrides: {
        httpsAgent: new https.Agent({
          rejectUnauthorized: true,
        }),
      },
    });

    _electronUpload = Object.assign(_bundle.upload, {
      uploadFileByPath: (filePath: string) => uploadFileByPath(_bundle!.upload, filePath),
      downloadFile: (
        url: string,
        destinationPath: string,
        onProgress?: (progress: number) => void,
      ) => downloadFile(_bundle!.http, url, destinationPath, onProgress),
    }) as ElectronUploadService;
  }

  static get instance() {
    if (!_bundle) throw new Error('ApiClient not initialized; call ApiClient.init() first');
    return _bundle.http;
  }

  static get auth() {
    if (!_bundle) throw new Error('ApiClient not initialized; call ApiClient.init() first');
    return _bundle.auth;
  }

  static get upload(): ElectronUploadService {
    if (!_electronUpload) throw new Error('ApiClient not initialized; call ApiClient.init() first');
    return _electronUpload;
  }
}
