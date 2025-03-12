const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

class AuthService {
  /**
   * Register a new user
   * @param {string} username - The username
   * @param {string} password - The password
   * @param {string} name - The user's name
   * @param {string} address - The user's address
   * @returns {Promise<{user: User, token: string}>} - The registered user and token
   */
  async register(username, password, name = '', address = '') {
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User(null, username, hashedPassword, 'employee', name, address);
    const savedUser = await userRepository.createUser(user);

    const token = generateToken({
      id: savedUser.id,
      username: savedUser.username,
      role: savedUser.role
    });

    return {
      user: {
        id: savedUser.id,
        username: savedUser.username,
        role: savedUser.role,
        name: savedUser.name,
        address: savedUser.address
      },
      token
    };
  }

  /**
   * Login a user
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<{user: User, token: string}>} - The logged in user and token
   */
  async login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        address: user.address
      },
      token
    };
  }

  /**
   * Change user role
   * @param {string} userId - The user ID
   * @param {string} newRole - The new role
   * @returns {Promise<User>} - The updated user
   */
  async changeRole(userId, newRole) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (newRole !== 'employee' && newRole !== 'manager') {
      throw new Error('Invalid role');
    }

    user.role = newRole;
    return await userRepository.updateUser(user);
  }

  /**
   * Update user profile
   * @param {string} userId - The user ID
   * @param {Object} updates - The updates
   * @returns {Promise<User>} - The updated user
   */
  async updateProfile(userId, { name, address }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (name) user.name = name;
    if (address) user.address = address;

    return await userRepository.updateUser(user);
  }
}

module.exports = new AuthService();