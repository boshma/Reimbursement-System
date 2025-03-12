const { dynamoDb, tableName } = require('../config/db');
const { PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

class UserRepository {
    /**
     * Create a new user
     * @param {User} user - The user to create
     * @returns {Promise<User>} - The created user
     */
    async createUser(user) {
        if (!user.id) {
            user.id = uuidv4();
        }

        const params = {
            TableName: tableName,
            Item: user.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)'
        };

        try {
            await dynamoDb.send(new PutCommand(params));
            return user;
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('User already exists');
            }
            throw error;
        }
    }

    /**
     * Find a user by ID
     * @param {string} id - The user ID
     * @returns {Promise<User|null>} - The found user or null
     */
    async findById(id) {
        const params = {
            TableName: tableName,
            Key: {
                PK: `USER#${id}`,
                SK: `USER#${id}`
            }
        };

        const { Item } = await dynamoDb.send(new GetCommand(params));
        return User.fromItem(Item);
    }

    /**
     * Find a user by username
     * @param {string} username - The username
     * @returns {Promise<User|null>} - The found user or null
     */
    async findByUsername(username) {
        const params = {
            TableName: tableName,
            IndexName: 'UsernameIndex',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        };

        try {
            const { Items } = await dynamoDb.send(new QueryCommand(params));
            if (Items && Items.length > 0) {
                return User.fromItem(Items[0]);
            }
            return null;
        } catch (error) {
            console.error('Error finding user by username:', error);
            return null;
        }
    }

    /**
     * Update a user
     * @param {User} user - The user to update
     * @returns {Promise<User>} - The updated user
     */
    async updateUser(user) {
        const params = {
            TableName: tableName,
            Key: {
                PK: `USER#${user.id}`,
                SK: `USER#${user.id}`
            },
            UpdateExpression: 'set #role = :role, #name = :name, #address = :address',
            ExpressionAttributeNames: {
                '#role': 'role',
                '#name': 'name',
                '#address': 'address'
            },
            ExpressionAttributeValues: {
                ':role': user.role,
                ':name': user.name,
                ':address': user.address
            },
            ReturnValues: 'ALL_NEW'
        };

        const { Attributes } = await dynamoDb.send(new UpdateCommand(params));
        return User.fromItem(Attributes);
    }

    /**
     * Get all users
     * @returns {Promise<User[]>} - All users
     */
    async getAllUsers() {
        const params = {
            TableName: tableName,
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':type': 'USER'
            }
        };

        const { Items } = await dynamoDb.send(new QueryCommand(params));
        return Items.map(item => User.fromItem(item));
    }
}

module.exports = new UserRepository();