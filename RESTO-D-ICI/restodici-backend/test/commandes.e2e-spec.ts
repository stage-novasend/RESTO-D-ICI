import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('CommandesController (e2e)', () => {
  let app: INestApplication<App>;
  let clientToken: string;
  let adminToken: string;
  let orderId: string;
  const testRestaurantId = 'test-restaurant-id';

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

    // Create client user
    const clientResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `client_cmd_${Date.now()}@example.com`,
        password: 'ClientPassword123!',
        nom: 'Client',
        prenom: 'Commande',
        role: 'CLIENT',
      });
    clientToken = clientResponse.body.accessToken;

    // Create admin user
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `admin_cmd_${Date.now()}@example.com`,
        password: 'AdminPassword123!',
        nom: 'Admin',
        prenom: 'Commande',
        role: 'ADMIN',
      });
    adminToken = adminResponse.body.accessToken;
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    if (dataSource) {
      await dataSource.close();
    }
    await app.close();
  });

  describe('/commandes (POST) - Create order', () => {
    it('should create a new order (authenticated client)', async () => {
      const commandeDto = {
        lignes: [
          {
            articleId: 'test-article-id',
            nom: 'Test Article',
            quantite: 2,
            prixUnitaire: 12.99,
            customisations: [],
          },
        ],
        typeService: 'SUR_PLACE',
        total: 25.98,
      };

      const response = await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ restaurantId: testRestaurantId })
        .send(commandeDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.lignes).toBeDefined();
      expect(response.body.typeService).toBe(commandeDto.typeService);
      expect(response.body.total).toBe(commandeDto.total);
      orderId = response.body.id;
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/commandes')
        .send({ lignes: [] })
        .expect(401);
    });

    it('should return 400 without restaurantId', async () => {
      await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ lignes: [] })
        .expect(400);
    });
  });

  describe('/commandes/me (GET) - My orders', () => {
    it('should return client orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/commandes/me')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/commandes/me').expect(401);
    });
  });

  describe('/commandes (GET) - All orders (staff)', () => {
    it('should return all orders for restaurant (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/commandes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ restaurantId: testRestaurantId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/commandes').expect(401);
    });

    it('should return 403 for client user', async () => {
      await request(app.getHttpServer())
        .get('/commandes')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('/commandes/kds (GET) - Kitchen Display System', () => {
    it('should return KDS orders (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/commandes/kds')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/commandes/kds').expect(401);
    });

    it('should return 403 for client user', async () => {
      await request(app.getHttpServer())
        .get('/commandes/kds')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('/commandes/:id (GET) - Get single order', () => {
    it('should return order details', async () => {
      if (!orderId) {
        // Create an order first
        const createResponse = await request(app.getHttpServer())
          .post('/commandes')
          .set('Authorization', `Bearer ${clientToken}`)
          .query({ restaurantId: testRestaurantId })
          .send({
            lignes: [
              {
                articleId: 'test-article-id',
                nom: 'Test Article',
                quantite: 1,
                prixUnitaire: 9.99,
                customisations: [],
              },
            ],
            typeService: 'A_EMPORTER',
            total: 9.99,
          });
        orderId = createResponse.body.id;
      }

      const response = await request(app.getHttpServer())
        .get(`/commandes/${orderId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(orderId);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/commandes/test-id').expect(401);
    });
  });

  describe('/commandes/:id/statut (PATCH) - Update order status', () => {
    it('should update order status (admin)', async () => {
      if (!orderId) {
        // Create an order first
        const createResponse = await request(app.getHttpServer())
          .post('/commandes')
          .set('Authorization', `Bearer ${clientToken}`)
          .query({ restaurantId: testRestaurantId })
          .send({
            lignes: [
              {
                articleId: 'test-article-id',
                nom: 'Test Article',
                quantite: 1,
                prixUnitaire: 9.99,
                customisations: [],
              },
            ],
            typeService: 'A_EMPORTER',
            total: 9.99,
          });
        orderId = createResponse.body.id;
      }

      const response = await request(app.getHttpServer())
        .patch(`/commandes/${orderId}/statut`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statut: 'EN_PREPARATION' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.statut).toBe('EN_PREPARATION');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/commandes/test-id/statut')
        .send({ statut: 'TERMINEE' })
        .expect(401);
    });

    it('should return 403 for client user', async () => {
      await request(app.getHttpServer())
        .patch('/commandes/test-id/statut')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ statut: 'TERMINEE' })
        .expect(403);
    });
  });
});
