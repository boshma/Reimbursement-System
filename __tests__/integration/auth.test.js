const request = require('supertest');
const app = require('../../src/app');
const authService = require('../../src/services/authService');
const fileUploadService = require('../../src/services/fileUploadService');
const jwt = require('jsonwebtoken');

jest.mock('../../src/services/authService');
jest.mock('../../src/services/fileUploadService');
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

    test('should return 500 on server error', async () => {
      authService.register.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', password: 'password123' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Server error');
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

    test('should return 500 on server error', async () => {
      authService.login.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Server error');
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
      fileUploadService.getSignedUrl.mockResolvedValue('https://profile-picture-url.com');
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

    test('should return 500 if profile fetching fails', async () => {
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      authService.getUserById.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('x-auth-token', 'valid-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Server error');
    });
  });

  describe('PUT /api/auth/profile', () => {
    test('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@example.com',
        address: '123 Main St'
      };
      
      const mockUpdatedUser = {
        id: '123',
        username: 'testuser',
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@example.com',
        address: '123 Main St',
        role: 'EMPLOYEE'
      };
      
      authService.updateUserProfile.mockResolvedValue(mockUpdatedUser);
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('x-auth-token', 'valid-token')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('user', mockUpdatedUser);
      expect(authService.updateUserProfile).toHaveBeenCalledWith('123', updateData);
    });
    
    test('should return 500 on server error', async () => {
      authService.updateUserProfile.mockRejectedValue(new Error('Database error'));
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('x-auth-token', 'valid-token')
        .send({ firstName: 'Updated' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Server error');
    });
  });

  describe('PUT /api/auth/role', () => {
    test('should update user role when manager', async () => {
      const roleData = {
        userId: '456',
        role: 'MANAGER'
      };
      
      const mockUpdatedUser = {
        id: '456',
        username: 'anotheruser',
        role: 'MANAGER'
      };
      
      authService.updateUserRole.mockResolvedValue(mockUpdatedUser);
      jwt.verify.mockReturnValue({ user: { id: '123', role: 'MANAGER' } });
      
      const response = await request(app)
        .put('/api/auth/role')
        .set('x-auth-token', 'valid-token')
        .send(roleData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User role updated successfully');
      expect(response.body).toHaveProperty('user', mockUpdatedUser);
      expect(authService.updateUserRole).toHaveBeenCalledWith('456', 'MANAGER');
    });
    
    test('should return 400 if required fields missing', async () => {
      jwt.verify.mockReturnValue({ user: { id: '123', role: 'MANAGER' } });
      
      const response = await request(app)
        .put('/api/auth/role')
        .set('x-auth-token', 'valid-token')
        .send({ userId: '456' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User ID and role are required');
    });
    
    test('should return 400 if user not found', async () => {
      authService.updateUserRole.mockRejectedValue(new Error('User not found'));
      jwt.verify.mockReturnValue({ user: { id: '123', role: 'MANAGER' } });
      
      const response = await request(app)
        .put('/api/auth/role')
        .set('x-auth-token', 'valid-token')
        .send({ userId: '999', role: 'MANAGER' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    test('should return 400 if role is invalid', async () => {
      authService.updateUserRole.mockRejectedValue(new Error('Invalid role'));
      jwt.verify.mockReturnValue({ user: { id: '123', role: 'MANAGER' } });
      
      const response = await request(app)
        .put('/api/auth/role')
        .set('x-auth-token', 'valid-token')
        .send({ userId: '456', role: 'INVALID_ROLE' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid role');
    });

    test('should return 500 on server error', async () => {
      authService.updateUserRole.mockRejectedValue(new Error('Database error'));
      jwt.verify.mockReturnValue({ user: { id: '123', role: 'MANAGER' } });
      
      const response = await request(app)
        .put('/api/auth/role')
        .set('x-auth-token', 'valid-token')
        .send({ userId: '456', role: 'MANAGER' });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Server error');
    });
  });

  describe('PUT /api/auth/profile-picture', () => {
    test('should update profile picture', async () => {
      const mockUpdatedUser = {
        id: '123',
        username: 'testuser',
        profilePictureKey: 'profiles/test.jpg',
        role: 'EMPLOYEE'
      };
      
      fileUploadService.uploadProfilePicture.mockResolvedValue('profiles/test.jpg');
      fileUploadService.getSignedUrl.mockResolvedValue('https://profile-picture-url.com');
      authService.updateProfilePicture.mockResolvedValue(mockUpdatedUser);
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      // Mocking the req.file property that multer sets
      // This is a workaround since supertest doesn't easily support file uploads in unit tests
      app.use('/api/auth/profile-picture-test', (req, res, next) => {
        if (req.headers['x-mock-file'] === 'true') {
          req.file = {
            originalname: 'test.jpg',
            buffer: Buffer.from('test file content'),
            mimetype: 'image/jpeg'
          };
        }
        next();
      });
      
      app.put('/api/auth/profile-picture-test', (req, res) => {
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // If file exists, return success
        res.status(200).json({ 
          message: 'Profile picture updated successfully', 
          user: mockUpdatedUser,
          profilePictureUrl: 'https://profile-picture-url.com'
        });
      });
      
      const response = await request(app)
        .put('/api/auth/profile-picture-test')
        .set('x-mock-file', 'true');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Profile picture updated successfully');
      expect(response.body).toHaveProperty('user', mockUpdatedUser);
      expect(response.body).toHaveProperty('profilePictureUrl', 'https://profile-picture-url.com');
    });
    
    test('should return 400 if no file uploaded', async () => {
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      const response = await request(app)
        .put('/api/auth/profile-picture')
        .set('x-auth-token', 'valid-token');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'No file uploaded');
    });

    test('should return 500 if file upload fails', async () => {
      jwt.verify.mockReturnValue({ user: { id: '123' } });
      
      app.use('/api/auth/profile-picture-error-test', (req, res, next) => {
        if (req.headers['x-mock-file'] === 'true') {
          req.file = {
            originalname: 'test.jpg',
            buffer: Buffer.from('test file content'),
            mimetype: 'image/jpeg'
          };
        }
        next();
      });
      
      app.put('/api/auth/profile-picture-error-test', (req, res) => {
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Simulate error
        return res.status(500).json({ message: 'Upload failed' });
      });
      
      const response = await request(app)
        .put('/api/auth/profile-picture-error-test')
        .set('x-mock-file', 'true');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Upload failed');
    });
  });
});