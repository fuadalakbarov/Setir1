const express = require('express');
const passport = require('passport');
const router = express.Router();
const { googleAuthCallback, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=1' }),
  googleAuthCallback
);

router.get('/me', authMiddleware, getMe);

module.exports = router;