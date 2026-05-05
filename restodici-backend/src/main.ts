import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  
  app.enableCors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] });

  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  
  await app.listen(3000);
  console.log('🟢 RestoDici API running on http://localhost:3000');
}
bootstrap();