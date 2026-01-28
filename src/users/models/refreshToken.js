const { pool } = require('../../../services/mysql');

const RefreshToken = {
  create: async ({ userId, tokenHash, expiresAt }) => {
    const [result] = await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  },

  findByHash: async (tokenHash) => {
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0',
      [tokenHash]
    );
    return rows[0] || null;
  },

  revokeById: async (id) => {
    const [result] = await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  revokeAllForUser: async (userId) => {
    const [result] = await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  },
};

module.exports = {
  RefreshToken,
};
