const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Google ilə giriş/qeydiyyat tamamlandıqdan sonra işə düşən funksiya
const googleAuthCallback = async (req, res) => {
  try {
    // Passport.js uğurlu girişdən sonra istifadəçi məlumatlarını req.user-ə qoyur
    const googleUser = req.user; 
    
    const email = googleUser.emails[0].value;
    const name = googleUser.displayName;

    // 1. Verilənlər bazasında bu e-poçt ünvanının olub-olmadığını yoxlayırıq
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userRes.rows[0];

    // 2. Əgər istifadəçi ilk dəfə gəlirsə, onu avtomatik qeydiyyat edirik
    if (!user) {
      const insertRes = await db.query(
        'INSERT INTO users (name, email, password_hash, plan) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, 'google_authenticated', 'pulsuz'] // Google ilə gələnlərin şifrəsinə sabit dəyər qoyuruq
      );
      user = insertRes.rows[0];
    }

    // 3. İstifadəçi üçün JWT Token yaradırıq (7 günlük)
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Hesab paylaşımını yoxlamaq üçün sessiyanı qeydə alırıq
    if (user.plan !== 'biznes') {
      await db.query('DELETE FROM active_sessions WHERE user_id = $1', [user.id]);
    }
    
    await db.query(
      'INSERT INTO active_sessions (user_id, token, device_fingerprint, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, token, 'google_device', req.ip]
    );

    // 5. Tokeni brauzerə ötürmək üçün frontend-ə yönləndiririk və tokeni URL-də ötürürük
    // Frontend (app.html) bu tokeni götürüb localStorage-ə yazacaq
    res.redirect(`/app?token=${token}`);

  } catch (err) {
    console.error('Google Auth Xətası:', err);
    res.redirect('/login?error=database_error');
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = {
  googleAuthCallback,
  getMe
};