/**
 * @file user.controller.test.mjs
 * @description Unit tests for User controller (Jestering pattern)
 */
import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../__mocks__/factories/express.factory.js';
import { createMockUser } from '../__mocks__/factories/user.factory.js';

const User = {};

await jest.unstable_mockModule('../../../models/User.model.js', () => ({
  __esModule: true,
  default: User,
}));

const logError = jest.fn();
await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({
  __esModule: true,
  logError,
}));

const controller = await import('../../../controllers/user.controller.js');
const { getUsers, getUserById } = controller;

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('administrator retrieves user by id', async () => {
    // GIVEN
    const req = createMockRequest({
      params: { id: 'user-target-1' },
      user: { _id: 'admin-1', role: 'superAdmin' },
    });
    const res = createMockResponse();
    const foundUser = createMockUser({ _id: 'user-target-1', role: 'customer' });
    const select = jest.fn().mockResolvedValue(foundUser);
    User.findOne = jest.fn().mockReturnValue({ select });

    // WHEN
    await getUserById(req, res);

    // THEN
    expect(User.findOne).toHaveBeenCalledWith({ _id: 'user-target-1' });
    expect(select).toHaveBeenCalledWith('-password');
    expect(res.json).toHaveBeenCalledWith(foundUser);
  });

  test('non-admin cannot retrieve a different user id', async () => {
    // GIVEN
    const req = createMockRequest({
      params: { id: 'someone-else' },
      user: { _id: 'self-user', role: 'customer' },
    });
    const res = createMockResponse();
    User.findOne = jest.fn();

    // WHEN
    await getUserById(req, res);

    // THEN
    expect(User.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  test('returns 404 for unknown user id', async () => {
    // GIVEN
    const req = createMockRequest({
      params: { id: 'unknown-id' },
      user: { _id: 'admin-1', role: 'superAdmin' },
    });
    const res = createMockResponse();
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    // WHEN
    await getUserById(req, res);

    // THEN
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  test('administrator lists all users', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'admin-1', role: 'businessAdministrator' },
    });
    const res = createMockResponse();
    const users = [createMockUser({ _id: 'u1' }), createMockUser({ _id: 'u2' })];
    const sort = jest.fn().mockResolvedValue(users);
    const select = jest.fn().mockReturnValue({ sort });
    User.find = jest.fn().mockReturnValue({ select });

    // WHEN
    await getUsers(req, res);

    // THEN
    expect(User.find).toHaveBeenCalledWith({});
    expect(select).toHaveBeenCalledWith('-password');
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith(users);
  });

  test('non-admin is forbidden from listing all users', async () => {
    // GIVEN
    const req = createMockRequest({
      user: { _id: 'self-user', role: 'customer' },
    });
    const res = createMockResponse();
    User.find = jest.fn();

    // WHEN
    await getUsers(req, res);

    // THEN
    expect(User.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden. You do not have permission to perform this action.',
    });
  });
});
