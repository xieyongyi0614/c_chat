import { v4 as uuidv4 } from 'uuid';
export class HttpUtil {
  static getNormalizedStatusCode(statusCode: number): number {
    if (statusCode > 200 && statusCode < 400) {
      return 200;
    } else if ([409, 422].includes(statusCode)) {
      return 400;
    } else if ([502, 503].includes(statusCode)) {
      return 500;
    }
    return statusCode;
  }

  static getStatusMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      200: '操作成功',
      400: '参数错误',
      401: '未授权',
      403: '禁止访问',
      404: '资源不存在',
      500: '服务器错误',
    };

    return messages[statusCode] || (statusCode < 400 ? 'success' : 'error');
  }
  static generateRequestId(): string {
    return uuidv4();
  }
}
