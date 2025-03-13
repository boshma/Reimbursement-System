const { v4: uuidv4 } = require('uuid');
const { USER_ROLES } = require('../utils/constants');

class User {
  constructor({
    id = uuidv4(),
    username,
    password,
    firstName = '',
    lastName = '',
    email = '',
    address = '',
    role = USER_ROLES.EMPLOYEE,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.address = address;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toItem() {
    return {
      PK: `USER#${this.id}`,
      SK: `USER#${this.id}`,
      id: this.id,
      username: this.username,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      address: this.address,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      entityType: 'USER'
    };
  }

  static fromItem(item) {
    if (!item) return null;
    
    return new User({
      id: item.id,
      username: item.username,
      password: item.password,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      address: item.address,
      role: item.role,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    });
  }

  // Return user data without sensitive information
  sanitize() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;