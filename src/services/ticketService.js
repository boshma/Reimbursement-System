const ticketRepository = require('../repositories/ticketRepository');
const userRepository = require('../repositories/userRepository');
const Ticket = require('../models/Ticket');
const { TICKET_STATUS, REIMBURSEMENT_TYPES, USER_ROLES } = require('../utils/constants');

class TicketService {
  async createTicket(userId, ticketData, file = null) {
    if (!ticketData.amount || !ticketData.description) {
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
  async getUserTickets(userId) {
    const tickets = await ticketRepository.findByUser(userId);

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          console.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return tickets;
  }

  async getUserTicketsByType(userId, reimbursementType) {
    if (!Object.values(REIMBURSEMENT_TYPES).includes(reimbursementType)) {
      throw new Error('Invalid reimbursement type');
    }

    const tickets = await ticketRepository.findByUserAndType(userId, reimbursementType);

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          console.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return tickets;
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
        console.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
        ticket.receiptUrl = null;
      }
    }

    return ticket;
  }

  async getTicketsByStatus(status) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new Error('Invalid ticket status');
    }

    const tickets = await ticketRepository.findByStatus(status);

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          console.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return tickets;
  }


  async getAllTickets() {
    const tickets = await ticketRepository.getAllTickets();

    for (const ticket of tickets) {
      if (ticket.receiptKey) {
        try {
          ticket.receiptUrl = await fileUploadService.getSignedUrl(ticket.receiptKey);
        } catch (error) {
          console.error(`Error generating URL for receipt ${ticket.receiptKey}:`, error);
          ticket.receiptUrl = null;
        }
      }
    }

    return tickets;
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