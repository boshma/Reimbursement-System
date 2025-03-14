const { dynamoDb, tableName } = require('../config/db');
const { PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const Ticket = require('../models/Ticket');
const { TICKET_STATUS } = require('../utils/constants');

class TicketRepository {
  async create(ticket) {
    const item = ticket.toItem();
    
    const params = {
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(SK)'
    };

    try {
      await dynamoDb.send(new PutCommand(params));
      return ticket;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Ticket already exists');
      }
      throw error;
    }
  }

  async update(ticket) {
    const item = ticket.toItem();
    item.updatedAt = new Date().toISOString();

    const params = {
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    };

    try {
      await dynamoDb.send(new PutCommand(params));
      return ticket;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Ticket not found');
      }
      throw error;
    }
  }

  async findById(userId, ticketId) {
    const params = {
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `TICKET#${ticketId}`
      }
    };

    try {
      const { Item } = await dynamoDb.send(new GetCommand(params));
      return Ticket.fromItem(Item);
    } catch (error) {
      console.error('Error finding ticket by ID:', error);
      return null;
    }
  }

  async findByUserId(userId) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TICKET#'
      }
    };

    try {
      const { Items } = await dynamoDb.send(new QueryCommand(params));
      return Items.map(item => Ticket.fromItem(item));
    } catch (error) {
      console.error('Error finding tickets by user ID:', error);
      throw error;
    }
  }

  async findByUserIdAndType(userId, reimbursementType) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'reimbursementType = :type',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TICKET#',
        ':type': reimbursementType
      }
    };

    try {
      const { Items } = await dynamoDb.send(new QueryCommand(params));
      return Items.map(item => Ticket.fromItem(item));
    } catch (error) {
      console.error('Error finding tickets by user ID and type:', error);
      throw error;
    }
  }

  async findPendingTickets() {
    const params = {
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `TICKET#${TICKET_STATUS.PENDING}`
      }
    };

    try {
      const { Items } = await dynamoDb.send(new QueryCommand(params));
      return Items.map(item => Ticket.fromItem(item));
    } catch (error) {
      console.error('Error finding pending tickets:', error);
      throw error;
    }
  }
}

module.exports = new TicketRepository();