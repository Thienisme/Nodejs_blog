const crypto = require('crypto');
const { RefreshToken } = require('../models/refreshToken');
const config = require('../../../config');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports.createRefreshToken = async (userId) => {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, tokenHash, expiresAt });
  return token;
};

module.exports.findByHash = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  return RefreshToken.findByHash(tokenHash);
};

module.exports.rotate = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findByHash(tokenHash);
  if (!record) {
    throw new Error('Refresh token not found');
  }

  // Create new refresh token
  const newToken = crypto.randomBytes(64).toString('hex');
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId: record.user_id, tokenHash: newHash, expiresAt });

  // Revoke old token
  await RefreshToken.revokeById(record.id);

  return newToken;
};

module.exports.revoke = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findByHash(tokenHash);
  if (!record) return false;
  return RefreshToken.revokeById(record.id);
};

module.exports.revokeAllForUser = async (userId) => {
  return RefreshToken.revokeAllForUser(userId);
};
