class User {
    constructor(username, password, role = 'EMPLOYEE', profile = {}) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.profile = profile;
        this.createdAt = new Date().toISOString();
    }

    toItem() {
        return {
            PK: `USER#${this.username}`,
            SK: `PROFILE#${this.username}`,
            username: this.username,
            password: this.password,
            role: this.role,
            profile: this.profile,
            createdAt: this.createdAt,
            type: 'USER'
        };
    }
}

module.exports = User;