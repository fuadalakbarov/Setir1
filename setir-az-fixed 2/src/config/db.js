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

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};