import { BaseService } from './baseService';
import { HttpClient } from '../httpClient';
import { UploadTypes } from '@c_chat/shared-types';
import { UPLOAD_CHUNK_SIZE } from '@c_chat/shared-config';

export class UploadService extends BaseService {
  private chunkSize = UPLOAD_CHUNK_SIZE;
  constructor(httpClient: HttpClient) {
    super(httpClient);
  }

  public async uploadInit(params: UploadTypes.PostUploadInitParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.post<UploadTypes.PostUploadInitResponse>('/upload/init', {
        ...params,
        chunkSize: params?.chunkSize ?? this.chunkSize,
      }),
    );
    if (err) {
      console.error('上传失败:', err.message);
      return;
    }
    return response.data.data;

    // const { uploadId } = await api.initUpload({
    //   fileName: file.name,
    //   fileSize: file.size,
    //   fileHash: await calcHash(file),
    //   chunkSize: 2 * 1024 * 1024,
    // });

    // 2. 分片上传
    // await uploadChunks(uploadId, file);

    // // 3. 合并
    // const { fileId } = await api.complete(uploadId);

    // return fileId;
  }
  public async uploadChunk(params: UploadTypes.PostUploadChunkParams) {
    const form = new FormData();
    form.append('uploadId', params.uploadId);
    form.append('chunkIndex', String(params.chunkIndex));
    if (params.fileName != null) form.append('fileName', params.fileName);
    if (params.totalChunks != null) form.append('totalChunks', String(params.totalChunks));
    if (params.fileSize != null) form.append('fileSize', String(params.fileSize));
    form.append('chunk', params.chunk, params.fileName ?? 'chunk');

    const [err, response] = await this.apiTool(
      this.httpClient.uploadFile<UploadTypes.PostUploadChunkResponse>('/upload/chunk', form),
    );
    if (err) {
      console.error('上传分片失败:', err.message);
      return;
    }
    return response.data.data;
  }

  /** 查询服务端已落盘的分片下标（modules/upload ChunkService.list） */
  public async getUploadStatus(
    uploadId: string,
  ): Promise<UploadTypes.GetUploadStatusResponse | undefined> {
    const [err, response] = await this.apiTool(
      this.httpClient.get<UploadTypes.GetUploadStatusResponse>(`/upload/status`, {
        params: { uploadId },
      }),
    );
    if (err) {
      console.error('获取上传状态失败:', err.message);
      return undefined;
    }
    return response.data.data;
  }

  /** 全部上传完后触发后台 merge（modules/upload queue） */
  public async uploadComplete(params: UploadTypes.PostUploadCompleteParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.post<UploadTypes.PostUploadCompleteResponse>(`/upload/complete`, params),
    );
    if (err) {
      console.error('触发合并失败:', err.message);
      return;
    }
    return response.data.data;
  }

  public async getFileByHash(params: UploadTypes.GetFileByHashParams) {
    const [err, response] = await this.apiTool(
      this.httpClient.post<UploadTypes.GetFileByHashResponse | null>(
        '/upload/getFileByHash',
        params,
      ),
    );
    if (err) {
      console.error('上传分片失败:', err.message);
      return;
    }
    return response.data.data;
  }
}
