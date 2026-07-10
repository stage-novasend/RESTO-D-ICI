import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/**
 * Filtre global : normalise TOUTES les réponses d'erreur en un JSON cohérent
 * et évite de fuiter les stack traces / messages internes en production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const isProd = process.env.NODE_ENV === 'production';

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Erreur interne du serveur';
    if (isHttp) {
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as Record<string, unknown>)?.message ?? res);
    }

    const path = httpAdapter.getRequestUrl(request) as string;

    // On journalise les erreurs serveur (5xx) avec la stack pour le debug.
    if (status >= 500) {
      this.logger.error(
        `${request?.method} ${path} → ${status}`,
        (exception as Error)?.stack,
      );
    }

    const body = {
      statusCode: status,
      error: isHttp ? exception.name : 'InternalServerError',
      // En prod, on ne révèle pas le détail des erreurs internes (5xx).
      message:
        !isHttp && isProd ? 'Erreur interne du serveur' : message,
      path,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), body, status);
  }
}
