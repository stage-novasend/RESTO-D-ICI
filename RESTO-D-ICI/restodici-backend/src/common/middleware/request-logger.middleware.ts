import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Journalise chaque requête HTTP avec un identifiant de corrélation.
 * - Réutilise l'en-tête `x-request-id` s'il est fourni (traçage bout-en-bout),
 *   sinon en génère un.
 * - Renvoie l'id dans la réponse (`x-request-id`) pour corréler logs ↔ client.
 * Léger et sans dépendance externe (Logger natif NestJS).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void): void {
    const requestId =
      (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const line = `[${requestId}] ${method} ${originalUrl} ${status} — ${ms}ms`;
      if (status >= 500) this.logger.error(line);
      else if (status >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}
