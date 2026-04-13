const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: 'localhost',
  database: 'dietary_brghgmc',
  password: process.env.DB_PASSWORD || '12345',
  port: 5432,
});

module.exports = pool;