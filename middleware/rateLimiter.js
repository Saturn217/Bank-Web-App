
import rateLimit from "express-rate-limit";



// General limiter — for all routes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per 15 mins
    standardHeaders: true,     // sends limit info in response headers
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many requests, please try again later"
    }
});

// Auth limiter — for login/register
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // only 10 attempts per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many login attempts, please try again after 15 minutes"
    }
});

// Transaction limiter — for transfer, deposit, withdrawal
export const transactionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // only 10 transactions per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many transaction attempts, please try again after 15 minutes"
    }
});

// PIN attempt limiter — for transaction PIN verification
export const pinLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,                    // only 5 wrong PIN attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many incorrect PIN attempts, account temporarily blocked for 10 minutes"
    }
});