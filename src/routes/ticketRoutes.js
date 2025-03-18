const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const { isManager } = require('../middleware/roleCheck');
const upload = require('../middleware/multerUpload');

router.post('/', [auth, upload.single('receipt')], ticketController.createTicket);
router.get('/my', auth, ticketController.getUserTickets);

router.get('/all', [auth, isManager], ticketController.getAllTickets);
router.post('/process', [auth, isManager], ticketController.processTicket);

module.exports = router;