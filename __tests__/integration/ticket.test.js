const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { TICKET_STATUS, USER_ROLES, REIMBURSEMENT_TYPES } = require('../../src/utils/constants');

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

    userRepository.findById = jest.fn().mockImplementation(id => {
      if (id === '1') return Promise.resolve(employeeUser);
      if (id === '2') return Promise.resolve(managerUser);
      return Promise.resolve(null);
    });

    ticketRepository.create = jest.fn().mockImplementation(ticket => Promise.resolve(ticket));

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

    ticketRepository.findByTicketId = jest.fn().mockImplementation((ticketId) =>
      Promise.resolve(
        new Ticket({
          id: ticketId,
          userId: '1',  // Default to employee user
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

    ticketRepository.update = jest.fn().mockImplementation((ticket) =>
      Promise.resolve(ticket)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tickets', () => {
    test('should create a new ticket', async () => {
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

    test('should convert string amount to number when creating a ticket', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          amount: "150",
          description: 'Test ticket with string amount',
          reimbursementType: REIMBURSEMENT_TYPES.TRAVEL
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.ticket.amount).toBe(150);
      expect(typeof res.body.ticket.amount).toBe('number');
    });

    test('should not create a ticket without amount or description', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          description: 'Test ticket'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Amount and description are required');
    });

    test('should not create a ticket without authentication', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          amount: 100,
          description: 'Test ticket'
        });

      expect(res.statusCode).toBe(401);
    });

    test('should handle invalid reimbursement type error', async () => {
      ticketRepository.create.mockImplementationOnce(() => {
        throw new Error('Invalid reimbursement type');
      });

      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          amount: 100,
          description: 'Test ticket with invalid type',
          reimbursementType: 'INVALID_TYPE'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid reimbursement type');
    });

    test('should handle other server errors when creating tickets', async () => {
      ticketRepository.create.mockImplementationOnce(() => {
        throw new Error('Some unexpected server error');
      });

      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          amount: 100,
          description: 'Test ticket',
          reimbursementType: REIMBURSEMENT_TYPES.TRAVEL
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Some unexpected server error');
    });
  });

  describe('GET /api/tickets/users/:userId/tickets', () => {
    test('should get all user tickets', async () => {
      const res = await request(app)
        .get('/api/tickets/users/1/tickets')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByUser).toHaveBeenCalledWith('1', 1, 10);

      expect(typeof res.body.tickets[0].amount).toBe('number');
      expect(typeof res.body.tickets[1].amount).toBe('number');
    });

    test('should get user tickets by type using query parameter', async () => {
      const res = await request(app)
        .get(`/api/tickets/users/1/tickets?type=${REIMBURSEMENT_TYPES.TRAVEL}`)
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByUserAndType).toHaveBeenCalledWith('1', REIMBURSEMENT_TYPES.TRAVEL, 1, 10);

      expect(typeof res.body.tickets[0].amount).toBe('number');
    });

    test('should return 400 for invalid reimbursement type', async () => {
      const res = await request(app)
        .get('/api/tickets/users/1/tickets?type=INVALID')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid reimbursement type');
    });

    test('should not get tickets without authentication', async () => {
      const res = await request(app)
        .get('/api/tickets/users/1/tickets');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/tickets', () => {
    test('should get all tickets for managers', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.getAllTickets).toHaveBeenCalledWith(1, 10);
    });

    test('should get tickets by status using query parameter for managers', async () => {
      const res = await request(app)
        .get(`/api/tickets?status=${TICKET_STATUS.PENDING}`)
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(ticketRepository.findByStatus).toHaveBeenCalledWith(TICKET_STATUS.PENDING, 1, 10);
    });

    test('should get tickets with pagination', async () => {
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
        .get('/api/tickets?page=1&limit=1')
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

    test('should return 400 for invalid status', async () => {
      const res = await request(app)
        .get('/api/tickets?status=INVALID')
        .set('x-auth-token', managerToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid ticket status');
    });

    test('should not allow employees to get all tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/tickets/:ticketId', () => {
    test('should process a ticket as a manager with APPROVED status', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ticket processed successfully');
      expect(res.body.ticket.status).toBe(TICKET_STATUS.APPROVED);
      expect(res.body.ticket.processedBy).toBe('2'); // Manager ID
      expect(res.body.ticket).toHaveProperty('processedAt');
    });

    test('should process a ticket as a manager with DENIED status', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.DENIED
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Ticket processed successfully');
      expect(res.body.ticket.status).toBe(TICKET_STATUS.DENIED);
      expect(res.body.ticket.processedBy).toBe('2'); // Manager ID
      expect(res.body.ticket).toHaveProperty('processedAt');
    });

    test('should not allow employees to process tickets', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', employeeToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(403);
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: 'INVALID'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid ticket status');
    });

    test('should return 400 if status is not provided', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Status is required');
    });

    test('should handle not authorized to process tickets', async () => {
      ticketRepository.findByTicketId.mockResolvedValueOnce(
        new Ticket({
          id: '1',
          userId: '1',
          amount: 100,
          description: 'Test ticket',
          status: TICKET_STATUS.PENDING
        })
      );

      userRepository.findById.mockResolvedValueOnce({
        ...managerUser,
        role: USER_ROLES.EMPLOYEE // Make the manager an employee
      });

      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Not authorized to process tickets');
    });

    test('should handle ticket not found when processing', async () => {
      ticketRepository.findByTicketId.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/tickets/999')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Ticket not found');
    });

    test('should handle already processed tickets', async () => {
      ticketRepository.findByTicketId.mockResolvedValueOnce(
        new Ticket({
          id: '1',
          userId: '1',
          amount: 100,
          description: 'Test ticket',
          status: TICKET_STATUS.APPROVED,
          processedBy: '2',
          processedAt: new Date().toISOString()
        })
      );

      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Ticket has already been processed');
    });

    test('should handle managers trying to process their own tickets', async () => {
      ticketRepository.findByTicketId.mockResolvedValueOnce(
        new Ticket({
          id: '1',
          userId: '2', // Same as the manager's ID
          amount: 100,
          description: 'Test ticket',
          status: TICKET_STATUS.PENDING
        })
      );

      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Managers cannot process their own tickets');
    });

    test('should handle invalid ticket status when processing', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: 'INVALID_STATUS'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid ticket status');
    });

    test('should handle general server errors during ticket processing', async () => {
      ticketRepository.findByTicketId.mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({
          status: TICKET_STATUS.APPROVED
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Server error');
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

      ticketRepository.findByUser.mockRejectedValueOnce(new Error('Database error'));
    });

    test('should handle errors when creating tickets', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('x-auth-token', employeeToken)
        .send({
          description: 'Test ticket'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Amount and description are required');
    });

    test('should handle database errors when fetching tickets', async () => {
      const res = await request(app)
        .get('/api/tickets/users/1/tickets')
        .set('x-auth-token', employeeToken);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Server error');
    });

    test('should handle missing fields in ticket processing', async () => {
      const res = await request(app)
        .patch('/api/tickets/1')
        .set('x-auth-token', managerToken)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Status is required');
    });
  });
});