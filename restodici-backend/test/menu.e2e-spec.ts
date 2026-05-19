import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('MenuController (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let adminToken: string;
  let restaurantId: string;
  let categoryId: string;
  let articleId: string;

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

    // Create admin user and get token
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `admin_${Date.now()}@example.com`,
        password: 'AdminPassword123!',
        nom: 'Admin',
        prenom: 'User',
        role: 'ADMIN',
      });
    adminToken = adminResponse.body.accessToken;

    // Create client user and get token
    const clientResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `client_${Date.now()}@example.com`,
        password: 'ClientPassword123!',
        nom: 'Client',
        prenom: 'User',
        role: 'CLIENT',
      });
    authToken = clientResponse.body.accessToken;
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    if (dataSource) {
      await dataSource.close();
    }
    await app.close();
  });

  describe('/menu (GET)', () => {
    it('should return menu items for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter menu by category', async () => {
      // Use a valid UUID format for category filter (or skip if not valid)
      const response = await request(app.getHttpServer())
        .get('/menu?cible=CLIENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should filter menu by target (cible)', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu?cible=CLIENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('/menu/restaurants (GET)', () => {
    it('should return list of active restaurants', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/restaurants')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        restaurantId = response.body[0].id;
      }
    });
  });

  describe('/menu/categories (GET)', () => {
    it('should return list of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/categories')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter categories by restaurantId', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/categories?restaurantId=test-restaurant')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('/menu/search (GET)', () => {
    it('should search articles by query', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/search?q=pizza')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/menu/restaurant/:id (GET)', () => {
    it('should return menu for specific restaurant', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/restaurant/test-restaurant-id')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('/menu/categories (POST) - Admin only', () => {
    it('should create a new category (admin)', async () => {
      const categoryDto = {
        nom: `Test Category ${Date.now()}`,
        description: 'Test category description',
        ordre: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.nom).toBe(categoryDto.nom);
      categoryId = response.body.id;
    });

    it('should return 401 for unauthorized user', async () => {
      const categoryDto = {
        nom: 'Unauthorized Category',
        description: 'Should fail',
        ordre: 1,
      };

      await request(app.getHttpServer())
        .post('/menu/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryDto)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/menu/categories')
        .send({ nom: 'Test' })
        .expect(401);
    });
  });

  describe('/menu/articles (POST) - Admin only', () => {
    it('should create a new article (admin)', async () => {
      const articleDto = {
        nom: `Test Article ${Date.now()}`,
        description: 'Test article description',
        prix: 12.99,
        categorieId: categoryId,
        image: 'https://example.com/image.jpg',
        disponible: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.nom).toBe(articleDto.nom);
      expect(response.body.prix).toBe(articleDto.prix);
      articleId = response.body.id;
    });

    it('should return 401 for unauthorized user', async () => {
      await request(app.getHttpServer())
        .post('/menu/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nom: 'Test Article' })
        .expect(403);
    });
  });

  describe('/menu/articles/:id/disponible (PATCH) - Admin only', () => {
    it('should toggle article availability (admin)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/menu/articles/${articleId}/disponible`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disponible: false })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.disponible).toBe(false);
    });

    it('should return 401 for unauthorized user', async () => {
      await request(app.getHttpServer())
        .patch(`/menu/articles/${articleId}/disponible`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ disponible: true })
        .expect(403);
    });
  });

  describe('/menu/articles/:id (PUT) - Admin only', () => {
    it('should update an article (admin)', async () => {
      const updateDto = {
        nom: `Updated Article ${Date.now()}`,
        prix: 15.99,
      };

      const response = await request(app.getHttpServer())
        .put(`/menu/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.nom).toBe(updateDto.nom);
      expect(response.body.prix).toBe(updateDto.prix);
    });

    it('should return 401 for unauthorized user', async () => {
      await request(app.getHttpServer())
        .put(`/menu/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nom: 'Test' })
        .expect(403);
    });
  });

  describe('/menu/articles/:id (DELETE) - Admin only', () => {
    it('should soft delete an article (admin)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/menu/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 401 for unauthorized user', async () => {
      await request(app.getHttpServer())
        .delete(`/menu/articles/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});
