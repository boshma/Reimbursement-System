const { v4: uuidv4 } = require('uuid');

class User {
  constructor({
    id = uuidv4(),
    username,
    password,
    firstName = '',
    lastName = '',
    email = '',
    role = 'EMPLOYEE',
    address = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.role = role;
    this.address = address;
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
      role: this.role,
      address: this.address,
      entityType: 'USER',
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
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
      role: item.role,
      address: item.address,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    });
  }

  sanitize() {
    const sanitized = { ...this };
    delete sanitized.password;
    return sanitized;
  }
}

module.exports = User;