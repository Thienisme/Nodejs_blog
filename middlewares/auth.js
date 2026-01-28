const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../src/users/models/mysql');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. No token provided.',
      });
    }

    // Check if token format is "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. Invalid token format.',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.API_KEY_JWT);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. User not found.',
      });
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. Token expired.',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};

module.exports = authMiddleware;
