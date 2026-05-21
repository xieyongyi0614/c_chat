import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  baseUrl: process.env.UPLOAD_BASE_URL!,
  path: process.env.UPLOAD_PATH!,
}));
