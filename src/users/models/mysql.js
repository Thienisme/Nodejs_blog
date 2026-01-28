const { pool } = require('../../../services/mysql');

const User = {
  create: async (userData) => {
    const { username, name, lastName, email, password } = userData;
    const [result] = await pool.execute(
      'INSERT INTO users (username, name, lastName, email, password) VALUES (?, ?, ?, ?, ?)',
      [username, name, lastName, email, password]
    );
    return result.insertId;
  },

  findByEmail: async (email) => {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  findByUsername: async (username) => {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  },

  findById: async (id) => {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  findAll: async () => {
    const [rows] = await pool.execute(
      'SELECT id, username, name, lastName, email, created_at FROM users'
    );
    return rows;
  },

  update: async (id, userData) => {
    const { username, name, lastName, email } = userData;
    const [result] = await pool.execute(
      'UPDATE users SET username = ?, name = ?, lastName = ?, email = ? WHERE id = ?',
      [username, name, lastName, email, id]
    );
    return result.affectedRows > 0;
  },

  delete: async (id) => {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = {
  User,
};
