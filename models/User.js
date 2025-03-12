class User {
    constructor(id, username, password, role = 'employee', name = '', address = '') {
      this.id = id;
      this.username = username;
      this.password = password;
      this.role = role;
      this.name = name;
      this.address = address;
      this.createdAt = new Date().toISOString();
    }
  
    toItem() {
      return {
        PK: `USER#${this.id}`,
        SK: `USER#${this.id}`,
        id: this.id,
        username: this.username,
        password: this.password,
        role: this.role,
        name: this.name,
        address: this.address,
        createdAt: this.createdAt,
        type: 'USER'
      };
    }
  
    static fromItem(item) {
      if (!item) return null;
      return new User(
        item.id,
        item.username,
        item.password,
        item.role,
        item.name,
        item.address
      );
    }
  }
  
  module.exports = User;