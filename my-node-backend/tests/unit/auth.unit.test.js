const request = require('supertest');
const app = require('../../src/app');
const authService = require('../../src/services/auth.service');

jest.mock('../../src/services/auth.service');

describe('Auth Controller', () => {
  describe('POST /login', () => {
    it('should return 200 and a token for valid credentials', async () => {
      const mockUser = { email: 'test@example.com', password: 'password123' };
      const mockToken = 'mockToken';

      authService.validateUser.mockResolvedValue(mockUser);
      authService.generateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/login')
        .send(mockUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', mockToken);
    });

    it('should return 401 for invalid credentials', async () => {
      const mockUser = { email: 'test@example.com', password: 'wrongPassword' };

      authService.validateUser.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send(mockUser);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
});