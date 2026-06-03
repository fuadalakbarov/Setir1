const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const deviceFingerprint = req.headers['x-device-fingerprint'];

  if (!token) {
    return res.status(401).json({ error: 'Giriş rədd edildi. Token tapılmadı.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const sessionRes = await db.query(
      'SELECT * FROM active_sessions WHERE user_id = $1 AND token = $2',
      [req.user.id, token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: 'Sessiyanız sonlandırılıb və ya başqa cihazdan giriş edilib.' });
    }

    // google_device sessiyaları üçün fingerprint yoxlamasını keç
    const storedFp = sessionRes.rows[0].device_fingerprint;
    if (req.user.plan !== 'biznes' && deviceFingerprint && storedFp !== 'google_device' && storedFp !== deviceFingerprint) {
      return res.status(401).json({ error: 'Bu hesab eyni anda yalnız bir cihazda aktiv ola bilər.' });
    }
    // Google sessiyasının fingerprint-ini ilk real çağırışda yenilə
    if (storedFp === 'google_device' && deviceFingerprint) {
      await db.query('UPDATE active_sessions SET device_fingerprint = $1 WHERE token = $2', [deviceFingerprint, token]);
    }

    await db.query(
      'UPDATE active_sessions SET last_active = NOW() WHERE token = $1',
      [token]
    );

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Keçərsiz və ya vaxtı bitmiş token.' });
  }
};

// Funksiyanı birbaşa ixrac edirik
module.exports = authMiddleware;
