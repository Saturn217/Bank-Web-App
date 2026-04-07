
const rateLimit = require("express-rate-limit");



// General limiter — for all routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per 15 mins
    standardHeaders: true,     // sends limit info in response headers
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        status: 429,
        message: "Too many requests, please try again later"
    }
});

// Auth limiter — for login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // only 10 attempts per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        status: 429,
        message: "Too many login attempts, please try again after 15 minutes"
    }
});

// Transaction limiter — for transfer, deposit, withdrawal
const transactionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // only 10 transactions per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        status: 429,
        message: "Too many transaction attempts, please try again after 15 minutes"
    }
});

module.exports = { apiLimiter, authLimiter, transactionLimiter };
