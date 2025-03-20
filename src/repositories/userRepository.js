const { dynamoDb, tableName } = require('../config/db');
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const User = require('../models/User');
const logger = require('../config/logger');

class UserRepository {
  async create(user) {
    const item = user.toItem();
    
    const params = {
      TableName: tableName,
      Item: item,
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

  async findById(id) {
    const params = {
      TableName: tableName,
      Key: {
        PK: `USER#${id}`,
        SK: `USER#${id}`
      }
    };

    try {
      const { Item } = await dynamoDb.send(new GetCommand(params));
      return User.fromItem(Item);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      return null;
    }
  }

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
      if (!Items || Items.length === 0) return null;
      return User.fromItem(Items[0]);
    } catch (error) {
      logger.error('Error finding user by username:', error);
      return null;
    }
  }

  async update(user) {
    const item = user.toItem();
    item.updatedAt = new Date().toISOString();

    const params = {
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_exists(PK)'
    };

    try {
      await dynamoDb.send(new PutCommand(params));
      return user;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('User not found');
      }
      throw error;
    }
  }
}

module.exports = new UserRepository();