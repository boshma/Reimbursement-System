require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const port = process.env.PORT || 5000;

app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.send('Reimbursement System API is running...');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = app;