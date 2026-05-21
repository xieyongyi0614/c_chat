import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { MergeService } from '../services/merge.service';
import { ChatGateway } from 'src/api/chat/gateways/chat.gateway';

@Processor('upload')
@Injectable()
export class UploadProcessor {
  constructor(
    private merge: MergeService,
    private chatGateway: ChatGateway,
  ) {}

  @Process('merge-message')
  async handle(job: Job<{ uploadId: string }>) {
    try {
      const file = await this.merge.merge(job.data.uploadId);
      this.chatGateway.notifyUploadComplete(file, job.data.uploadId);
    } catch (err) {
      console.error('Upload merge failed for', job.data.uploadId, err);
    }
  }
}
