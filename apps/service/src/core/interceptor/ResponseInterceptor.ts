import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ContextLoggerService, RequestContextService } from '../../common';

// 配置接口
export interface ResponseInterceptorConfig {
  useStatusCodeAsCode?: boolean;
  excludePaths?: string[];
}

export const RESPONSE_INTERCEPTOR_CONFIG = 'RESPONSE_INTERCEPTOR_CONFIG';

type HttpRequestLike = {
  url?: string;
};

type HttpResponseLike = {
  statusCode?: number;
  setHeader: (name: string, value: string) => void;
};

type ApiResponseLike = {
  code?: unknown;
  message?: unknown;
  data?: unknown;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, API.ApiResponse<T> | T> {
  private readonly config: ResponseInterceptorConfig;

  constructor(
    private readonly logger: ContextLoggerService,
    private readonly contextService: RequestContextService,

    @Inject(RESPONSE_INTERCEPTOR_CONFIG)
    config?: ResponseInterceptorConfig,
  ) {
    this.config = { useStatusCodeAsCode: true, excludePaths: [], ...config };
  }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<API.ApiResponse<T> | T> {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();

    if (this.shouldSkip(request.url ?? '')) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.transformResponse(context, data)));
  }

  private transformResponse(context: ExecutionContext, data: unknown): API.ApiResponse<T> {
    const response = context.switchToHttp().getResponse<HttpResponseLike>();

    const statusCode = this.getNormalizedStatusCode(response.statusCode || 200);
    const baseResponse: API.ApiResponse<T> = {
      code: this.resolveCode(data, statusCode),
      message: this.resolveMessage(data, statusCode),
      data: this.resolveData(data),
      timestamp: this.generateTimestamp(),
      requestId: this.getRequestId() ?? '',
    };
    response.setHeader('X-Request-Id', baseResponse.requestId);

    this.logger.log('baseResponse' + JSON.stringify(baseResponse));
    return baseResponse;
  }

  private resolveCode(data: unknown, statusCode: number): number {
    if (this.isApiResponseLike(data) && typeof data.code === 'number') return data.code;
    return this.config.useStatusCodeAsCode ? statusCode : 200;
  }

  private resolveMessage(data: unknown, statusCode: number): string {
    if (this.isApiResponseLike(data) && typeof data.message === 'string') return data.message;
    return this.getStatusMessage(statusCode);
  }

  private resolveData(data: unknown): T {
    if (data === null || data === undefined) return null as T;
    if (this.isApiResponseLike(data)) return (data.data ?? null) as T;
    return data as T;
  }

  private generateTimestamp(): number {
    return Date.now();
  }

  private isApiResponseLike(obj: unknown): obj is ApiResponseLike {
    return !!obj && typeof obj === 'object' && ('message' in obj || 'data' in obj || 'code' in obj);
  }

  private shouldSkip(url: string): boolean {
    return (
      this.config.excludePaths?.some((path) => url.includes(path) || new RegExp(path).test(url)) ??
      false
    );
  }
  private getNormalizedStatusCode(statusCode: number): number {
    if (statusCode > 200 && statusCode < 400) {
      return 200;
    } else if ([409, 422].includes(statusCode)) {
      return 400;
    } else if ([502, 503].includes(statusCode)) {
      return 500;
    }
    return statusCode;
  }
  private getStatusMessage(statusCode: number): string {
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
  private getRequestId(): string | undefined {
    const requestContext = this.contextService.getContext();
    return requestContext.requestId || this.generateRequestId();
  }
  private generateRequestId(): string {
    return uuidv4();
  }
}
