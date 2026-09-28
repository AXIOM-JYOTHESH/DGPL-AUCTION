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

// CORS: allow production domains, Vercel preview, and localhost
const productionOrigins = [
  'https://dgpl-auction.tech',
  'https://www.dgpl-auction.tech',
];
const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://192.168.137.1:5173',
];
const allowedOrigins = productionOrigins.concat(devOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (no origin) and all allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS')); // will be handled by global error handler
    },
    credentials: true,
  })
); // this will accept requests from cross orgins ..
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
