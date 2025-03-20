const ticketRepository = require('../repositories/ticketRepository');
const userRepository = require('../repositories/userRepository');
const Ticket = require('../models/Ticket');
const fileUploadService = require('../services/fileUploadService');
const { TICKET_STATUS, REIMBURSEMENT_TYPES, USER_ROLES } = require('../utils/constants');
const logger = require('../config/logger');

class TicketService {
  async createTicket(userId, ticketData, file = null) {
    if (!ticketData.amount || !ticketData.description || ticketData.description.trim() === '') {
      throw new Error('Amount and description are required');
    }

    if (ticketData.reimbursementType &&
      !Object.values(REIMBURSEMENT_TYPES).includes(ticketData.reimbursementType)) {
      throw new Error('Invalid reimbursement type');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let receiptKey = null;

    if (file) {
      receiptKey = await fileUploadService.uploadReceipt(file);
    }

    const newTicket = new Ticket({
      userId,
      amount: ticketData.amount,
      description: ticketData.description,
      reimbursementType: ticketData.reimbursementType,
      receiptKey: receiptKey,
      status: TICKET_STATUS.PENDING
    });

    return ticketRepository.create(newTicket);
  }
  
  async getUserTickets(userId, page = 1, limit = 10) {
    const result = await ticketRepository.findByUser(userId, page, limit);
    const tickets = result.tickets || [];

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          logger.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return {
      tickets,
      pagination: result.pagination || { total: tickets.length }
    };
  }

  async getUserTicketsByType(userId, reimbursementType, page = 1, limit = 10) {
    if (!Object.values(REIMBURSEMENT_TYPES).includes(reimbursementType)) {
      throw new Error('Invalid reimbursement type');
    }

    const result = await ticketRepository.findByUserAndType(userId, reimbursementType, page, limit);
    const tickets = result.tickets || [];

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          logger.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return {
      tickets,
      pagination: result.pagination || { total: tickets.length }
    };
  }

  async getTicketById(userId, ticketId) {
    const ticket = await ticketRepository.findById(userId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.receiptKey) {
      try {
        ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
      } catch (error) {
        logger.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
        ticket.receiptUrl = null;
      }
    }

    return ticket;
  }

  async getTicketsByStatus(status, page = 1, limit = 10) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new Error('Invalid ticket status');
    }

    const result = await ticketRepository.findByStatus(status, page, limit);
    const tickets = result.tickets || [];

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          logger.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return {
      tickets,
      pagination: result.pagination || { total: tickets.length }
    };
  }

  async getAllTickets(page = 1, limit = 10) {
    const result = await ticketRepository.getAllTickets(page, limit);
    const tickets = result.tickets || [];

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          logger.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return {
      tickets,
      pagination: result.pagination || { total: tickets.length }
    };
  }

  async processTicket(managerId, userId, ticketId, status) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new Error('Invalid ticket status');
    }
    const manager = await userRepository.findById(managerId);
    if (!manager || manager.role !== USER_ROLES.MANAGER) {
      throw new Error('Not authorized to process tickets');
    }

    if (managerId === userId) {
      throw new Error('Managers cannot process their own tickets');
    }

    return ticketRepository.processTicket(ticketId, userId, managerId, status);
  }
}

module.exports = new TicketService();