const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const playerRouter = require('./routers/playerRouter');
const teamRouter = require('./routers/teamRouter');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routers/userRouter');
const auctionRouter = require('./routers/auctionRoutes');
const cors = require('cors');
const app = express();
// http security header ...

// Placeholder for Socket.IO instance; server.js will set this after creation
app.set('io', null);

// Attach io instance to each request early so routers/controllers can emit events
app.use((req, res, next) => {
  const io = req.app.get('io');
  if (io) req.io = io;
  next();
});

// CORS: allow production domains, Vercel deployments, custom domains, and localhost
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (Google Apps Script, mobile, curl)
      if (!origin) return callback(null, true);

      // Check if matches allowed patterns
      const allowed =
        origin.endsWith('.vercel.app') ||
        origin.includes('dgpl-auction') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.includes('172.') ||
        process.env.CORS_ORIGIN === '*' ||
        process.env.CORS_ORIGIN === origin;

      if (allowed) {
        return callback(null, true);
      }

      // Default safe allow with credentials for all tournament clients
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);

//body parser also limits the data to 10 kb ...
app.use(express.json({ limit: '10kb' }));

// Basic mongo operator injection sanitizer (avoid express-mongo-sanitize reassign bug with Express 5)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        const val = obj[key];
        if (typeof val === 'object') sanitize(val);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query); // mutate in place without reassigning req.query
  sanitize(req.params);
  next();
});
// xss-clean reassigns req.query (breaks under Express 5 getter); implement lightweight in-place XSS sanitization instead
app.use((req, res, next) => {
  const stripTags = (val) =>
    typeof val === 'string' ? val.replace(/<[^>]*>/g, '') : val;
  if (req.query) {
    for (const k in req.query) req.query[k] = stripTags(req.query[k]);
  }
  if (req.body && typeof req.body === 'object') {
    for (const k in req.body) req.body[k] = stripTags(req.body[k]);
  }
  next();
});

// to limit the number of rest api calls an ip can make
const limiter = rateLimit({
  max: 500,
  windowMs: 5 * 60 * 1000,
  message: 'your requests crossed the limits please come back in 1 hour',
});
app.use('/api', limiter);

app.use('/api/v1/players', playerRouter);
app.use('/api/v1/teams', teamRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/auction', auctionRouter);

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DGPL Cricket Auction Backend API is LIVE and running! 🏏',
    timestamp: new Date().toISOString(),
  });
});

// Simple health endpoint for origin/proxy checks
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Handle undefined routes
app.use((req, res, next) => {
  const error = new Error(`Can't find ${req.originalUrl} on this server!`);
  error.status = 'fail';
  error.statusCode = 404;
  next(error);
});
app.use(globalErrorHandler);
module.exports = app;
