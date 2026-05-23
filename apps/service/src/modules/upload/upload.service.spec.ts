import { UploadService } from './upload.service';

describe('UploadService', () => {
  it('creates the media message when completing a message upload', async () => {
    const file = {
      id: 'file-1',
      fileName: 'photo.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      ext: 'png',
      size: BigInt(1024),
      url: '/uploads/photo.png',
      uploaderId: 'user-1',
      createTime: new Date(),
    };

    const uploadSession = {
      id: 'upload-1',
      fileName: 'photo.png',
      fileHash: 'hash-1',
      fileSize: BigInt(1024),
      chunkSize: 1024,
      totalChunks: 1,
      uploadedCount: 1,
      status: 1,
      uploaderId: 'user-1',
      createTime: new Date(),
      updateTime: new Date(),
      clientMsgId: 'client-msg-1',
      conversationId: 'conversation-1',
      messageType: 1,
      mediaGroupId: 'media-group-1',
      content: '',
      duration: null,
      waveform: null,
      mimeType: 'image/png',
    };

    const message = {
      id: 'message-1',
      clientMsgId: 'client-msg-1',
      conversationId: 'conversation-1',
      media: {
        file: {
          id: 'file-1',
          size: BigInt(1024),
        },
      },
    };

    const merge = { merge: jest.fn().mockResolvedValue(file) };
    const session = { findById: jest.fn().mockResolvedValue(uploadSession) };
    const messageService = { sendMessage: jest.fn().mockResolvedValue(message) };
    const chatGateway = { notifyNewUploadMessage: jest.fn().mockResolvedValue(undefined) };

    const service = new UploadService(
      {} as never,
      session as never,
      {} as never,
      merge as never,
      messageService as never,
      chatGateway as never,
    );

    const result = await service.complete('upload-1', 'message');

    expect(merge.merge).toHaveBeenCalledWith('upload-1');
    expect(messageService.sendMessage).toHaveBeenCalledWith({
      senderId: 'user-1',
      conversationId: 'conversation-1',
      content: '',
      fileId: 'file-1',
      mediaGroupId: 'media-group-1',
      type: 1,
      clientMsgId: 'client-msg-1',
      durationSec: undefined,
      waveform: undefined,
    });
    expect(chatGateway.notifyNewUploadMessage).toHaveBeenCalledWith(message);
    expect(result).toEqual({
      queued: false,
      file: { ...file, size: 1024 },
      createdMessage: {
        ...message,
        media: {
          file: {
            ...message.media.file,
            size: 1024,
          },
        },
      },
    });
    expect(result).not.toHaveProperty('message');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('does not merge again when completing an already successful message upload', async () => {
    const file = {
      id: 'file-1',
      fileName: 'photo.png',
      hash: 'hash-1',
      mimeType: 'image/png',
      ext: 'png',
      size: BigInt(1024),
      url: '/uploads/photo.png',
      uploaderId: 'user-1',
      createTime: new Date(),
    };

    const uploadSession = {
      id: 'upload-1',
      fileName: 'photo.png',
      fileHash: 'hash-1',
      fileSize: BigInt(1024),
      chunkSize: 1024,
      totalChunks: 1,
      uploadedCount: 1,
      status: 3,
      uploaderId: 'user-1',
      createTime: new Date(),
      updateTime: new Date(),
      clientMsgId: 'client-msg-1',
      conversationId: 'conversation-1',
      messageType: 1,
      mediaGroupId: null,
      content: '',
      duration: null,
      waveform: null,
      mimeType: 'image/png',
      fileId: 'file-1',
      errorMessage: null,
    };

    const message = {
      id: 'message-1',
      clientMsgId: 'client-msg-1',
      conversationId: 'conversation-1',
      media: {
        file: {
          id: 'file-1',
          size: BigInt(1024),
        },
      },
    };

    const fileService = { findById: jest.fn().mockResolvedValue(file) };
    const session = { findById: jest.fn().mockResolvedValue(uploadSession) };
    const merge = { merge: jest.fn() };
    const messageService = { sendMessage: jest.fn().mockResolvedValue(message) };
    const chatGateway = { notifyNewUploadMessage: jest.fn().mockResolvedValue(undefined) };

    const service = new UploadService(
      fileService as never,
      session as never,
      {} as never,
      merge as never,
      messageService as never,
      chatGateway as never,
    );

    const result = await service.complete('upload-1', 'message');

    expect(fileService.findById).toHaveBeenCalledWith('file-1');
    expect(merge.merge).not.toHaveBeenCalled();
    expect(messageService.sendMessage).toHaveBeenCalledWith({
      senderId: 'user-1',
      conversationId: 'conversation-1',
      content: '',
      fileId: 'file-1',
      mediaGroupId: undefined,
      type: 1,
      clientMsgId: 'client-msg-1',
      durationSec: undefined,
      waveform: undefined,
    });
    expect(result.file).toEqual({ ...file, size: 1024 });
  });

  it('returns a JSON serializable upload session from init', async () => {
    const uploadSession = {
      id: 'upload-1',
      fileName: 'photo.png',
      fileHash: 'hash-1',
      fileSize: BigInt(1024),
      mimeType: 'image/png',
      chunkSize: 1024,
      totalChunks: 1,
      uploadedCount: 0,
      uploadedBytes: BigInt(0),
      status: 0,
      uploaderId: 'user-1',
      createTime: new Date(),
      updateTime: new Date(),
      clientMsgId: 'client-msg-1',
      conversationId: 'conversation-1',
      messageType: 1,
      mediaGroupId: null,
      content: '',
      duration: null,
      waveform: null,
      fileId: null,
      errorMessage: null,
    };

    const file = { findFile: jest.fn().mockResolvedValue(null) };
    const session = { create: jest.fn().mockResolvedValue(uploadSession) };
    const service = new UploadService(
      file as never,
      session as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.init(
      {
        fileName: 'photo.png',
        fileHash: 'hash-1',
        fileSize: 1024,
        mimeType: 'image/png',
        chunkSize: 1024,
        clientMsgId: 'client-msg-1',
        conversationId: 'conversation-1',
        messageType: 1,
        content: '',
      },
      'user-1',
    );

    expect(result.uploadSession).toEqual({
      ...uploadSession,
      fileSize: 1024,
      uploadedBytes: 0,
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
