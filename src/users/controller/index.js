const Bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../../../config');
const { User } = require('../models/mysql');

const tokenService = require('../utils/tokenService');

module.exports.signUp = async (res, parameters) => {
  const {
    password,
    passwordConfirmation,
    email,
    username,
    name,
    lastName,
  } = parameters;

  if (password !== passwordConfirmation) {
    return res.status(400).json({
      status: 400,
      message: 'Passwords are different, try again!!!',
    });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 400,
        message: 'Email already exists!!!',
      });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        status: 400,
        message: 'Username already exists!!!',
      });
    }

    const hashedPassword = Bcrypt.hashSync(password, 10);
    const userId = await User.create({
      username,
      name,
      lastName,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { email, id: userId, username },
      config.API_KEY_JWT,
      { expiresIn: config.TOKEN_EXPIRES_IN }
    );

    // Create and set refresh token (httpOnly cookie)
    const refreshToken = await tokenService.createRefreshToken(userId);
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.status(201).json({ token });
  } catch (error) {
    console.error('Sign up error:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};

module.exports.signIn = async (res, parameters) => {
  const { email, password } = parameters;

  try {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordValid = Bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, id: user.id, username: user.username },
      config.API_KEY_JWT,
      { expiresIn: config.TOKEN_EXPIRES_IN }
    );

    // Create and set refresh token (httpOnly cookie)
    const refreshToken = await tokenService.createRefreshToken(user.id);
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};

// Helper to parse cookies (simple, avoids cookie-parser dependency)
const parseCookies = (req) => {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, item) => {
    const [key, val] = item.split('=');
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent((val || '').trim());
    return acc;
  }, {});
};

module.exports.refreshToken = async (req, res) => {
  try {
    const cookieToken = parseCookies(req)[config.REFRESH_TOKEN_COOKIE_NAME];
    const rawToken = cookieToken || req.body.refreshToken;

    if (!rawToken) {
      return res.status(401).json({ status: 401, message: 'No refresh token provided.' });
    }

    // Validate refresh token record
    const tokenRecord = await tokenService.findByHash(rawToken);
    if (!tokenRecord || tokenRecord.revoked) {
      return res.status(401).json({ status: 401, message: 'Invalid refresh token.' });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(401).json({ status: 401, message: 'Refresh token expired.' });
    }

    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      return res.status(401).json({ status: 401, message: 'User not found.' });
    }

    // Rotate refresh token: create new one and revoke old
    const newRefresh = await tokenService.rotate(rawToken);

    // Issue new access token
    const accessToken = jwt.sign(
      { email: user.email, id: user.id, username: user.username },
      config.API_KEY_JWT,
      { expiresIn: config.TOKEN_EXPIRES_IN }
    );

    // Set new refresh token cookie
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.status(200).json({ token: accessToken, user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
    }});
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

module.exports.logout = async (req, res) => {
  try {
    // If user is authenticated, revoke all user's refresh tokens
    if (req.user && req.user.id) {
      await tokenService.revokeAllForUser(req.user.id);
      res.clearCookie(config.REFRESH_TOKEN_COOKIE_NAME);
      return res.status(200).json({ status: 200, message: 'Logged out.' });
    }

    // Otherwise try revoke by provided cookie/body token
    const cookieToken = parseCookies(req)[config.REFRESH_TOKEN_COOKIE_NAME];
    const rawToken = cookieToken || req.body.refreshToken;
    if (rawToken) {
      await tokenService.revoke(rawToken);
      res.clearCookie(config.REFRESH_TOKEN_COOKIE_NAME);
    }

    return res.status(200).json({ status: 200, message: 'Logged out.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
