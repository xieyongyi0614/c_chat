import type { AxiosError } from 'axios';
import type { RequestContext } from './requestContext';

/**
 * 请求失败时被调用，由平台决定怎样向用户呈现（toast / 通知 / 沉默上报）。
 * 不要在 reporter 里抛错，HttpClient 会把异常吞掉打 warn。
 */
export interface ErrorReporter {
  report(payload: {
    error: AxiosError;
    /** 已经从 response.data.message / error.message 兜底取出的可读文案 */
    message: string;
    ctx: RequestContext | null;
  }): void;
}
