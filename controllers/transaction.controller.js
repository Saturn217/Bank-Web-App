const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


const getUserTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const userAccountNumber = req.user.accountNumber;

        if (!userId || !userAccountNumber) {
            return res.status(401).send({
                status: 'error',
                message: 'Authentication information missing'
            });
        }

       
        const {
            type,
            page = 1,
            limit = 50,
            sort = "desc"
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = sort === "asc" ? 1 : -1;

     
        const query = {
            $or: [
                
                { user: userId },
                {
                    type: "transfer",
                    receiverAccount: userAccountNumber
                }
            ]
        };

      
        if (type) {
            if (['deposit', 'withdrawal', 'transfer'].includes(type.toLowerCase())) {
                query.type = type.toLowerCase();
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid type filter. Use: deposit, withdrawal, transfer'
                });
            }
        }

       
        const transactions = await transactionModel
            .find(query)
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();  

        console.log("Found count          :", transactions.length);

        if (transactions.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: "No transactions found",
                count: 0,
                page: pageNum,
                limit: limitNum,
                data: []
            });
        }

        return res.status(200).send({
            status: 'success',
            message: "Transactions retrieved successfully",
            count: transactions.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(await transactionModel.countDocuments(query) / limitNum),
            data: transactions
        });

    } catch (err) {
        console.error("Error fetching transactions:", err);
        return res.status(500).json({
            status: 'error',
            message: "Failed to retrieve transactions",
            error: err.message
        });
    }
};


module.exports = { getUserTransactions }

