const Bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../../../config');
const { User } = require('../models/mysql');

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

    return res.status(201).json({ token });
  } catch (error) {
    console.error('Sign up error:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};
