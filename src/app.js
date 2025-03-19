require('dotenv').config();
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const logger = require('./config/logger');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const port = process.env.PORT || 5000;

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

app.use(loggerMiddleware);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.send('Reimbursement System API is running...');
});

app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;