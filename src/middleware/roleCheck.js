const { USER_ROLES } = require('../utils/constants');

exports.isManager = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.MANAGER) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Manager role required.' });
};