const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { TICKET_STATUS, USER_ROLES, REIMBURSEMENT_TYPES } = require('../../src/utils/constants');

// Mock repositories
jest.mock('../../src/repositories/ticketRepository');
jest.mock('../../src/repositories/userRepository');

const ticketRepository = require('../../src/repositories/ticketRepository');
const userRepository = require('../../src/repositories/userRepository');
const User = require('../../src/models/User');
const Ticket = require('../../src/models/Ticket');

describe('Ticket API', () => {
  let employeeToken, managerToken;
  const employeeUser = new User({
    id: '1',
    username: 'employee',
    role: USER_ROLES.EMPLOYEE
  });
  
  const managerUser = new User({
    id: '2',
    username: 'manager',
    role: USER_ROLES.MANAGER
  });

  beforeEach(() => {
    // Create tokens
    employeeToken = jwt.sign(
      { user: { id: employeeUser.id, username: employeeUser.username, role: employeeUser.role } },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { user: { id: managerUser.id, username: managerUser.username, role: managerUser.role } },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    // Mock repository methods
    userRepository.findById = jest.fn().mockImplementation(id => {
      if (id === '1') return Promise.resolve(employeeUser);
      if (id === '2') return Promise.resolve(managerUser);
      return Promise.resolve(null);
    });

    ticketRepository.create = jest.fn().mockImplementation(ticket => Promise.resolve(ticket));
    
    // Update mock implementations for pagination
    ticketRepository.findByUser = jest.fn().mockImplementation(() => 
      Promise.resolve({
        tickets: [
          new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket' }),
          new Ticket({ id: '2', userId: '1', amount: 200, description: 'Another ticket' })
        ],
        pagination: {
          total: 2,
          scannedCount: 2
        }
      })
    );
    
    ticketRepository.findByUserAndType = jest.fn().mockImplementation((userId, type) => 
      Promise.resolve({
        tickets: [
          new Ticket({ 
            id: '1', 
            userId, 
            amount: 100, 
            description: 'Test ticket', 
            reimbursementType: type 
          })
        ],
        pagination: {
          total: 1,
          scannedCount: 1
        }
      })
    );
    
    ticketRepository.findByStatus = jest.fn().mockImplementation(status => 
      Promise.resolve({
        tickets: [
          new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket', status }),
          new Ticket({ id: '2', userId: '3', amount: 300, description: 'Other ticket', status })
        ],
        pagination: {
          total: 2,
          scannedCount: 2
        }
      })
    );
    
    ticketRepository.getAllTickets = jest.fn().mockImplementation(() => 
      Promise.resolve({
        tickets: [
          new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket' }),
          new Ticket({ id: '2', userId: '3', amount: 300, description: 'Other ticket' })
        ],
        pagination: {
          total: 2,
          scannedCount: 2
        }
      })
    );
    
    ticketRepository.findById = jest.fn().mockImplementation((userId, ticketId) => 
      Promise.resolve(
        new Ticket({ 
          id: ticketId, 
          userId, 
          amount: 100, 
          description: 'Test ticket',
          status: TICKET_STATUS.PENDING
        })
      )
    );
    
    ticketRepository.processTicket = jest.fn().mockImplementation((ticketId, userId, managerId, status) => 
      Promise.resolve(
        new Ticket({ 
          id: ticketId, 
          userId, 
          amount: 100, 
          description: 'Test ticket',
          status,
          processedBy: managerId,
          processedAt: new Date().toISOString()
        })
      )
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tickets', () => {
    it('should create a new ticket', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          amount: 100,
          description: 'Test ticket',
          reimbursementType: REIMBURSEMENT_TYPES.TRAVEL
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Ticket created successfully');
      expect(res.body.ticket).toHaveProperty('id');
      expect(res.body.ticket.amount).toBe(100);
      expect(res.body.ticket.description).toBe('Test ticket');
      expect(res.body.ticket.reimbursementType).toBe(REIMBURSEMENT_TYPES.TRAVEL);
      expect(res.body.ticket.status).toBe(TICKET_STATUS.PENDING);
    });

    it('should not create a ticket without amount or description', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          description: 'Test ticket'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Amount and description are required');
    });

    it('should not create a ticket without authentication', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          amount: 100,
          description: 'Test ticket'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/tickets/my', () => {
    it('should get all user tickets', async () => {
      const res = await request(app)
        .get('/api/tickets/my')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByUser).toHaveBeenCalledWith('1', 1, 10);
    });

    it('should get user tickets by type using query parameter', async () => {
      const res = await request(app)
        .get(`/api/tickets/my?type=${REIMBURSEMENT_TYPES.TRAVEL}`)
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByUserAndType).toHaveBeenCalledWith('1', REIMBURSEMENT_TYPES.TRAVEL, 1, 10);
    });

    it('should return 400 for invalid reimbursement type', async () => {
      const res = await request(app)
        .get('/api/tickets/my?type=INVALID')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid reimbursement type');
    });

    it('should not get tickets without authentication', async () => {
      const res = await request(app)
        .get('/api/tickets/my');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/tickets/all', () => {
    it('should get all tickets for managers', async () => {
      const res = await request(app)
        .get('/api/tickets/all')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.getAllTickets).toHaveBeenCalledWith(1, 10);
    });

    it('should get tickets by status using query parameter for managers', async () => {
      const res = await request(app)
        .get(`/api/tickets/all?status=${TICKET_STATUS.PENDING}`)
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByStatus).toHaveBeenCalledWith(TICKET_STATUS.PENDING, 1, 10);
    });

    it('should get tickets with pagination', async () => {
      // Mock implementation specific for this test
      ticketRepository.getAllTickets.mockImplementationOnce(() => 
        Promise.resolve({
          tickets: [
            new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket' })
          ],
          pagination: {
            total: 2,
            scannedCount: 2
          }
        })
      );
      
      const res = await request(app)
        .get('/api/tickets/all?page=1&limit=1')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.pagination).toEqual(expect.objectContaining({
        total: 2,
        page: 1,
        limit: 1,
        pages: 2
      }));
      expect(ticketRepository.getAllTickets).toHaveBeenCalledWith(1, 1);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .get('/api/tickets/all?status=INVALID')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid ticket status');
    });

    it('should not allow employees to get all tickets', async () => {
      const res = await request(app)
        .get('/api/tickets/all')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/tickets/process', () => {
    it('should process a ticket as a manager with APPROVED status', async () => {
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '1',
          ticketId: '1',
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ticket processed successfully');
      expect(res.body.ticket.status).toBe(TICKET_STATUS.APPROVED);
      expect(res.body.ticket.processedBy).toBe('2');
      expect(res.body.ticket).toHaveProperty('processedAt');
      expect(ticketRepository.processTicket).toHaveBeenCalledWith('1', '1', '2', TICKET_STATUS.APPROVED);
    });

    it('should process a ticket as a manager with DENIED status', async () => {
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '1',
          ticketId: '1',
          status: TICKET_STATUS.DENIED
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ticket processed successfully');
      expect(res.body.ticket.status).toBe(TICKET_STATUS.DENIED);
      expect(res.body.ticket.processedBy).toBe('2');
      expect(res.body.ticket).toHaveProperty('processedAt');
      expect(ticketRepository.processTicket).toHaveBeenCalledWith('1', '1', '2', TICKET_STATUS.DENIED);
    });

    it('should not allow employees to process tickets', async () => {
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', employeeToken)
        .send({
          userId: '1',
          ticketId: '1',
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '1',
          ticketId: '1',
          status: 'INVALID'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Error handling in Ticket API', () => {
    let employeeToken, managerToken;
    
    beforeEach(() => {
      employeeToken = jwt.sign(
        { user: { id: '1', username: 'employee', role: USER_ROLES.EMPLOYEE } },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
      );
  
      managerToken = jwt.sign(
        { user: { id: '2', username: 'manager', role: USER_ROLES.MANAGER } },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
      );
      
      // Mock database error for the first call to findByUser
      ticketRepository.findByUser.mockRejectedValueOnce(new Error('Database error'));
    });
    
    it('should handle errors when creating tickets', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          description: 'Test ticket'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Amount and description are required');
    });
    
    it('should handle database errors when fetching tickets', async () => {
      const res = await request(app)
        .get('/api/tickets/my')
        .set('x-auth-token', employeeToken);
      
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
    
    it('should handle missing fields in ticket processing', async () => {
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '1'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('User ID, ticket ID, and status are required');
    });
    
    it('should handle ticket not found when processing', async () => {
      ticketRepository.processTicket.mockRejectedValueOnce(new Error('Ticket not found'));
      
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '999',
          ticketId: '999',
          status: TICKET_STATUS.APPROVED
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Ticket not found');
    });
    
    it('should handle already processed tickets', async () => {
      ticketRepository.processTicket.mockRejectedValueOnce(new Error('Ticket has already been processed'));
      
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '1',
          ticketId: '1',
          status: TICKET_STATUS.APPROVED
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Ticket has already been processed');
    });
    
    it('should handle managers trying to process their own tickets', async () => {
      ticketRepository.processTicket.mockRejectedValueOnce(new Error('Managers cannot process their own tickets'));
      
      const res = await request(app)
        .post('/api/tickets/process')
        .set('x-auth-token', managerToken)
        .send({
          userId: '2',
          ticketId: '3',
          status: TICKET_STATUS.APPROVED
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Managers cannot process their own tickets');
    });
  });
});