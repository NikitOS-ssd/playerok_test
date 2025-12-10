import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationSeconds: Histogram<string>;

  constructor() {
    // Counter для подсчета общего количества HTTP-запросов
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Histogram для измерения длительности HTTP-запросов
    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10], // buckets в секундах
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const route = request.route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode;
          const duration = (Date.now() - startTime) / 1000; // в секундах

          // Увеличиваем счетчик запросов
          this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode.toString(),
          });

          // Записываем длительность запроса
          this.httpRequestDurationSeconds.observe(
            {
              method,
              route,
              status_code: statusCode.toString(),
            },
            duration,
          );
        },
        error: (error) => {
          const statusCode = error.status || 500;
          const duration = (Date.now() - startTime) / 1000;

          // Увеличиваем счетчик запросов (включая ошибки)
          this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode.toString(),
          });

          // Записываем длительность запроса (включая ошибки)
          this.httpRequestDurationSeconds.observe(
            {
              method,
              route,
              status_code: statusCode.toString(),
            },
            duration,
          );
        },
      }),
    );
  }
}
