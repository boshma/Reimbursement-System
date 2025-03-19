const logger = require('../config/logger');
const morgan = require('morgan');

morgan.token('body', (req) => {
  const body = { ...req.body };
  if (body.password) body.password = '[REDACTED]';
  
  return JSON.stringify(body);
});

const stream = {
  write: (message) => logger.http(message.trim()),
};

const skip = (req, res) => {
  const env = process.env.NODE_ENV || 'development';
  return env !== 'development' && res.statusCode < 400;
};

const loggerMiddleware = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms :body',
  { stream, skip }
);

module.exports = loggerMiddleware;