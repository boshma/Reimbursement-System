const ticketService = require('../services/ticketService');
const { TICKET_STATUS } = require('../utils/constants');

exports.createTicket = async (req, res) => {
  try {
    const { amount, description, reimbursementType } = req.body;
    
    if (!amount || !description) {
      return res.status(400).json({ message: 'Amount and description are required' });
    }
    
    const file = req.file || null;
    
    const ticket = await ticketService.createTicket(req.user.id, {
      amount,
      description,
      reimbursementType
    }, file);
    
    res.status(201).json({ message: 'Ticket created successfully', ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await ticketService.getUserTickets(req.user.id);
    res.json({ tickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTicketsByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const tickets = await ticketService.getUserTicketsByType(req.user.id, type);
    res.json({ tickets });
  } catch (error) {
    if (error.message === 'Invalid reimbursement type') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Get tickets by type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTicketsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const tickets = await ticketService.getTicketsByStatus(status);
    res.json({ tickets });
  } catch (error) {
    if (error.message === 'Invalid ticket status') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Get tickets by status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await ticketService.getAllTickets();
    res.json({ tickets });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.processTicket = async (req, res) => {
  try {
    const { userId, ticketId, status } = req.body;
    
    if (!userId || !ticketId || !status) {
      return res.status(400).json({ message: 'User ID, ticket ID, and status are required' });
    }
    
    const processedTicket = await ticketService.processTicket(
      req.user.id,
      userId,
      ticketId,
      status
    );
    
    res.json({ message: 'Ticket processed successfully', ticket: processedTicket });
  } catch (error) {
    if (error.message === 'Ticket not found' || 
        error.message === 'Invalid ticket status' || 
        error.message === 'Ticket has already been processed') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Not authorized to process tickets') {
      return res.status(403).json({ message: error.message });
    }
    console.error('Process ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};