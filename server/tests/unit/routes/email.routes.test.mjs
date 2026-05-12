/**
 * @file email.routes.test.mjs
 * @description Unit tests for email routes behavior
 */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const handlers = {
  sendGenericEmail: jest.fn((req, res) => res.status(200).json({ ok: true })),
};

await jest.unstable_mockModule('../../../controllers/email.controller.js', () => ({
  __esModule: true,
  ...handlers,
}));

const protect = jest.fn((req, res, next) => next());
await jest.unstable_mockModule('../../../middleware/auth.middleware.js', () => ({
  __esModule: true,
  protect,
}));

const emailRoutes = (await import('../../../routes/email.routes.js')).default;

const app = express();
app.use(express.json());
app.use('/api/email', emailRoutes);

describe('Email Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('private send route applies auth middleware and handler', async () => {
    const response = await request(app)
      .post('/api/email/send')
      .send({ to: 'x@example.com', subject: 'Hello', text: 'Body' });

    expect(response.status).toBe(200);
    expect(protect).toHaveBeenCalled();
    expect(handlers.sendGenericEmail).toHaveBeenCalled();
  });
});
