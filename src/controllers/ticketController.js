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
    const { type, page = 1, limit = 10 } = req.query;
    let result;
    
    if (type) {
      result = await ticketService.getUserTicketsByType(
        req.user.id, 
        type, 
        parseInt(page), 
        parseInt(limit)
      );
    } else {
      result = await ticketService.getUserTickets(
        req.user.id, 
        parseInt(page), 
        parseInt(limit)
      );
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(result.pagination.total / parseInt(limit));
    
    res.json({ 
      tickets: result.tickets,
      pagination: {
        total: result.pagination.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: totalPages
      }
    });
  } catch (error) {
    if (error.message === 'Invalid reimbursement type') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let result;
    
    if (status) {
      result = await ticketService.getTicketsByStatus(
        status, 
        parseInt(page), 
        parseInt(limit)
      );
    } else {
      result = await ticketService.getAllTickets(
        parseInt(page), 
        parseInt(limit)
      );
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(result.pagination.total / parseInt(limit));
    
    res.json({ 
      tickets: result.tickets,
      pagination: {
        total: result.pagination.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: totalPages
      }
    });
  } catch (error) {
    if (error.message === 'Invalid ticket status') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Get tickets error:', error);
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
        error.message === 'Ticket has already been processed' ||
        error.message === 'Managers cannot process their own tickets') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Not authorized to process tickets') {
      return res.status(403).json({ message: error.message });
    }
    console.error('Process ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};