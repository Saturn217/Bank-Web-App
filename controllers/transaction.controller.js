const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


const getUserTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const userAccountNumber = req.user.accountNumber;

        if (!userId || !userAccountNumber) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication information missing'
            });
        }

        const {
            type,
            page = 1,
            limit = 10,
            sort = "desc"
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = sort === "asc" ? 1 : -1;

        const query = {
            $or: [

                { user: userId },
                // Incoming transfers
                {
                    type: "transfer",
                    receiverAccount: userAccountNumber
                }
            ]
        };

        if (type) {
            const allowedTypes = [
                'deposit', 'withdrawal', 'transfer',
                'savings_deposit', 'savings_interest', 'savings_withdrawal', `bill_payment`
            ];
            const requestedTypes = type.toLowerCase().split(',').map(t => t.trim());

            // Validate requested types
            if (!requestedTypes.every(t => allowedTypes.includes(t))) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid type filter. Allowed: deposit, withdrawal, transfer, savings_deposit, savings_interest, savings_withdrawal'
                });
            }

            query.type = { $in: requestedTypes };
        }


        const transactions = await TransactionModel
            .find(query)
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // ── Early exit if nothing found ──────────────────────────────────
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

        const totalCount = await TransactionModel.countDocuments(query);

        // ── Enrich transfers with sender/receiver names ──────────────────
        const accountNumbers = new Set();
        transactions
            .filter(tx => tx.type === "transfer")
            .forEach(tx => {
                if (tx.senderAccount) accountNumbers.add(tx.senderAccount);
                if (tx.receiverAccount) accountNumbers.add(tx.receiverAccount);
            });

        let userMap = {};
        if (accountNumbers.size > 0) {
            const involvedUsers = await BankUserModel
                .find({ accountNumber: { $in: [...accountNumbers] } })
                .select("fullName accountNumber")
                .lean();
            involvedUsers.forEach(u => { userMap[u.accountNumber] = u.fullName; });
        }

        const enriched = transactions.map(tx => {
            if (tx.type !== "transfer") return tx;
            return {
                ...tx,
                senderName: userMap[tx.senderAccount] || tx.senderName || null,
                receiverName: userMap[tx.receiverAccount] || tx.receiverName || null,
            };
        });

        return res.status(200).json({
            status: 'success',
            message: "Transactions retrieved successfully",
            data: enriched,
            meta: {
                count: totalCount,        // ← was transactions.length (wrong — only current page)
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum),
            }
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

