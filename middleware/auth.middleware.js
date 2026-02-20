const jwt = require("jsonwebtoken");
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require("../models/transaction.model");






const protect = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({
                status: 'error',
                message: 'No token provided or invalid format. Use: Bearer <token>'
            });
        }

        const token = authHeader.split(' ')[1];


        let decoded;
        try {

            decoded = jwt.verify(token, process.env.JWT_SECRET);
        }

        catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ status: 'error', message: 'Token has expired' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ status: 'error', message: 'Invalid token signature' });
            }
            return res.status(401).json({ status: 'error', message: 'Authentication failed' });
        }


        const user = await BankUserModel.findById(decoded.id).select('-password -__v -refreshToken');

        if (!user) {
            return res.status(401).send({ status: 'error', message: 'User no longer exists' });
        }


        req.user = user;
        next();

    }
    catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ status: 'error', message: 'Authentication error' });
    }
};




module.exports = { protect };