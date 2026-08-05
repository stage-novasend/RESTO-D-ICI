// src/main.ts
import 'dotenv/config'; // ← charge .env avant tout le reste
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getCorsOrigins, validateEnv } from './config/app-config';

async function bootstrap() {
  // [SÉCURITÉ] JWT_SECRET obligatoire — refus de démarrer sans lui.
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('[FATAL] JWT_SECRET est manquant. Arrêt du serveur.');
  }
  // Vérifie les autres variables (warn en dev, bloque en prod).
  validateEnv();

  // rawBody: true → conserve le corps brut pour vérifier les signatures de webhook.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // PRÉFIXE GLOBAL OBLIGATOIRE
  app.setGlobalPrefix('api');

  // [COMPATIBILITÉ] Mécanisme de versionnement d'API, sans rien casser
  // aujourd'hui : VERSION_NEUTRAL en défaut garde toutes les routes
  // existantes accessibles exactement comme avant (/api/xxx), y compris en
  // cas de déploiement backend/frontend non simultané (les jobs GitHub
  // Actions backend/frontend tournent en parallèle, pas de manière
  // atomique). Un futur endpoint avec un changement cassant pourra
  // s'exposer explicitement via @Version('2') → /api/v2/xxx, sans jamais
  // retirer l'accès aux anciens clients (audit ISO 25010 — Compatibilité).
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  // [SÉCURITÉ] En-têtes HTTP durcis (CSP, HSTS, X-Frame-Options…).
  app.use(helmet());

  // Lecture des cookies (refresh token HttpOnly).
  app.use(cookieParser());

  // Validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // [SÉCURITÉ] Applique les @Exclude() des entités (password, refreshToken,
  // secrets 2FA…) à TOUTE réponse JSON — y compris les relations imbriquées
  // (ex: commande.client) qui échappaient jusqu'ici à tout filtrage manuel.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS — origines centralisées (config/app-config.ts, pilotées par l'env).
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Documentation OpenAPI/Swagger — jamais exposée en production
  // (elle publierait toute la surface d'API : routes, DTOs, modèles).
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Resto d'ici API")
      .setDescription('API de la plateforme de restauration RESTODICI')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API Resto d'ici démarrée sur le port ${port} (préfixe /api)`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log('Documentation Swagger : /api/docs');
  }
}
void bootstrap();
