// server.js - Main Express Entry Point with MVC routing
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { BoothController } from './controllers/BoothController.js';
import { ScanController } from './controllers/ScanController.js';
import { LeaderboardController } from './controllers/LeaderboardController.js';
import { AdminController } from './controllers/AdminController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'public', 'IMG');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `booth-banner${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable trust proxy for Cloud Run and HTTPS load balancers
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Session setup supporting both local HTTP (localhost) and cross-origin HTTPS iframes
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devfest-bacolod-2026-secret',
    resave: true,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: 'auto',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Dynamically upgrade cookie attributes to SameSite=None + Secure when behind HTTPS (iframes / Cloud Run)
app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (req.session && req.session.cookie) {
    if (isHttps) {
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'none';
    } else {
      req.session.cookie.secure = false;
      req.session.cookie.sameSite = 'lax';
    }
  }
  next();
});

// Helper to extract clean session ID
function sanitizeSid(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();
  if (clean.startsWith('s:')) clean = clean.slice(2);
  const dotIdx = clean.indexOf('.');
  if (dotIdx !== -1) clean = clean.substring(0, dotIdx);
  return clean;
}

// Fallback session recovery for iframes when third-party cookies are partitioned or restricted
app.use((req, res, next) => {
  // Never auto-recover sessions on logout or when viewing LoginBooth with a logout message
  if (req.path === '/logout.php' || req.path === '/logout' || req.path === '/LogOutBooth.php' || req.path === '/logoutbooth' || (req.path === '/LoginBooth.php' && (req.query.message || req.query.logged_out))) {
    return next();
  }


  let sid = sanitizeSid(req.query.sid || req.body?.sid || req.headers['x-session-id'] || req.cookies?.devfest_sid);

  if (!sid && req.cookies && req.cookies['connect.sid']) {
    sid = sanitizeSid(req.cookies['connect.sid']);
  }

  if (sid && (!req.session || !req.session.isLoggedIn)) {
    req.sessionStore.get(sid, (err, sessData) => {
      if (!err && sessData && sessData.isLoggedIn) {
        Object.assign(req.session, sessData);
        req.sessionID = sid;
        // Override save() because express-session's internal this.id is read-only on cookie-less iframe requests
        req.session.save = function (cb) {
          req.sessionStore.set(sid, req.session, cb || (() => {}));
          return req.session;
        };
      }
      next();
    });
  } else {
    next();
  }
});

// Append Secure, SameSite=None, and Partitioned attributes to Set-Cookie headers only on HTTPS requests
app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps) {
    return next();
  }

  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (typeof name === 'string' && name.toLowerCase() === 'set-cookie') {
      const patchCookie = (c) => {
        if (typeof c !== 'string') return c;
        let mod = c;
        if (!mod.toLowerCase().includes('secure')) {
          mod += '; Secure';
        }
        if (mod.toLowerCase().includes('samesite=')) {
          mod = mod.replace(/samesite=[a-z]+/i, 'SameSite=None');
        } else {
          mod += '; SameSite=None';
        }
        if (!mod.toLowerCase().includes('partitioned')) {
          mod += '; Partitioned';
        }
        return mod;
      };

      if (Array.isArray(value)) {
        value = value.map(patchCookie);
      } else {
        value = patchCookie(value);
      }
    }
    return originalSetHeader.apply(this, arguments);
  };
  next();
});

// Prevent browser caching so navigation strictly re-validates session
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'public')));

// --- Routes (MVC) ---

// Root redirects to LoginBooth.php
app.get('/', (req, res) => res.redirect('/LoginBooth.php'));
app.get('/login', (req, res) => res.redirect('/LoginBooth.php'));

// Booth Portal (Controller: BoothController)
app.get('/LoginBooth.php', BoothController.showLogin);
app.post('/LoginBooth.php', BoothController.processLogin);

// Event / Track Selection (Controller: BoothController)
app.get('/EventChoices.php', BoothController.showChoices);
app.post('/EventChoices.php', (req, res, next) => {
  if (req.body.username) {
    return BoothController.processLogin(req, res, next);
  }
  return BoothController.selectTrack(req, res, next);
});
app.get('/choices', (req, res) => res.redirect('/EventChoices.php'));

// Scanner Terminal (Controller: BoothController)
app.get('/scanner.php', BoothController.showScanner);
app.post('/scanner.php', BoothController.selectTrack);
app.get('/scanner', (req, res) => res.redirect('/scanner.php'));

// Logout
app.get('/logout.php', BoothController.logout);
app.get('/logout', BoothController.logout);

// Session inspect API
app.get('/api/session', (req, res) => {
  res.json({
    isLoggedIn: !!req.session.isLoggedIn,
    username: req.session.username || null,
    role: req.session.role || null,
    booth_IDs: req.session.booth_IDs || null,
    event_id: req.session.event_id || null,
    track: req.session.selected_track || null
  });
});

// QR Scan API (Controller: ScanController)
app.post('/api/scan', ScanController.processScan);
app.get('/api/scans/feed', ScanController.getFeed);

// Leaderboard (Controller: LeaderboardController)
app.get('/Leaderboard.php', LeaderboardController.showLeaderboard);
app.get('/leaderboard', (req, res) => res.redirect('/Leaderboard.php'));
app.get('/api/leaderboard', LeaderboardController.getLeaderboardApi);

// SuperAdmin Terminal (Controller: AdminController)
app.get('/SuperAdmin.php', AdminController.showAdmin);
app.post('/SuperAdmin.php', AdminController.processLogin);
app.get('/superadmin', (req, res) => res.redirect('/SuperAdmin.php'));

// Dashboard (Controller: BoothController)
app.get('/Dashboard.php', BoothController.showDashboard);
app.get('/dashboard', (req, res) => res.redirect('/Dashboard.php'));

// Station Profile (Controller: BoothController)
app.get('/StationProfile.php', BoothController.showStationProfile);
app.post('/StationProfile.php', upload.single('dashboard_bg'), BoothController.updateStationProfileBg);
app.get('/stationprofile', (req, res) => res.redirect('/StationProfile.php'));

// Admin Leaderboard (Controller: LeaderboardController)
app.get('/AdminLeaderboard.php', LeaderboardController.showAdminLeaderboard);
app.get('/adminleaderboard', (req, res) => res.redirect('/AdminLeaderboard.php'));

// Logout aliases matching uploaded files
app.get('/LogOutBooth.php', BoothController.logout);
app.get('/logoutbooth', BoothController.logout);

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[DevFest Bacolod 2026] Server running on http://${HOST}:${PORT}`);
});

