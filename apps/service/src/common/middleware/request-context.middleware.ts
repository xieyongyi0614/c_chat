import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from '../services/request-context.service';
import { ContextLoggerService } from '../services/context-logger.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: RequestContextService,
    private readonly logger: ContextLoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    this.logger.log('requestId:' + requestId);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const method = req.method;
    const url = req.originalUrl || req.url;

    res.setHeader('X-Request-ID', requestId);

    const initialContext = { requestId, ip, userAgent };

    this.contextService.run(initialContext, () => {
      this.logger.log(`${method} ${url} - Request started`, 'RequestContext');

      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        this.logger.log(
          `${method} ${url} - Request completed: ${statusCode} (${duration}ms)`,
          'RequestContext',
        );
      });

      next();
    });
  }
}
