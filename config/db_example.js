// config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'server_hosting',
    user: process.env.DB_USER || 'user_database',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'nama_databse',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;