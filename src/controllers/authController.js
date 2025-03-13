const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const { username, password, firstName, lastName, email, address } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await authService.register({
      username,
      password,
      firstName,
      lastName,
      email,
      address
    });
    
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const { token, user } = await authService.login(username, password);
    
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, address } = req.body;
    
    const updatedUser = await authService.updateUserProfile(req.user.id, {
      firstName,
      lastName,
      email,
      address
    });
    
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: 'User ID and role are required' });
    }
    
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Not authorized to update user roles' });
    }
    
    const updatedUser = await authService.updateUserRole(userId, role);
    
    res.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (error) {
    if (error.message === 'User not found' || error.message === 'Invalid role') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};