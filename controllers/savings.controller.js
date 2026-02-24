const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require("mongoose")



const depositToSavings = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, note = "" } = req.body;
        const depositAmount = parseFloat(amount);

        if (isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).send({ message: "Invalid savings deposit amount" });
        }

        if (depositAmount < 100) {
            return res.status(400).send({ message: "Minimum savings deposit is ₦100" });
        }


        const user = await BankUserModel.findById(req.user._id).session(session);
        if (!user) {
            return res.status(404).send({ message: "Your account not found" });
        }


        if (user.balance < depositAmount) {
            return res.status(400).send({ message: "Insufficient balance in main account" });
        }


        user.balance -= depositAmount;
        user.savingsBalance += depositAmount;

        await user.save({ session });


        const [newTransaction] = await transactionModel.create([{
            user: user._id,
            accountNumber: user.accountNumber,
            type: "savings_deposit",
            amount: depositAmount,
            balanceAfter: user.balance,
            savingsBalanceAfter: user.savingsBalance,
            senderAccount: user.accountNumber,
            receiverAccount: user.accountNumber,
            description: `Savings deposit of ₦${depositAmount.toLocaleString()}`,
            note,
            status: "success"
        }], { session });

        await session.commitTransaction();


        return res.status(200).json({
            message: "Successfully deposited to savings",
            data: {
                mainBalance: user.balance,
                savingsBalance: user.savingsBalance,
                transaction: {
                    id: newTransaction._id,
                    type: newTransaction.type,
                    amount: newTransaction.amount,
                    description: newTransaction.description,
                    createdAt: newTransaction.createdAt,
                    ...(newTransaction.note?.trim() && { note: newTransaction.note })
                }
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Savings deposit error:", err);
        return res.status(500).send({
            message: "Failed to deposit to savings",
            error: err.message
        });
    } finally {
        session.endSession();
    }
};

const withdrawFromSavings = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, note = "" } = req.body;
        const withdrawAmount = parseFloat(amount);

      
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return res.status(400).send({ message: "Invalid withdrawal amount" });
        }

        if (withdrawAmount < 100) {
            return res.status(400).send({ message: "Minimum savings withdrawal is ₦100" });
        }

 
        const user = await BankUserModel.findById(req.user._id).session(session);
        if (!user) {
            return res.status(404).send({ message: "Your account not found" });
        }

     
        if (user.savingsBalance < withdrawAmount) {
            return res.status(400).send({ message: "Insufficient savings balance" });
        }

       
        user.savingsBalance -= withdrawAmount;
        user.balance += withdrawAmount;

        await user.save({ session });

        const [newTransaction] = await transactionModel.create([{
            user: user._id,
            accountNumber: user.accountNumber,
            type: "savings_withdrawal",
            amount: withdrawAmount,
            balanceAfter: user.balance,
            savingsBalanceAfter: user.savingsBalance,
            senderAccount: user.accountNumber,
            receiverAccount: user.accountNumber,
            description: `Withdrew ${withdrawAmount.toLocaleString()} from savings to main balance`,
            note,
            status: "success"
        }], { session });

        await session.commitTransaction();

        return res.status(200).json({
            message: "Successfully withdrawn from savings",
            data: {
                mainBalance: user.balance,
                savingsBalance: user.savingsBalance,
                transaction: {
                    id: newTransaction._id,
                    type: newTransaction.type,
                    amount: newTransaction.amount,
                    description: newTransaction.description,
                    createdAt: newTransaction.createdAt,
                    ...(newTransaction.note?.trim() && { note: newTransaction.note })
                }
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Savings withdrawal error:", err);
        return res.status(500).json({
            message: "Failed to withdraw from savings",
            error: err.message || "Internal server error"
        });
    } finally {
        session.endSession();
    }
};


module.exports = {depositToSavings, withdrawFromSavings}

