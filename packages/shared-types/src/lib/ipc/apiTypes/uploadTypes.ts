export namespace UploadTypes {
  export interface PostUploadInitParams {
    fileName: string;
    fileSize: number;
    fileHash: string;
    chunkSize?: number;
  }
  export interface PostUploadInitResponse {
    file?: {
      id: string;
      fileHash: string;
      fileName: string;
      size: number;
      url: string;
      uploaderId: string;
      createdAt: Date;
    };
    uploadSession?: {
      id: string;
      fileHash: string;
      fileName: string;
      uploaderId: string;
      createdAt: Date;
      fileSize: number;
      chunkSize: number;
      totalChunks: number;
      uploadedCount: number;
      status: number;
      updatedAt: Date;
    };
  }

  export interface PostUploadChunkParams {
    uploadId: string;
    chunkIndex: number;
    chunk: Blob;
    /** 与旧版 multipart 接口对齐 */
    fileName?: string;
    totalChunks?: number;
    fileSize?: number;
  }
  export interface PostUploadChunkResponse {
    ok: boolean;
    /** 部分后端在最后一个分片返回 */
    fileId?: string;
  }

  /** 与 modules/upload 一致：全部入队后触发后台 merge */
  export interface PostUploadCompleteParams {
    uploadId: string;
  }
  export interface PostUploadCompleteResponse {
    queued: boolean;
  }

  /** GET /upload/status?uploadId= 已落盘的分片下标（与 .chunk 文件名一致，从 0 起） */
  export interface GetUploadStatusResponse {
    uploadedChunks: number[];
  }
  export interface GetFileByHashParams {
    fileHash: string;
    size: number;
  }
  export interface GetFileByHashResponse {
    id: string;
    fileHash: string;
    fileName: string;
    size: bigint;
    url: string;
    uploaderId: string;
    createdAt: Date;
  }
}
