import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let userId: string;

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
    // Clean up database if needed
    const dataSource = app.get(DataSource);
    if (dataSource) {
      await dataSource.close();
    }
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new client user', async () => {
      const registerDto = {
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        nom: 'Test',
        prenom: 'User',
        role: 'CLIENT',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.nom).toBe(registerDto.nom);
      expect(response.body.user.prenom).toBe(registerDto.prenom);
      expect(response.body.accessToken).toBeDefined();

      userId = response.body.user.id;
      authToken = response.body.accessToken;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidDto = {
        email: 'test@example.com',
        // missing password, nom, prenom
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const registerDto = {
        email: `duplicate_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        nom: 'Test',
        prenom: 'User',
        role: 'CLIENT',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    const testUserEmail = `login_${Date.now()}@example.com`;
    const testUserPassword = 'TestPassword123!';

    beforeAll(async () => {
      // Create a test user for login
      await request(app.getHttpServer()).post('/auth/register').send({
        email: testUserEmail,
        password: testUserPassword,
        nom: 'Login',
        prenom: 'Test',
        role: 'CLIENT',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUserEmail);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return user profile with valid token', async () => {
      if (!authToken) {
        // Create a user and get token if not already done
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `profile_${Date.now()}@example.com`,
            password: 'TestPassword123!',
            nom: 'Profile',
            prenom: 'Test',
            role: 'CLIENT',
          });
        authToken = registerResponse.body.accessToken;
      }

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBeDefined();
      expect(response.body.id).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should return success message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBe('Déconnexion réussie');
    });
  });
});
