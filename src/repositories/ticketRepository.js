const { dynamoDb, tableName } = require('../config/db');
const { PutCommand, QueryCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const Ticket = require('../models/Ticket');
const { TICKET_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

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
      logger.error('Error finding ticket by ID:', error);
      return null;
    }
  }

  async findByUser(userId, page = 1, limit = 10) {
    const params = {
      TableName: tableName,
      IndexName: 'UserTicketsIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':entityType': 'TICKET'
      },
      ScanIndexForward: true
    };

    try {
      const { Items, Count, ScannedCount } = await dynamoDb.send(new QueryCommand(params));
      return {
        tickets: Items.map(item => Ticket.fromItem(item)),
        pagination: {
          total: Count,
          scannedCount: ScannedCount
        }
      };
    } catch (error) {
      logger.error('Error finding tickets by user:', error);
      return {
        tickets: [],
        pagination: {
          total: 0,
          scannedCount: 0
        }
      };
    }
  }

  async findByStatus(status, page = 1, limit = 10) {
    const params = {
      TableName: tableName,
      IndexName: 'TicketStatusIndex',
      KeyConditionExpression: '#statusAttr = :status',
      ExpressionAttributeNames: {
        '#statusAttr': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      },
      ScanIndexForward: true
    };

    try {
      const { Items, Count, ScannedCount } = await dynamoDb.send(new QueryCommand(params));

      const startIndex = (page - 1) * limit;
      const paginatedItems = Items.slice(startIndex, startIndex + limit);

      return {
        tickets: paginatedItems.map(item => Ticket.fromItem(item)),
        pagination: {
          total: Count,
          scannedCount: ScannedCount
        }
      };
    } catch (error) {
      logger.error(`Error finding tickets by status ${status}:`, error);
      return {
        tickets: [],
        pagination: {
          total: 0,
          scannedCount: 0
        }
      };
    }
  }

  async findByUserAndType(userId, reimbursementType, page = 1, limit = 10) {
    const params = {
      TableName: tableName,
      IndexName: 'UserTicketsIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'reimbursementType = :type',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':type': reimbursementType
      },
      ScanIndexForward: true
    };

    try {
      const { Items, Count, ScannedCount } = await dynamoDb.send(new QueryCommand(params));

      const startIndex = (page - 1) * limit;
      const paginatedItems = Items.slice(startIndex, startIndex + limit);

      return {
        tickets: paginatedItems.map(item => Ticket.fromItem(item)),
        pagination: {
          total: Count,
          scannedCount: ScannedCount
        }
      };
    } catch (error) {
      logger.error('Error finding tickets by user and type:', error);
      return {
        tickets: [],
        pagination: {
          total: 0,
          scannedCount: 0
        }
      };
    }
  }

  async processTicket(ticketId, userId, managerId, status) {
    if (status !== TICKET_STATUS.APPROVED && status !== TICKET_STATUS.DENIED) {
      throw new Error('Invalid ticket status');
    }

    const ticket = await this.findById(userId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== TICKET_STATUS.PENDING) {
      throw new Error('Ticket has already been processed');
    }

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    ticket.processedBy = managerId;
    ticket.processedAt = new Date().toISOString();

    return this.update(ticket);
  }

  async getAllTickets(page = 1, limit = 10) {
    const params = {
      TableName: tableName,
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'TICKET'
      }
    };

    try {
      const { Items, Count, ScannedCount } = await dynamoDb.send(new ScanCommand(params));
      const sortedItems = Items.map(item => Ticket.fromItem(item))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const startIndex = (page - 1) * limit;
      const paginatedItems = sortedItems.slice(startIndex, startIndex + limit);

      return {
        tickets: paginatedItems,
        pagination: {
          total: sortedItems.length,
          scannedCount: ScannedCount
        }
      };
    } catch (error) {
      logger.error('Error getting all tickets:', error);
      return {
        tickets: [],
        pagination: {
          total: 0,
          scannedCount: 0
        }
      };
    }
  }

  async findByTicketId(ticketId) {
    const params = {
      TableName: tableName,
      IndexName: 'TicketIdIndex',
      KeyConditionExpression: 'id = :ticketId AND entityType = :entityType',
      ExpressionAttributeValues: {
        ':ticketId': ticketId,
        ':entityType': 'TICKET'
      }
    };

    try {
      const { Items } = await dynamoDb.send(new QueryCommand(params));
      if (!Items || Items.length === 0) return null;
      return Ticket.fromItem(Items[0]);
    } catch (error) {
      logger.error('Error finding ticket by ID:', error);
      return null;
    }
  }
}

module.exports = new TicketRepository();