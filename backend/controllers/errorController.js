const handleDevError = (err, res) => {
  // For auth errors, return a minimal response (no stack) but keep the actual message
  if (err.statusCode === 401) {
    return res.status(401).json({ status: 'fail', message: err.message });
  }
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const handleProdError = (err, res) => {
  // For auth errors, keep the actual message (e.g., invalid credentials)
  if (err.statusCode === 401) {
    return res.status(401).json({ status: 'fail', message: err.message });
  }
  if (!err.isOperational) {
    console.log(' ERROR 💣 ', err);
    res.status(500).json({
      status: 'Error',
      message: 'Something went very wrong ',
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
};

const catchError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') handleDevError(err, res);
  else {
    handleProdError(err, res);
  }
};

module.exports = catchError;
