const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../../src/services/authService');
const userRepository = require('../../src/repositories/userRepository');
const User = require('../../src/models/User');

jest.mock('../../src/repositories/userRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken')

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should successfully register a user', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const hashedPassword = 'hashedpassword';
      const mockUser = new User({ ...userData, password: hashedPassword });
      
      userRepository.findByUsername.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(mockUser);
      
      const result = await authService.register(userData);
      
      expect(userRepository.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 'salt');
      expect(userRepository.create).toHaveBeenCalled();
      expect(result.password).toBeUndefined();
      expect(result.username).toBe(userData.username);
    });
    
    test('should throw error if username already exists', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123'
      };
      
      userRepository.findByUsername.mockResolvedValue(new User({ username: 'existinguser' }));
      
      await expect(authService.register(userData)).rejects.toThrow('Username already exists');
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
  
  describe('login', () => {
    test('should successfully login a user', async () => {
      const username = 'testuser';
      const password = 'password123';
      const mockUser = new User({
        id: '123',
        username,
        password: 'hashedpassword',
        role: 'EMPLOYEE'
      });
      
      userRepository.findByUsername.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');
      

      const result = await authService.login(username, password);
      
      expect(userRepository.findByUsername).toHaveBeenCalledWith(username);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'token');
      expect(result).toHaveProperty('user');
      expect(result.user.password).toBeUndefined();
    });
    
    test('should throw error if user not found', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      
      await expect(authService.login('nonexistent', 'password')).rejects.toThrow('Invalid credentials');
    });
    
    test('should throw error if password is incorrect', async () => {
      const mockUser = new User({
        username: 'testuser',
        password: 'hashedpassword'
      });
      
      userRepository.findByUsername.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(authService.login('testuser', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });
});