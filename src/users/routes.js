const express = require('express');
const authMiddleware = require('../../middlewares/auth');

const controller = require('./controller/index');
const validateSchemas = require('../../middlewares/validateSchemas');
const schemas = require('./utils/schemasValidation');

const router = express.Router();

// Public routes (no authentication required)
router.post(
  '/api/v1/signup',
  validateSchemas.inputs(schemas.signUp, 'body'),
  (_, res) => {
    controller.signUp(res, _.body);
  }
);

router.post(
  '/api/v1/signin',
  validateSchemas.inputs(schemas.signIn, 'body'),
  (_, res) => {
    controller.signIn(res, _.body);
  }
);

// Protected routes (authentication required)
router.get('/api/v1/profile', authMiddleware, (req, res) => {
  res.status(200).json({
    status: 200,
    user: req.user,
  });
});

module.exports = router;
