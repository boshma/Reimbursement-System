const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const { isManager } = require('../middleware/roleCheck');
const upload = require('../middleware/multerUpload');

router.post('/', [auth, upload.single('receipt')], ticketController.createTicket);
router.get('/users/:userId/tickets', auth, ticketController.getUserTickets);

router.get('/', [auth, isManager], ticketController.getAllTickets);
router.patch('/:ticketId', [auth, isManager], ticketController.processTicket);

module.exports = router;