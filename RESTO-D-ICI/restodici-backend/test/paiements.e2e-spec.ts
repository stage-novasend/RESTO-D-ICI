import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('PaiementsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    if (dataSource) {
      await dataSource.close();
    }
    await app.close();
  });

  it('permits an authenticated client to trigger a local payment simulation', async () => {
    const email = `sim_${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'TestPassword123!',
        nom: 'Sim',
        prenom: 'User',
        role: 'CLIENT',
      })
      .expect(201);

    const token = registerResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/paiements/simuler')
      .set('Authorization', `Bearer ${token}`)
      .send({ commandeId: 'sim-cmd-1', provider: 'ORANGE' })
      .expect(200);
  });
});
