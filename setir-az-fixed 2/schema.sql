-- 1. İstifadəçilər cədvəli (İstifadəçi məlumatları və paket tipləri)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(20) DEFAULT 'pulsuz', -- 'pulsuz', 'fərdi', 'biznes'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Aktiv Sessiyaların və Cihazların İzlənməsi (Hesab paylaşımının qarşısını almaq üçün)
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);