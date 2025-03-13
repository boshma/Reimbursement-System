const request = require('supertest');
const app = require('../../app');
const authService = require('../../services/authService');
const jwt = require('jsonwebtoken');

jest.mock('../../services/authService');
jest.mock('jsonwebtoken');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };
      
      const mockUser = {
        id: '123',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        role: 'EMPLOYEE'
      };
      
      authService.register.mockResolvedValue(mockUser);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith(expect.objectContaining(userData));
    });
    
    test('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username and password are required');
      expect(authService.register).not.toHaveBeenCalled();
    });
    
    test('should return 400 if username already exists', async () => {
      authService.register.mockRejectedValue(new Error('Username already exists'));
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'existinguser', password: 'password123' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username already exists');
    });
  });
  
  describe('POST /api/auth/login', () => {
    test('should login a user and return token', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };
      
      const mockResponse = {
        token: 'jwt-token',
        user: {
          id: '123',
          username: 'testuser',
          role: 'EMPLOYEE'
        }
      };
      
      authService.login.mockResolvedValue(mockResponse);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'jwt-token');
      expect(response.body).toHaveProperty('user');
      expect(authService.login).toHaveBeenCalledWith(credentials.username, credentials.password);
    });
    
    test('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Username and password are required');
      expect(authService.login).not.toHaveBeenCalled();
    });
    
    test('should return 401 if credentials invalid', async () => {
      authService.login.mockRejectedValue(new Error('Invalid credentials'));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'wrongpass' });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
  
  describe('GET /api/auth/profile', () => {
    test('should return user profile when authenticated', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'EMPLOYEE'
      };
      
      authService.getUserById.mockResolvedValue(mockUser);
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('x-auth-token', 'valid-token');
      

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual(mockUser);
      expect(authService.getUserById).toHaveBeenCalledWith('123');
    });
    
    test('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
    
    test('should return 401 if token invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('x-auth-token', 'invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Token is not valid');
    });
  });
});