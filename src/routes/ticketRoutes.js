const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const { isManager } = require('../middleware/roleCheck');

// Employee routes
router.post('/', auth, ticketController.createTicket);
router.get('/my', auth, ticketController.getUserTickets);
router.get('/my/type/:type', auth, ticketController.getTicketsByType);

// Manager routes
router.get('/status/:status', [auth, isManager], ticketController.getTicketsByStatus);
router.get('/all', [auth, isManager], ticketController.getAllTickets);
router.post('/process', [auth, isManager], ticketController.processTicket);

module.exports = router;