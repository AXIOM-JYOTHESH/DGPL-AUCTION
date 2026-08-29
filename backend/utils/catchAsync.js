// catchAsync.js
// Utility to catch errors in async route handlers and pass them to next()

module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
