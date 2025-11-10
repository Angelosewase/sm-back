import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const { method, originalUrl } = request;
    const requestBody = this.safeJson(request.body);

    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? this.generateId();

    this.logger.log(
      `[${correlationId}] Incoming ${method} ${originalUrl} payload=${requestBody}`,
    );

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const response = httpContext.getResponse<Response>();
          const status = response.statusCode;
          const duration = Date.now() - startedAt;
          this.logger.log(
            `[${correlationId}] Outgoing ${method} ${originalUrl} status=${status} duration=${duration}ms payload=${this.safeJson(
              responseData,
            )}`,
          );
        },
        error: (err: unknown) => {
          const response = httpContext.getResponse<Response>();
          const status = response.statusCode;
          const duration = Date.now() - startedAt;
          this.logger.error(
            `[${correlationId}] Error ${method} ${originalUrl} status=${status} duration=${duration}ms error=${this.safeJson(
              err,
            )}`,
          );
        },
      }),
    );
  }

  private safeJson(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '"[unserializable]"';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}

