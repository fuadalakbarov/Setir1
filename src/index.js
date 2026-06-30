const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.static(PUBLIC_DIR));

// Health check endpoint (for uptime monitors)
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'setir_az_gizli_acari',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://setir1.onrender.com/api/auth/google/callback"
}, (accessToken, refreshToken, profile, cb) => {
    console.log('Google profil alındı:', profile.displayName);
    return cb(null, profile);
}));

passport.serializeUser((user, done) => {
    console.log('serializeUser çağırıldı');
    done(null, user);
});
passport.deserializeUser((user, done) => {
    console.log('deserializeUser çağırıldı');
    done(null, user);
});

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/app', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'app.html')));



// API Routes
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

const db = require('./config/db');

db.initSchema()
  .catch(err => console.error('Sxem qurma xətası:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log('Server işləyir: http://localhost:' + PORT);

      // Self-ping hər 14 dəqiqədə bir — Render free tier yuxuya getməsin
      const https = require('https');
      const http = require('http');
      const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT;

      setInterval(() => {
        const url = SELF_URL + '/health';
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
          console.log('Self-ping OK:', res.statusCode);
        }).on('error', (err) => {
          console.log('Self-ping xəta:', err.message);
        });
      }, 14 * 60 * 1000); // 14 dəqiqə
    });
  });
