const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL verilənlər bazası bağlantısı üçün Pool yaradılır
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false } // İstehsalat (Production) mühitində SSL təhlükəsizliyi üçün
});

pool.on('connect', () => {
  console.log('PostgreSQL verilənlər bazasına uğurla qoşuldu!');
});

pool.on('error', (err) => {
  console.error('Verilənlər bazası bağlantısında gözlənilməz xəta:', err);
  process.exit(-1);
});

// Server başlayanda cədvəllər yoxdursa avtomatik yaradılır
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      plan VARCHAR(20) DEFAULT 'pulsuz',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL,
      device_fingerprint VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45),
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Verilənlər bazası sxemi yoxlanıldı/quruldu.');
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema
};
