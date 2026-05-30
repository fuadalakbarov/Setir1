const db = require('../config/db');

// Admin üçün qeydiyyatdan keçmiş bütün istifadəçilərin siyahısını gətirir
exports.getAllUsers = async (req, res) => {
  const adminUser = req.user; // auth middleware-dən gələn istifadəçi

  // Təhlükəsizlik yoxlanışı: Yalnız e-poçtu xüsusi olan şəxs admin panelə baxa bilsin
  // Bura öz e-poçt ünvanını yaza bilərsən
  if (adminUser.email !== 'admin@setir.az' && !adminUser.email.includes('fuad')) {
    return res.status(403).json({ error: 'Giriş qadağandır! Bu bölmə yalnız sistem idarəçiləri üçündür.' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, email, plan, created_at FROM users ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İstifadəçilər gətirilərkən daxili xəta baş verdi.' });
  }
};