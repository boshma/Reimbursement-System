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
    
    ticketRepository.findByUser = jest.fn().mockImplementation(() => 
      Promise.resolve([
        new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket' }),
        new Ticket({ id: '2', userId: '1', amount: 200, description: 'Another ticket' })
      ])
    );
    
    ticketRepository.findByUserAndType = jest.fn().mockImplementation((userId, type) => 
      Promise.resolve([
        new Ticket({ 
          id: '1', 
          userId, 
          amount: 100, 
          description: 'Test ticket', 
          reimbursementType: type 
        })
      ])
    );
    
    ticketRepository.findByStatus = jest.fn().mockImplementation(status => 
      Promise.resolve([
        new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket', status }),
        new Ticket({ id: '2', userId: '3', amount: 300, description: 'Other ticket', status })
      ])
    );
    
    ticketRepository.getAllTickets = jest.fn().mockImplementation(() => 
      Promise.resolve([
        new Ticket({ id: '1', userId: '1', amount: 100, description: 'Test ticket' }),
        new Ticket({ id: '2', userId: '3', amount: 300, description: 'Other ticket' })
      ])
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
      expect(ticketRepository.findByUser).toHaveBeenCalledWith('1');
    });

    it('should get user tickets by type using query parameter', async () => {
      const res = await request(app)
        .get(`/api/tickets/my?type=${REIMBURSEMENT_TYPES.TRAVEL}`)
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByUserAndType).toHaveBeenCalledWith('1', REIMBURSEMENT_TYPES.TRAVEL);
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
      expect(ticketRepository.getAllTickets).toHaveBeenCalled();
    });

    it('should get tickets by status using query parameter for managers', async () => {
      const res = await request(app)
        .get(`/api/tickets/all?status=${TICKET_STATUS.PENDING}`)
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByStatus).toHaveBeenCalledWith(TICKET_STATUS.PENDING);
    });

    it('should get tickets with pagination', async () => {
      const res = await request(app)
        .get('/api/tickets/all?page=1&limit=1')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 1,
        pages: 2
      });
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
});