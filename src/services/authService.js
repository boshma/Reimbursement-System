const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants');

class AuthService {
  async register(userData) {
    const existingUser = await userRepository.findByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const newUser = new User({
      ...userData,
      password: hashedPassword,
      role: userData.role || USER_ROLES.EMPLOYEE
    });
    
    const savedUser = await userRepository.create(newUser);
    
    return savedUser.sanitize();
  }
  
  async login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return {
      token,
      user: user.sanitize()
    };
  }

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.sanitize();
  }

  async updateUserRole(userId, newRole) {
    if (!Object.values(USER_ROLES).includes(newRole)) {
      throw new Error('Invalid role');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = newRole;
    user.updatedAt = new Date().toISOString();

    const updatedUser = await userRepository.update(user);
    return updatedUser.sanitize();
  }

  async updateUserProfile(userId, userData) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    Object.keys(userData).forEach(key => {
      if (key !== 'id' && key !== 'password' && key !== 'role') {
        user[key] = userData[key];
      }
    });

    user.updatedAt = new Date().toISOString();

    const updatedUser = await userRepository.update(user);
    return updatedUser.sanitize();
  }

  async updateProfilePicture(userId, profilePictureKey) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    user.profilePictureKey = profilePictureKey;
    user.updatedAt = new Date().toISOString();
  
    const updatedUser = await userRepository.update(user);
    return updatedUser.sanitize();
  }
}

module.exports = new AuthService();