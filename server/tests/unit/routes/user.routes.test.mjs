/**
 * @file user.routes.test.mjs
 * @description Unit tests for user routes behavior
 */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const handlers = {
  getUsers: jest.fn((req, res) => res.status(200).json({ ok: true })),
  getUserById: jest.fn((req, res) => res.status(200).json({ ok: true })),
};

await jest.unstable_mockModule('../../../controllers/user.controller.js', () => ({
  __esModule: true,
  ...handlers,
}));

const protect = jest.fn((req, res, next) => next());
await jest.unstable_mockModule('../../../middleware/auth.middleware.js', () => ({
  __esModule: true,
  protect,
}));

const userRoutes = (await import('../../../routes/user.routes.js')).default;

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('private users route applies auth middleware and list handler', async () => {
    // GIVEN/WHEN
    const response = await request(app).get('/api/users');

    // THEN
    expect(response.status).toBe(200);
    expect(protect).toHaveBeenCalled();
    expect(handlers.getUsers).toHaveBeenCalled();
  });

  test('private user-by-id route applies auth middleware and detail handler', async () => {
    // GIVEN/WHEN
    const response = await request(app).get('/api/users/user-123');

    // THEN
    expect(response.status).toBe(200);
    expect(protect).toHaveBeenCalled();
    expect(handlers.getUserById).toHaveBeenCalled();
  });
});
