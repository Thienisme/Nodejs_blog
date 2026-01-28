const app = require('./app');
const config = require('./config');
const { initDatabase } = require('./services/mysql');

// Initialize MySQL database
initDatabase();

const PORT = process.env.PORT || config.port;

const server = app.listen(PORT, () => {
  console.log('server is running on port', server.address().port);
});
