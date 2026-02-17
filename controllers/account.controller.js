// 
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


const deposit = async (req, res) => {

    try {


        const { accountNumber, amount } = req.body;
        const NumericalAmount = parseFloat(req.body.amount);
        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            return res.status(400).send({
                message: "Invalid deposit amount"
            })
        }
        if (NumericalAmount < 100) {
            return res.status(400).send({
                message: "Minimum deposit amount is 100"
            })
        }
        const depositUser = await BankUserModel.findOne({ accountNumber });

        if (!depositUser) {
            return res.status(404).send({
                message: "No user found"
            })
        }

        depositUser.balance += NumericalAmount;

        await depositUser.save();


        await transactionModel.create({
            user: depositUser._id,
            accountNumber: depositUser.accountNumber,
            type: "deposit",
            amount: NumericalAmount,
            balanceAfter: depositUser.balance,
            senderAccount: depositUser.accountNumber,
            receiverAccount: depositUser.accountNumber,
            description: `Deposit of ${NumericalAmount} to account ${depositUser.accountNumber}`,
            note: req.body.note || ""

        })

        return res.status(200).send({
            message: "Deposit successful",
            data: depositUser
        })


    }

    catch (err) {
        console.log("Error making deposit", err);
        return res.status(500).send({
            message: "Deposit failed",
            error: err.message
        })
    }
}


const withdrawal = async (req, res) => {
    try {
        const { accountNumber, amount } = req.body;
        const NumericalAmount = parseFloat(amount);

        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            return res.status(422).send({
                message: "Invalid withdrawal amount"
            });
        }

        if (NumericalAmount < 1000) {
            return res.status(422).send({
                message: "Minimum withdrawal amount is 1000"
            });
        }


        const withdrawalUser = await BankUserModel.findOne({ accountNumber });
        if (!withdrawalUser) {
            return res.status(404).send({
                message: "No user found"
            })
        }

        if (withdrawalUser.balance < NumericalAmount) {
            return res.status(409).send({
                message: "Insufficient balance"
            })
        }

        withdrawalUser.balance -= NumericalAmount;
        await withdrawalUser.save();


        await transactionModel.create({
            user: withdrawalUser._id,
            accountNumber: withdrawalUser.accountNumber,
            type: "withdrawal",
            amount: NumericalAmount,
            balanceAfter: withdrawalUser.balance,
            senderAccount: withdrawalUser.accountNumber,
            receiverAccount: withdrawalUser.accountNumber,
            description: `Withdrawal of ${NumericalAmount} from account ${withdrawalUser.accountNumber}`,
            note: req.body.note || ""

        })


        return res.status(200).send({
            message: "Withdrawal successful",
            data: withdrawalUser, Transaction: {
                type: "withdrawal",
                amount: NumericalAmount,
                senderAccount: withdrawalUser.accountNumber,
                receiverAccount: withdrawalUser.accountNumber,
                description: `Withdrawal of ${NumericalAmount} from account ${withdrawalUser.accountNumber}`,
                note: req.body.note || ""
            }
        })

    }

    catch (error) {
        console.log("Error making withdrawal", error);
        return res.status(500).send({
            message: "Withdrawal failed",
            error: error.message
        })

    }
}


const Transfer = async (req, res) => {

    try {
        const { senderAccount, receiverAccount, amount } = req.body;
        const NumericalAmount = parseFloat(amount);


        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            return res.status(422).send({
                message: "Invalid transfer amount"
            });
        }

        if (NumericalAmount < 1000) {
            return res.status(422).send({
                message: "Minimum transfer amount is 1000"
            });
        }

        if (senderAccount === receiverAccount) {
            return res.status(422).send({
                message: "Sender and receiver accounts cannot be the same"
            });
        }

        if (!senderAccount || !receiverAccount) {
            return res.status(422).send({
                message: "Both sender and receiver account numbers are required"
            });
        }

        const senderUser = await BankUserModel.findOne({ accountNumber: senderAccount });
        const receiverUser = await BankUserModel.findOne({ accountNumber: receiverAccount });

        if (!senderUser) {
            return res.status(404).send({
                message: "Sender account not found"
            })
        }

        if (!receiverUser) {
            return res.status(404).send({
                message: "Receiver account not found"
            })
        }

        if (senderUser.balance < NumericalAmount) {
            return res.status(409).send({
                message: "Insufficient balance in sender's account"
            })
        }

        senderUser.balance -= NumericalAmount;
        receiverUser.balance += NumericalAmount;

        await senderUser.save();
        await receiverUser.save();

        await transactionModel.create({
            user: senderUser._id,
            accountNumber: senderUser.accountNumber,
            type: "transfer",
            amount: NumericalAmount,
            balanceAfter: senderUser.balance,
            senderAccount: senderUser.accountNumber,
            receiverAccount: receiverUser.accountNumber,
            description: `Transfer of ${NumericalAmount} from ${senderUser.fullName},(${senderUser.accountNumber} ) to ${receiverUser.fullName},(${receiverUser.accountNumber})`,
            note: req.body.note || ""
        })

        return res.status(200).send({
            message: "Transfer successful",
            data: {
                sender: senderUser,
                receiver: receiverUser,
                amount: NumericalAmount,
                description: `Transfer of ${NumericalAmount} from ${senderUser.fullName},(${senderUser.accountNumber} ) to ${receiverUser.fullName},(${receiverUser.accountNumber})`,
                note: req.body.note || ""
            }
        })
    }

    catch (error) {
        console.log("Error making transfer", error);
        return res.status(500).send({
            message: "Transfer failed",
            error: error.message
        })
    }
}

module.exports = { deposit, withdrawal, Transfer }