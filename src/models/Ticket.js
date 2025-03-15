const { v4: uuidv4 } = require('uuid');
const { TICKET_STATUS } = require('../utils/constants');

class Ticket {
  constructor({
    id = uuidv4(),
    userId,
    amount,
    description,
    status = TICKET_STATUS.PENDING,
    reimbursementType, // Note: Not defaulting to 'OTHER'
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    processedBy = null,
    processedAt = null
  }) {
    this.id = id;
    this.userId = userId;
    this.amount = amount;
    this.description = description;
    this.status = status;
    this.reimbursementType = reimbursementType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.processedBy = processedBy;
    this.processedAt = processedAt;
  }

  toItem() {
    return {
      PK: `USER#${this.userId}`,
      SK: `TICKET#${this.id}`,
      id: this.id,
      userId: this.userId,
      amount: this.amount,
      description: this.description,
      status: this.status,
      reimbursementType: this.reimbursementType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      processedBy: this.processedBy,
      processedAt: this.processedAt,
      entityType: 'TICKET'
    };
  }

  static fromItem(item) {
    if (!item) return null;
    
    return new Ticket({
      id: item.id,
      userId: item.userId,
      amount: item.amount,
      description: item.description,
      status: item.status,
      reimbursementType: item.reimbursementType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      processedBy: item.processedBy,
      processedAt: item.processedAt
    });
  }
}

module.exports = Ticket;