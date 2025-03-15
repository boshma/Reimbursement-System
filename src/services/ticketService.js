const ticketRepository = require('../repositories/ticketRepository');
const userRepository = require('../repositories/userRepository');
const Ticket = require('../models/Ticket');
const { TICKET_STATUS, REIMBURSEMENT_TYPES, USER_ROLES } = require('../utils/constants');

class TicketService {
  async createTicket(userId, ticketData) {
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

    const newTicket = new Ticket({
      userId,
      amount: ticketData.amount,
      description: ticketData.description,
      reimbursementType: ticketData.reimbursementType,
      status: TICKET_STATUS.PENDING
    });

    return ticketRepository.create(newTicket);
  }

  async getUserTickets(userId) {
    return ticketRepository.findByUser(userId);
  }

  async getUserTicketsByType(userId, reimbursementType) {
    if (!Object.values(REIMBURSEMENT_TYPES).includes(reimbursementType)) {
      throw new Error('Invalid reimbursement type');
    }
    
    return ticketRepository.findByUserAndType(userId, reimbursementType);
  }

  async getTicketById(userId, ticketId) {
    const ticket = await ticketRepository.findById(userId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    return ticket;
  }

  async getPendingTickets() {
    return ticketRepository.findByStatus(TICKET_STATUS.PENDING);
  }

  async getTicketsByStatus(status) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new Error('Invalid ticket status');
    }
    
    return ticketRepository.findByStatus(status);
  }

  async getAllTickets() {
    return ticketRepository.getAllTickets();
  }

  async processTicket(managerId, userId, ticketId, status) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new Error('Invalid ticket status');
    }
    
    const manager = await userRepository.findById(managerId);
    if (!manager || manager.role !== USER_ROLES.MANAGER) {
      throw new Error('Not authorized to process tickets');
    }

    return ticketRepository.processTicket(ticketId, userId, managerId, status);
  }
}

module.exports = new TicketService();