import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ContextLoggerService } from '../../common';

const defaultErrorMessage = 'Internal Server Error';

type RequestWithId = {
  id?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: ContextLoggerService) {}
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const errorResponse: API.ApiResponse<null> = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: defaultErrorMessage,
      data: null,
      timestamp: Date.now(),
      requestId: request.id ?? '',
    };

    /** 开发环境 */
    if (process.env.NODE_ENV === 'development') {
      this.logger.error(
        'Exception caught:' +
          JSON.stringify({
            name: exception?.name,
            message: exception?.message,
            stack: exception?.stack,
          }),
      );
    }

    if (exception instanceof HttpException) {
      errorResponse.code = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse.message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
          statusCode?: number;
        };

        if (responseObj.message) {
          errorResponse.message = Array.isArray(responseObj.message)
            ? responseObj.message.join('; ')
            : responseObj.message;
        } else if (responseObj.error) {
          errorResponse.message = responseObj.error;
        } else {
          errorResponse.message = exception.message;
        }
      }
    } else if (exception instanceof Error) {
      errorResponse.message =
        process.env.NODE_ENV === 'production' ? defaultErrorMessage : exception.message;
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.error('errorResponse' + JSON.stringify(errorResponse));
    }
    response.status(errorResponse.code).json(errorResponse);
  }
}
