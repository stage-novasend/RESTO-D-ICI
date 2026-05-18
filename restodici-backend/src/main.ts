// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // PRÉFIXE GLOBAL OBLIGATOIRE
  app.setGlobalPrefix('api');

  // Validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // CORS pour le frontend React - supporte tous les ports de développement courants
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite dev server default
      'http://localhost:5174', // Vite dev server alternative
      'http://localhost:5175', // Vite dev server possible increment
      'http://localhost:3000', // Create React App
      'http://localhost:62758', // Current serve port
      'http://localhost:64096', // Dynamic serve port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:62758',
      'http://127.0.0.1:64096',
      'http://192.168.1.5:5173', // Network access
      'http://192.168.1.5:5174',
      'http://192.168.1.5:3000',
      'http://192.168.1.5:62758',
      'http://192.168.1.5:64096',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`API Resto d'ici démarrée sur http://localhost:${port}/api`);
}
void bootstrap();
