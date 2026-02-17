const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')



const getTransactions  = async (req, res) => {

    try {
        const { accountNumber } = req.params;
        const userTransactions = await transactionModel.find({ accountNumber }).sort({ createdAt: -1 });

        if (userTransactions.length === 0) {            
            return res.status(404).send({
                message: "No transactions found for this account"
            })
        }
        return res.status(200).send({
            message: "Transactions retrieved successfully",
            data: userTransactions
        })
    }

    catch (err) {
        console.log("Error retrieving transactions", err);
        return res.status(500).send({
            message: "Error retrieving transactions",
            error: err.message
        })
    }       
}



// const getTransactions = async (req, res) => {
//     try { 
//         const accountNumber = req.user.accountNumber;
//         const { type, page = 1, limit = 50, sort = "desc" } = req.query;

//         const skip = (page - 1) * limit;
//         const sortOrder = sort === "asc" ? 1 : -1;

//         const query = { accountNumber };
//         if (type) query.type = type;

//         const transactions = await TransactionModel.find(query)
//             .sort({ createdAt: sortOrder })
//             .skip(skip)
//             .limit(Number(limit))
          

//         if (transactions.length === 0) {
//             return res.status(404).json({
//                 message: "No transactions found"
//             });
//         }

//         return res.status(200).json({
//             message: "Transactions retrieved successfully",
//             count: transactions.length,
//             data: transactions
//         });

//     } catch (err) {
//         console.log("Error retrieving transactions", err);
//         return res.status(500).json({
//             message: "Error retrieving transactions",
//             error: err.message
//         });
//     }
// }


module.exports = {getTransactions}

