import { ChunkService } from './chunk.service';

describe('ChunkService', () => {
  it('uses numeric chunk indexes when checking existing chunks', async () => {
    const prisma = {
      uploadChunk: {
        findUnique: jest.fn().mockResolvedValue({ size: 1024 }),
      },
    };
    const service = new ChunkService(prisma as never);

    await service.save({ uploadId: 'upload-1', chunkIndex: 3 }, {} as Express.Multer.File);

    expect(prisma.uploadChunk.findUnique).toHaveBeenCalledWith({
      where: {
        uploadId_chunkIndex: {
          uploadId: 'upload-1',
          chunkIndex: 3,
        },
      },
    });
  });
});
